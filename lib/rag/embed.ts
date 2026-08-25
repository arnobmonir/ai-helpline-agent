/**
 * Gemini text embeddings for RAG.
 * Uses gemini-embedding-001 via REST (same GEMINI_API_KEY).
 */

const EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

export async function embedTexts(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedOne(text, apiKey));
  }
  return out;
}

export async function embedOne(text: string, apiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embed failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    embedding?: { values?: number[] };
  };
  const values = json.embedding?.values;
  if (!values?.length) throw new Error("embed: empty vector");
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Simple lexical score 0..1 for hybrid retrieval without embeddings. */
export function lexicalScore(query: string, chunkText: string, keywords: string[] = []): number {
  const q = tokenize(query);
  if (q.length === 0) return 0;
  const hay = tokenize(`${chunkText} ${keywords.join(" ")}`);
  const set = new Set(hay);
  let hit = 0;
  for (const t of q) {
    if (set.has(t)) hit += 1;
  }
  return hit / q.length;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#*]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
