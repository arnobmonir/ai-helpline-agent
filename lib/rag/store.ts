import { resolve } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { buildAmberCorpus } from "@/lib/rag/corpus";
import {
  cosineSimilarity,
  embedOne,
  embedTexts,
  lexicalScore,
} from "@/lib/rag/embed";
import type { RagChunk, RagHit } from "@/lib/rag/types";

type Indexed = RagChunk & { vector?: number[] };

let indexed: Indexed[] = [];
let ready = false;
let mode: "vector" | "lexical" = "lexical";

const CACHE_PATH = resolve(process.cwd(), ".cache/rag-embeddings.json");

export function isRagReady(): boolean {
  return ready;
}

export function getRagMode(): "vector" | "lexical" {
  return mode;
}

const QUERY_CACHE_MAX = 64;
const queryVecCache = new Map<string, number[]>();

function rememberQueryVec(query: string, vec: number[]) {
  if (queryVecCache.has(query)) {
    queryVecCache.delete(query);
  }
  queryVecCache.set(query, vec);
  if (queryVecCache.size > QUERY_CACHE_MAX) {
    const first = queryVecCache.keys().next().value;
    if (first) queryVecCache.delete(first);
  }
}

export async function initRag(apiKey?: string): Promise<void> {
  const corpus = buildAmberCorpus();
  indexed = corpus.map((c) => ({ ...c }));

  const key = apiKey && apiKey !== "your_key_here" ? apiKey : "";
  if (!key) {
    mode = "lexical";
    ready = true;
    console.log(`[rag] ready (lexical only, ${indexed.length} chunks)`);
    return;
  }

  try {
    const cached = loadCache();
    if (cached && cached.length === corpus.length) {
      const byId = new Map(cached.map((c) => [c.id, c.vector]));
      let ok = true;
      for (const row of indexed) {
        const v = byId.get(row.id);
        if (!v?.length) {
          ok = false;
          break;
        }
        row.vector = v;
      }
      if (ok) {
        mode = "vector";
        ready = true;
        console.log(`[rag] ready from cache (${indexed.length} vectors)`);
        return;
      }
    }

    console.log(`[rag] embedding ${indexed.length} chunks…`);
    const vectors = await embedTexts(
      indexed.map((c) => `${c.title}\n${c.text}`),
      key,
    );
    for (let i = 0; i < indexed.length; i++) {
      indexed[i]!.vector = vectors[i];
    }
    saveCache(
      indexed.map((c) => ({
        id: c.id,
        vector: c.vector!,
      })),
    );
    mode = "vector";
    ready = true;
    console.log(`[rag] ready (vector, ${indexed.length} chunks)`);
  } catch (err) {
    console.warn("[rag] embedding failed, using lexical fallback:", err);
    mode = "lexical";
    ready = true;
  }
}

export async function searchKnowledge(
  query: string,
  options?: { topK?: number; apiKey?: string },
): Promise<RagHit[]> {
  if (!ready) {
    await initRag(options?.apiKey);
  }
  const topK = options?.topK ?? 3;
  const q = query.trim();
  if (!q) return [];

  const lexHits = lexicalSearch(q, topK);
  const bestLex = lexHits[0]?.score ?? 0;
  // Strong keyword match — skip embed RTT (payment, hours, packages, etc.)
  if (mode === "lexical" || bestLex >= 0.4) {
    return lexHits;
  }

  if (mode === "vector") {
    const key = options?.apiKey || process.env.GEMINI_API_KEY || "";
    let qVec: number[];
    try {
      qVec = queryVecCache.get(q) || (await embedOne(q, key));
      rememberQueryVec(q, qVec);
    } catch {
      return lexHits.length > 0 ? lexHits : lexicalSearch(q, topK);
    }
    const scored = indexed.map((c) => {
      const vecScore = c.vector ? cosineSimilarity(qVec, c.vector) : 0;
      const lex = lexicalScore(q, c.text, c.keywords);
      const score = vecScore * 0.75 + lex * 0.25;
      return { c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(({ c, score }) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      text: c.text,
      score: Number(score.toFixed(4)),
    }));
  }

  return lexHits;
}

function lexicalSearch(query: string, topK: number): RagHit[] {
  const scored = indexed.map((c) => ({
    c,
    score: lexicalScore(query, c.text, c.keywords),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, topK)
    .map(({ c, score }) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      text: c.text,
      score: Number(score.toFixed(4)),
    }));
}

function loadCache(): Array<{ id: string; vector: number[] }> | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Array<{
      id: string;
      vector: number[];
    }>;
  } catch {
    return null;
  }
}

function saveCache(rows: Array<{ id: string; vector: number[] }>) {
  try {
    mkdirSync(resolve(process.cwd(), ".cache"), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(rows), "utf8");
  } catch (err) {
    console.warn("[rag] could not write cache", err);
  }
}
