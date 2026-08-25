export type ClientRole = "caller" | "ops";

export type CallStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "parked"
  | "ended"
  | "error";

export interface TranscriptLine {
  id: string;
  role: "user" | "nusrat" | "system";
  text: string;
  at: string;
}

export interface ToolCallLog {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  at: string;
}

export interface SessionSnapshot {
  status: CallStatus;
  error?: string;
  transcript: TranscriptLine[];
  toolCalls: ToolCallLog[];
  customer: unknown | null;
  tickets: unknown[];
  handoff: unknown | null;
  scene: {
    gulshanOutage: boolean;
    forceUnpaidBill: boolean;
  };
}

/** Messages browser clients send to the live proxy */
export type BrowserToProxy =
  | { type: "hello"; role: ClientRole }
  | { type: "start_call" }
  | { type: "audio"; data: string }
  | { type: "barge_in" }
  | { type: "mute"; muted: boolean }
  | { type: "hangup" }
  | { type: "nudge"; text: string }
  | {
      type: "set_scene";
      gulshanOutage?: boolean;
      forceUnpaidBill?: boolean;
    }
  | { type: "reset_demo" }
  | { type: "get_snapshot" };

/** Messages the proxy sends to browser clients */
export type ProxyToBrowser =
  | { type: "ready"; proxy: string; hasApiKey: boolean }
  | { type: "snapshot"; snapshot: SessionSnapshot }
  | { type: "status"; status: CallStatus; error?: string }
  | { type: "audio"; data: string }
  | { type: "interrupted" }
  | { type: "transcript"; line: TranscriptLine }
  | { type: "tool_call"; entry: ToolCallLog }
  | { type: "customer"; customer: unknown }
  | { type: "ticket"; ticket: unknown }
  | { type: "handoff"; handoff: unknown }
  | { type: "scene"; scene: SessionSnapshot["scene"] }
  | { type: "error"; message: string };
