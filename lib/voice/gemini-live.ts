import {
  AGENT_TOOLS,
  GEMINI_LIVE_MODEL,
  NUSRAT_SYSTEM_INSTRUCTION,
  NUSRAT_VOICE,
} from "@/lib/agent/amber-agent";
import {
  buildAudioClientMessage,
  buildGreetingNudge,
  buildSystemNudge,
  buildToolResponseMessage,
  parseGeminiMessage,
  type GeminiServerMessage,
} from "@/lib/voice/gemini-protocol";
import { transcriptionEnabled } from "@/lib/voice/live-config";
import { buildLiveSetupMessage } from "@/lib/voice/live-setup";
import {
  DEFAULT_VOICE_SETTINGS,
  parseVoiceSettings,
  type VoiceSettings,
} from "@/lib/voice/voice-settings";

export {
  buildAudioClientMessage,
  buildGreetingNudge,
  buildSystemNudge,
  buildToolResponseMessage,
  parseGeminiMessage,
};
export type { GeminiServerMessage };

const DEFAULT_WS_BETA =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const DEFAULT_WS_ALPHA =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export function isAffectiveDialogEnabled(): boolean {
  // Off by default — affective dialog adds latency; set GEMINI_AFFECTIVE_DIALOG=true to enable.
  return (process.env.GEMINI_AFFECTIVE_DIALOG || "false").toLowerCase() === "true";
}

export function buildGeminiLiveUrl(
  apiKey: string,
  affectiveDialog?: boolean,
): string {
  const affective =
    affectiveDialog ?? isAffectiveDialogEnabled();
  const base =
    process.env.GEMINI_LIVE_WS_URL ||
    (affective ? DEFAULT_WS_ALPHA : DEFAULT_WS_BETA);
  return `${base}?key=${encodeURIComponent(apiKey)}`;
}

export function envDefaultVoiceSettings(): VoiceSettings {
  return parseVoiceSettings({
    ...DEFAULT_VOICE_SETTINGS,
    voice: process.env.GEMINI_LIVE_VOICE || NUSRAT_VOICE,
    affectiveDialog: isAffectiveDialogEnabled(),
  });
}

export function buildSetupMessage(options?: {
  model?: string;
  voice?: string;
  transcription?: boolean;
  systemInstruction?: string;
  settings?: Partial<VoiceSettings>;
}) {
  const fallback = envDefaultVoiceSettings();
  const settings = parseVoiceSettings({
    ...fallback,
    ...options?.settings,
    ...(options?.voice ? { voice: options.voice } : {}),
  });

  return buildLiveSetupMessage({
    model: options?.model || GEMINI_LIVE_MODEL,
    systemInstruction: options?.systemInstruction || NUSRAT_SYSTEM_INSTRUCTION,
    tools: AGENT_TOOLS,
    settings,
    transcription: transcriptionEnabled(options?.transcription),
  });
}

export function pcmToBase64(pcm: Buffer | Uint8Array): string {
  return Buffer.from(pcm).toString("base64");
}

export function base64ToPcm(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}
