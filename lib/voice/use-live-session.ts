"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BrowserToProxy,
  CallStatus,
  ClientRole,
  ProxyToBrowser,
  SessionSnapshot,
  ToolCallLog,
} from "@/lib/voice/session-types";
import {
  buildAudioClientMessage,
  buildGreetingNudge,
  buildToolResponseMessage,
  buildSystemNudge,
  parseGeminiMessage,
} from "@/lib/voice/gemini-protocol";
import { LIVE_VAD, transcriptionEnabled } from "@/lib/voice/live-config";

const DEFAULT_PROXY =
  process.env.NEXT_PUBLIC_LIVE_PROXY_URL || "ws://localhost:3001";

/** Prefer direct Gemini Live on Vercel; local keeps the Node proxy. */
function useDirectLive(): boolean {
  if (process.env.NEXT_PUBLIC_LIVE_MODE === "direct") return true;
  if (process.env.NEXT_PUBLIC_LIVE_MODE === "proxy") return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

const LIVE_WS =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

const RING_MS = 400;

export interface LiveSessionState {
  connected: boolean;
  hasApiKey: boolean;
  status: CallStatus;
  error?: string;
  transcript: SessionSnapshot["transcript"];
  toolCalls: ToolCallLog[];
  customer: unknown | null;
  tickets: unknown[];
  handoff: unknown | null;
  scene: SessionSnapshot["scene"];
  bargeIn: boolean;
}

const initial: LiveSessionState = {
  connected: false,
  hasApiKey: false,
  status: "idle",
  transcript: [],
  toolCalls: [],
  customer: null,
  tickets: [],
  handoff: null,
  scene: { gulshanOutage: true, forceUnpaidBill: true, aniKnown: false },
  bargeIn: false,
};

function applySnapshot(
  prev: LiveSessionState,
  snapshot: SessionSnapshot,
): LiveSessionState {
  return {
    ...prev,
    status: snapshot.status,
    error: snapshot.error,
    transcript: snapshot.transcript,
    toolCalls: snapshot.toolCalls,
    customer: snapshot.customer,
    tickets: snapshot.tickets as unknown[],
    handoff: snapshot.handoff,
    scene: snapshot.scene,
    bargeIn: Boolean(snapshot.bargeIn),
  };
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useLiveSession(
  role: ClientRole,
  options?: {
    onAudio?: (base64Pcm: string) => void;
    onInterrupted?: () => void;
  },
) {
  const [state, setState] = useState<LiveSessionState>(initial);
  const wsRef = useRef<WebSocket | null>(null);
  const geminiRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const directRef = useRef(false);
  const mutedRef = useRef(false);
  const statusRef = useRef<CallStatus>("idle");
  const roleRef = useRef(role);
  roleRef.current = role;

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const setStatus = useCallback((status: CallStatus, error?: string) => {
    statusRef.current = status;
    setState((s) => ({ ...s, status, error }));
  }, []);

  const handleDirectMessage = useCallback(
    async (msg: BrowserToProxy) => {
      switch (msg.type) {
        case "start_call": {
          if (roleRef.current !== "caller") return;
          setState((s) => ({
            ...s,
            transcript: [],
            toolCalls: [],
            customer: null,
            handoff: null,
            bargeIn: false,
            error: undefined,
          }));
          setStatus("ringing");
          try {
            const tokenRes = await fetch("/api/live/token", { method: "POST" });
            const tokenJson = (await tokenRes.json()) as {
              token?: string;
              error?: string;
              model?: string;
              voice?: string;
              tools?: unknown;
              systemInstruction?: string;
            };
            if (!tokenRes.ok || !tokenJson.token) {
              setStatus(
                "error",
                tokenJson.error || "Could not create Live session token",
              );
              return;
            }

            const greetAt = Date.now() + RING_MS;
            const gws = new WebSocket(
              `${LIVE_WS}?access_token=${encodeURIComponent(tokenJson.token)}`,
            );
            geminiRef.current = gws;

            gws.onopen = () => {
              const model =
                tokenJson.model || "gemini-2.5-flash-native-audio-latest";
              const voice = tokenJson.voice || "Sulafat";
              gws.send(
                JSON.stringify({
                  setup: {
                    model: `models/${model}`,
                    generationConfig: {
                      responseModalities: ["AUDIO"],
                      mediaResolution: "MEDIA_RESOLUTION_LOW",
                      thinkingConfig: { thinkingBudget: 0 },
                      speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: voice },
                        },
                      },
                    },
                    systemInstruction: {
                      parts: [
                        {
                          text:
                            tokenJson.systemInstruction ||
                            "You are Nusrat, Amber IT Customer Care.",
                        },
                      ],
                    },
                    tools: tokenJson.tools || [],
                    ...(transcriptionEnabled()
                      ? {
                          inputAudioTranscription: {},
                          outputAudioTranscription: {},
                        }
                      : {}),
                    realtimeInputConfig: {
                      automaticActivityDetection: {
                        disabled: false,
                        startOfSpeechSensitivity:
                          LIVE_VAD.startOfSpeechSensitivity,
                        endOfSpeechSensitivity: LIVE_VAD.endOfSpeechSensitivity,
                        prefixPaddingMs: LIVE_VAD.prefixPaddingMs,
                        silenceDurationMs: LIVE_VAD.silenceDurationMs,
                      },
                    },
                  },
                }),
              );
            };

            gws.onmessage = async (ev) => {
              const raw =
                typeof ev.data === "string" ? ev.data : await ev.data.text();
              const gmsg = parseGeminiMessage(raw);
              if (!gmsg) return;

              if (gmsg.error?.message) {
                setStatus("error", gmsg.error.message);
                try {
                  gws.close();
                } catch {
                  /* ignore */
                }
                return;
              }

              if (gmsg.setupComplete) {
                const delay = Math.max(0, greetAt - Date.now());
                setTimeout(() => {
                  if (
                    geminiRef.current !== gws ||
                    gws.readyState !== WebSocket.OPEN
                  )
                    return;
                  setStatus("connected");
                  gws.send(JSON.stringify(buildGreetingNudge()));
                }, delay);
                return;
              }

              if (gmsg.serverContent?.interrupted) {
                optionsRef.current?.onInterrupted?.();
              }

              const parts = gmsg.serverContent?.modelTurn?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  optionsRef.current?.onAudio?.(part.inlineData.data);
                }
              }

              const calls = gmsg.toolCall?.functionCalls || [];
              if (calls.length === 0) return;

              const settled = await Promise.all(
                calls.map(async (call) => {
                  const name = call.name || "unknown";
                  const args = (call.args || {}) as Record<string, unknown>;
                  const toolRes = await fetch("/api/tools", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, args }),
                  });
                  const toolJson = (await toolRes.json()) as {
                    ok?: boolean;
                    data?: Record<string, unknown>;
                    events?: Array<{ type: string; payload: unknown }>;
                  };
                  return { call, name, args, toolJson };
                }),
              );

              const responses = [];
              for (const { call, name, args, toolJson } of settled) {
                const entry: ToolCallLog = {
                  id: nextId("tool"),
                  name,
                  args,
                  result: toolJson.data || {},
                  at: new Date().toISOString(),
                };
                setState((s) => ({
                  ...s,
                  toolCalls: [...s.toolCalls, entry].slice(-100),
                }));
                for (const evn of toolJson.events || []) {
                  if (evn.type === "customer") {
                    setState((s) => ({ ...s, customer: evn.payload }));
                  } else if (evn.type === "ticket") {
                    setState((s) => ({
                      ...s,
                      tickets: [evn.payload, ...s.tickets],
                    }));
                  } else if (evn.type === "handoff") {
                    setStatus("parked");
                    setState((s) => ({ ...s, handoff: evn.payload }));
                  }
                }
                responses.push({
                  id: call.id,
                  name,
                  response: { ...(toolJson.data || {}), ok: toolJson.ok },
                });
              }
              if (gws.readyState === WebSocket.OPEN) {
                gws.send(JSON.stringify(buildToolResponseMessage(responses)));
              }
              return;
            };

            gws.onerror = () => {
              if (
                statusRef.current === "ringing" ||
                statusRef.current === "connecting" ||
                statusRef.current === "connected"
              ) {
                setStatus("error", "Gemini WebSocket error");
              }
            };

            gws.onclose = () => {
              if (geminiRef.current === gws) geminiRef.current = null;
              if (
                statusRef.current === "ringing" ||
                statusRef.current === "connecting" ||
                statusRef.current === "connected"
              ) {
                setStatus("ended");
              }
            };
          } catch (err) {
            setStatus(
              "error",
              err instanceof Error ? err.message : "Failed to start call",
            );
          }
          break;
        }
        case "audio": {
          if (
            mutedRef.current ||
            statusRef.current !== "connected" ||
            !geminiRef.current
          ) {
            return;
          }
          if (geminiRef.current.readyState === WebSocket.OPEN) {
            geminiRef.current.send(
              JSON.stringify(buildAudioClientMessage(msg.data)),
            );
          }
          break;
        }
        case "barge_in": {
          setState((s) => ({ ...s, bargeIn: true }));
          optionsRef.current?.onInterrupted?.();
          break;
        }
        case "mute": {
          mutedRef.current = msg.muted;
          break;
        }
        case "nudge": {
          if (
            statusRef.current !== "connected" &&
            statusRef.current !== "parked"
          ) {
            return;
          }
          if (geminiRef.current?.readyState === WebSocket.OPEN) {
            geminiRef.current.send(
              JSON.stringify(buildSystemNudge(msg.text)),
            );
          }
          break;
        }
        case "hangup": {
          try {
            geminiRef.current?.close();
          } catch {
            /* ignore */
          }
          geminiRef.current = null;
          setStatus("ended");
          setTimeout(() => setStatus("idle"), 400);
          break;
        }
        case "set_scene": {
          void fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gulshanOutage: msg.gulshanOutage,
              forceUnpaidBill: msg.forceUnpaidBill,
              aniKnown: msg.aniKnown,
            }),
          });
          setState((s) => ({
            ...s,
            scene: {
              gulshanOutage: msg.gulshanOutage ?? s.scene.gulshanOutage,
              forceUnpaidBill: msg.forceUnpaidBill ?? s.scene.forceUnpaidBill,
              aniKnown: msg.aniKnown ?? s.scene.aniKnown,
            },
          }));
          break;
        }
        case "reset_demo": {
          void fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reset: true }),
          });
          setState((s) => ({
            ...s,
            toolCalls: [],
            customer: null,
            tickets: [],
            handoff: null,
            bargeIn: false,
            scene: {
              gulshanOutage: true,
              forceUnpaidBill: true,
              aniKnown: false,
            },
          }));
          break;
        }
        default:
          break;
      }
    },
    [setStatus],
  );

  const send = useCallback(
    (msg: BrowserToProxy) => {
      if (directRef.current) {
        void handleDirectMessage(msg);
        return;
      }
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    [handleDirectMessage],
  );

  useEffect(() => {
    const direct = useDirectLive();
    directRef.current = direct;

    if (direct) {
      let cancelled = false;
      void (async () => {
        try {
          const res = await fetch("/api/live/token");
          const json = (await res.json()) as { hasApiKey?: boolean };
          if (!cancelled) {
            setState((s) => ({
              ...s,
              connected: true,
              hasApiKey: Boolean(json.hasApiKey),
            }));
          }
        } catch {
          if (!cancelled) {
            setState((s) => ({ ...s, connected: true, hasApiKey: false }));
          }
        }
      })();
      return () => {
        cancelled = true;
        try {
          geminiRef.current?.close();
        } catch {
          /* ignore */
        }
        geminiRef.current = null;
      };
    }

    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(DEFAULT_PROXY);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({ type: "hello", role } satisfies BrowserToProxy),
        );
      };

      ws.onmessage = (ev) => {
        let msg: ProxyToBrowser;
        try {
          msg = JSON.parse(String(ev.data)) as ProxyToBrowser;
        } catch {
          return;
        }

        switch (msg.type) {
          case "ready":
            setState((s) => ({
              ...s,
              connected: true,
              hasApiKey: msg.hasApiKey,
            }));
            break;
          case "snapshot":
            setState((s) =>
              applySnapshot({ ...s, connected: true }, msg.snapshot),
            );
            break;
          case "status":
            setState((s) => ({
              ...s,
              status: msg.status,
              error: msg.error,
            }));
            break;
          case "transcript":
            setState((s) => ({
              ...s,
              transcript: [...s.transcript, msg.line].slice(-200),
            }));
            break;
          case "tool_call":
            setState((s) => ({
              ...s,
              toolCalls: [...s.toolCalls, msg.entry].slice(-100),
            }));
            break;
          case "customer":
            setState((s) => ({ ...s, customer: msg.customer }));
            break;
          case "ticket":
            setState((s) => ({
              ...s,
              tickets: [msg.ticket, ...s.tickets],
            }));
            break;
          case "handoff":
            setState((s) => ({ ...s, handoff: msg.handoff }));
            break;
          case "scene":
            setState((s) => ({ ...s, scene: msg.scene }));
            break;
          case "barge_in":
            setState((s) => ({ ...s, bargeIn: true }));
            break;
          case "audio":
            optionsRef.current?.onAudio?.(msg.data);
            break;
          case "interrupted":
            optionsRef.current?.onInterrupted?.();
            break;
          case "error":
            setState((s) => ({ ...s, error: msg.message }));
            break;
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (!closed) {
          retryTimer = setTimeout(connect, 1500);
        }
      };

      ws.onerror = () => {
        /* onclose will retry */
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [role]);

  return { state, send };
}

export function floatToBase64Pcm16(int16Buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(int16Buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}
