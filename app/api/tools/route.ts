import { NextResponse } from "next/server";
import { executeTool } from "@/lib/agent/tools";
import { initRag, isRagReady } from "@/lib/rag/store";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isRagReady()) {
    await initRag(apiKey);
  }

  let body: { name?: string; args?: Record<string, unknown> };
  try {
    body = (await request.json()) as {
      name?: string;
      args?: Record<string, unknown>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "");
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const result = await executeTool(name, body.args || {});
  return NextResponse.json({
    ok: result.ok,
    data: result.data,
    events: result.events || [],
  });
}
