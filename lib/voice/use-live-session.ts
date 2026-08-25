"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BrowserToProxy,
  CallStatus,
  ClientRole,
  ProxyToBrowser,
  SessionSnapshot,
  ToolCallLog,
  TranscriptLine,
} from "@/lib/voice/session-types";

const DEFAULT_PROXY =
  process.env.NEXT_PUBLIC_LIVE_PROXY_URL || "ws://localhost:3001";

export interface LiveSessionState {
  connected: boolean;
  hasApiKey: boolean;
  status: CallStatus;
  error?: string;
  transcript: TranscriptLine[];
  toolCalls: ToolCallLog[];
  customer: unknown | null;
  tickets: unknown[];
  handoff: unknown | null;
  scene: SessionSnapshot["scene"];
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
  scene: { gulshanOutage: true, forceUnpaidBill: true },
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
  };
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
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const send = useCallback((msg: BrowserToProxy) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(DEFAULT_PROXY);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "hello", role } satisfies BrowserToProxy));
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
            setState((s) => applySnapshot({ ...s, connected: true }, msg.snapshot));
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
