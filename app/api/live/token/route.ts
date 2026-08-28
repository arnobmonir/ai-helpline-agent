import { NextResponse } from "next/server";
import {
  AGENT_TOOLS,
  GEMINI_LIVE_MODEL,
  NUSRAT_VOICE,
  buildNusratInstruction,
} from "@/lib/agent/amber-agent";
import { getScene } from "@/lib/mock/scene";

/**
 * Mint a short-lived Gemini Live ephemeral token for browser → Gemini WS.
 * API key stays on the server (works on Vercel without a Node WS proxy).
 */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const model = process.env.GEMINI_LIVE_MODEL || GEMINI_LIVE_MODEL;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const voice =
    (body &&
      typeof body === "object" &&
      "voice" in body &&
      typeof (body as { voice?: unknown }).voice === "string" &&
      (body as { voice: string }).voice) ||
    process.env.GEMINI_LIVE_VOICE ||
    NUSRAT_VOICE;
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(
    Date.now() + 2 * 60 * 1000,
  ).toISOString();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
        }),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `token create failed: ${res.status} ${text.slice(0, 240)}` },
        { status: 502 },
      );
    }
    const data = JSON.parse(text) as { name?: string; expireTime?: string };
    if (!data.name) {
      return NextResponse.json({ error: "empty token" }, { status: 502 });
    }
    return NextResponse.json({
      token: data.name,
      expireTime: data.expireTime || expireTime,
      model,
      voice,
      tools: AGENT_TOOLS,
      systemInstruction: buildNusratInstruction({
        aniKnown: getScene().aniKnown,
        voice,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "token error" },
      { status: 502 },
    );
  }
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  return NextResponse.json({
    hasApiKey: Boolean(apiKey && apiKey !== "your_key_here"),
  });
}
