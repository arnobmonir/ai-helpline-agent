import { config } from "dotenv";
import { resolve } from "path";
import { WebSocketServer, WebSocket } from "ws";
import {
  clearHandoff,
  getHandoff,
  listTickets,
  resetTickets,
} from "../lib/mock/tickets";
import { getScene, resetScene, setScene } from "../lib/mock/scene";
import { executeTool, lookupCustomer } from "../lib/agent/tools";
import { buildNusratInstruction } from "../lib/agent/amber-agent";
import { CUSTOMERS, DEMO_CUSTOMER_ID } from "../lib/mock/customers";
import { transcriptionEnabled } from "../lib/voice/live-config";
import { initRag } from "../lib/rag/store";
import {
  buildAudioClientMessage,
  buildGreetingNudge,
  buildGeminiLiveUrl,
  buildSetupMessage,
  buildSystemNudge,
  buildToolResponseMessage,
  parseGeminiMessage,
} from "../lib/voice/gemini-live";
import type {
  BrowserToProxy,
  CallStatus,
  ClientRole,
  ProxyToBrowser,
  SessionSnapshot,
  ToolCallLog,
  TranscriptLine,
} from "../lib/voice/session-types";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const PORT = Number(process.env.LIVE_PROXY_PORT || 3001);
const apiKey = process.env.GEMINI_API_KEY || "";

type ClientMeta = { role: ClientRole };

const clients = new Map<WebSocket, ClientMeta>();
let gemini: WebSocket | null = null;
let callStatus: CallStatus = "idle";
let callError: string | undefined;
let muted = false;
let transcript: TranscriptLine[] = [];
let toolCalls: ToolCallLog[] = [];
let customer: unknown | null = null;
let bargeIn = false;
let inputPartial = "";
let outputPartial = "";
let seq = 0;

function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

function snapshot(): SessionSnapshot {
  return {
    status: callStatus,
    error: callError,
    transcript: [...transcript],
    toolCalls: [...toolCalls],
    customer,
    tickets: listTickets(),
    handoff: getHandoff(),
    scene: getScene(),
    bargeIn,
  };
}

function send(ws: WebSocket, msg: ProxyToBrowser) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(msg: ProxyToBrowser, only?: ClientRole) {
  for (const [ws, meta] of clients) {
    if (only && meta.role !== only) continue;
    send(ws, msg);
  }
}

function broadcastAll(msg: ProxyToBrowser) {
  broadcast(msg);
}

function hasOpsClient() {
  for (const meta of clients.values()) {
    if (meta.role === "ops") return true;
  }
  return false;
}

function markBargeIn() {
  if (bargeIn) return;
  bargeIn = true;
  broadcastAll({ type: "barge_in" });
}

function applyToolResult(result: {
  ok: boolean;
  data: Record<string, unknown>;
  events?: Array<{ type: string; payload: unknown }>;
}) {
  for (const ev of result.events || []) {
    if (ev.type === "customer") {
      customer = ev.payload;
      broadcastAll({ type: "customer", customer: ev.payload });
    } else if (ev.type === "ticket") {
      broadcastAll({ type: "ticket", ticket: ev.payload });
    } else if (ev.type === "handoff") {
      setStatus("parked");
      broadcastAll({ type: "handoff", handoff: ev.payload });
    }
  }
}

function setStatus(status: CallStatus, error?: string) {
  callStatus = status;
  callError = error;
  broadcastAll({ type: "status", status, error });
}

function pushTranscript(role: TranscriptLine["role"], text: string) {
  const cleaned = text.trim();
  if (!cleaned) return;
  const line: TranscriptLine = {
    id: nextId("t"),
    role,
    text: cleaned,
    at: new Date().toISOString(),
  };
  transcript.push(line);
  if (transcript.length > 200) transcript.shift();
  broadcastAll({ type: "transcript", line });
}

function closeGemini() {
  if (gemini) {
    try {
      gemini.close();
    } catch {
      /* ignore */
    }
    gemini = null;
  }
}

function resetCallState(keepScene = true) {
  closeGemini();
  muted = false;
  transcript = [];
  toolCalls = [];
  customer = null;
  bargeIn = false;
  inputPartial = "";
  outputPartial = "";
  callError = undefined;
  if (!keepScene) {
    resetScene();
    resetTickets();
    clearHandoff();
  }
  setStatus("idle");
  broadcastAll({ type: "snapshot", snapshot: snapshot() });
}

const RING_MS = Number(process.env.CALL_RING_MS || 400);

async function startGeminiSession(options?: { greetAfterMs?: number }) {
  if (!apiKey || apiKey === "your_key_here") {
    setStatus(
      "error",
      "Missing GEMINI_API_KEY. Copy .env.local.example to .env.local and add your key.",
    );
    return;
  }

  closeGemini();
  // Keep UI on "ringing" until ready; only flip to connecting if ring already ended
  if (callStatus !== "ringing") setStatus("connecting");

  const greetAfterMs = options?.greetAfterMs ?? 0;
  const greetAt = Date.now() + greetAfterMs;
  const scene = getScene();
  const transcribe = transcriptionEnabled(hasOpsClient());

  const url = buildGeminiLiveUrl(apiKey);
  const ws = new WebSocket(url);
  gemini = ws;
  let closedExpected = false;

  ws.on("open", () => {
    const setup = buildSetupMessage({
      transcription: transcribe,
      systemInstruction: buildNusratInstruction({ aniKnown: scene.aniKnown }),
    });
    console.log(
      "[gemini] setup model=",
      setup.setup.model,
      "voice=",
      setup.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig
        .voiceName,
      "affective=",
      Boolean(setup.setup.generationConfig.enableAffectiveDialog),
    );
    ws.send(JSON.stringify(setup));
  });

  ws.on("message", async (data) => {
    const raw = typeof data === "string" ? data : data.toString("utf8");
    const msg = parseGeminiMessage(raw);
    if (!msg) {
      console.warn("[gemini] non-json message", raw.slice(0, 200));
      return;
    }

    if (msg.error?.message) {
      console.error("[gemini] error payload", msg.error);
      setStatus("error", msg.error.message);
      closedExpected = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return;
    }

    if (msg.setupComplete) {
      const delay = Math.max(0, greetAt - Date.now());
      setTimeout(() => {
        if (gemini !== ws || ws.readyState !== WebSocket.OPEN) return;
        setStatus("connected");
        ws.send(JSON.stringify(buildGreetingNudge()));
      }, delay);
      return;
    }

    if (msg.serverContent?.interrupted) {
      // Client must flush its queue before any later audio frames
      broadcastAll({ type: "interrupted" });
    }

    const inputTx = msg.serverContent?.inputTranscription?.text;
    if (inputTx) {
      inputPartial += inputTx;
      if (msg.serverContent?.turnComplete) {
        pushTranscript("user", inputPartial);
        inputPartial = "";
      }
    }

    const outputTx = msg.serverContent?.outputTranscription?.text;
    if (outputTx) {
      outputPartial += outputTx;
      if (msg.serverContent?.turnComplete) {
        pushTranscript("nusrat", outputPartial);
        outputPartial = "";
      }
    } else if (msg.serverContent?.turnComplete && outputPartial) {
      pushTranscript("nusrat", outputPartial);
      outputPartial = "";
    }

    const parts = msg.serverContent?.modelTurn?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        broadcast({ type: "audio", data: part.inlineData.data }, "caller");
      }
      if (part.text) {
        pushTranscript("nusrat", part.text);
      }
    }

    const calls = msg.toolCall?.functionCalls || [];
    if (calls.length > 0) {
      const settled = await Promise.all(
        calls.map(async (call) => {
          const name = call.name || "unknown";
          const args = (call.args || {}) as Record<string, unknown>;
          const result = await executeTool(name, args);
          return { call, name, args, result };
        }),
      );
      const responses = [];
      for (const { call, name, args, result } of settled) {
        const entry: ToolCallLog = {
          id: nextId("tool"),
          name,
          args,
          result: result.data,
          at: new Date().toISOString(),
        };
        toolCalls.push(entry);
        broadcastAll({ type: "tool_call", entry });
        applyToolResult(result);
        responses.push({
          id: call.id,
          name,
          response: { ...result.data, ok: result.ok },
        });
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(buildToolResponseMessage(responses)));
      }
    }
  });

  ws.on("error", (err) => {
    console.error("[gemini]", err);
    setStatus("error", err.message || "Gemini WebSocket error");
  });

  ws.on("close", (code, reasonBuf) => {
    if (gemini === ws) gemini = null;
    const reason = reasonBuf?.toString?.() || "";
    console.log("[gemini] close", code, reason);
    if (closedExpected) return;
    if (callStatus === "connected" || callStatus === "connecting" || callStatus === "ringing") {
      const detail =
        reason ||
        (code === 1008
          ? "Gemini rejected the session (policy / unsupported model or operation)."
          : `Gemini disconnected (code ${code}).`);
      setStatus("error", detail);
    }
  });
}

function handleBrowserMessage(ws: WebSocket, raw: string) {
  let msg: BrowserToProxy;
  try {
    msg = JSON.parse(raw) as BrowserToProxy;
  } catch {
    send(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  switch (msg.type) {
    case "hello": {
      clients.set(ws, { role: msg.role });
      send(ws, {
        type: "ready",
        proxy: `ws://localhost:${PORT}`,
        hasApiKey: Boolean(apiKey && apiKey !== "your_key_here"),
      });
      send(ws, { type: "snapshot", snapshot: snapshot() });
      break;
    }
    case "get_snapshot": {
      send(ws, { type: "snapshot", snapshot: snapshot() });
      break;
    }
    case "start_call": {
      if (clients.get(ws)?.role !== "caller") {
        send(ws, { type: "error", message: "Only caller can start a call" });
        return;
      }
      transcript = [];
      toolCalls = [];
      customer = null;
      bargeIn = false;
      clearHandoff();
      inputPartial = "";
      outputPartial = "";
      if (getScene().aniKnown) {
        const demo = CUSTOMERS.find((c) => c.id === DEMO_CUSTOMER_ID);
        const looked = lookupCustomer(demo?.cid || "AIT-100234");
        if (looked.ok && looked.data.customer) {
          customer = looked.data.customer;
        }
      }
      setStatus("ringing");
      broadcastAll({ type: "snapshot", snapshot: snapshot() });
      // Connect to Gemini during the short ring (don't wait serially)
      void startGeminiSession({ greetAfterMs: RING_MS });
      break;
    }
    case "audio": {
      if (muted || callStatus !== "connected" || !gemini) {
        return;
      }
      if (gemini.readyState === WebSocket.OPEN) {
        gemini.send(JSON.stringify(buildAudioClientMessage(msg.data)));
      }
      break;
    }
    case "barge_in": {
      // Local barge-in: stop playback immediately. Keep forwarding mic audio
      // so Gemini automatic VAD also interrupts the model turn.
      markBargeIn();
      broadcastAll({ type: "interrupted" });
      break;
    }
    case "mute": {
      muted = msg.muted;
      break;
    }
    case "nudge": {
      if (callStatus !== "connected" && callStatus !== "parked") {
        console.warn("[live-proxy] nudge ignored, status=", callStatus);
        return;
      }
      if (gemini && gemini.readyState === WebSocket.OPEN) {
        console.log("[live-proxy] nudge → gemini");
        gemini.send(JSON.stringify(buildSystemNudge(msg.text)));
      } else {
        console.warn("[live-proxy] nudge: gemini not open");
      }
      break;
    }
    case "hangup": {
      closeGemini();
      setStatus("ended");
      setTimeout(() => resetCallState(true), 400);
      break;
    }
    case "set_scene": {
      const scene = setScene({
        gulshanOutage: msg.gulshanOutage,
        forceUnpaidBill: msg.forceUnpaidBill,
        aniKnown: msg.aniKnown,
      });
      broadcastAll({ type: "scene", scene });
      break;
    }
    case "reset_demo": {
      resetTickets();
      clearHandoff();
      resetScene();
      resetCallState(true);
      broadcastAll({ type: "scene", scene: getScene() });
      broadcastAll({ type: "snapshot", snapshot: snapshot() });
      break;
    }
    default:
      console.warn("[live-proxy] unknown message", (msg as { type?: string }).type);
      send(ws, {
        type: "error",
        message: `Unknown message type: ${(msg as { type?: string }).type || "?"}`,
      });
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  clients.set(ws, { role: "ops" });

  ws.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString("utf8");
    handleBrowserMessage(ws, raw);
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

console.log(
  `[live-proxy] listening on ws://localhost:${PORT} (API key ${
    apiKey && apiKey !== "your_key_here" ? "present" : "MISSING"
  })`,
);

void initRag(apiKey).catch((err) => {
  console.warn("[rag] init failed", err);
});
