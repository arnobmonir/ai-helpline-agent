import {
  AGENT_TOOLS,
  GEMINI_LIVE_MODEL,
  NUSRAT_SYSTEM_INSTRUCTION,
  NUSRAT_VOICE,
} from "@/lib/agent/amber-agent";
import {
  buildAudioClientMessage,
  buildGreetingNudge,
  buildToolResponseMessage,
  parseGeminiMessage,
  type GeminiServerMessage,
} from "@/lib/voice/gemini-protocol";

export {
  buildAudioClientMessage,
  buildGreetingNudge,
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

export function buildGeminiLiveUrl(apiKey: string): string {
  const affective = isAffectiveDialogEnabled();
  const base =
    process.env.GEMINI_LIVE_WS_URL ||
    (affective ? DEFAULT_WS_ALPHA : DEFAULT_WS_BETA);
  return `${base}?key=${encodeURIComponent(apiKey)}`;
}

export function buildSetupMessage(options?: {
  model?: string;
  voice?: string;
}) {
  const model = options?.model || GEMINI_LIVE_MODEL;
  const voice = options?.voice || process.env.GEMINI_LIVE_VOICE || NUSRAT_VOICE;
  const affective = isAffectiveDialogEnabled();

  return {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        // Lower input media fidelity → less token work / snappier turns
        mediaResolution: "MEDIA_RESOLUTION_LOW",
        // Gemini 2.5 native-audio: disable thinking for lowest latency
        thinkingConfig: { thinkingBudget: 0 },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
        ...(affective ? { enableAffectiveDialog: true } : {}),
      },
      systemInstruction: {
        parts: [{ text: NUSRAT_SYSTEM_INSTRUCTION }],
      },
      tools: AGENT_TOOLS,
      // Skip input/output transcription — saves cost + latency (captions stay optional/off)
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
          endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
          prefixPaddingMs: 40,
          silenceDurationMs: 600,
        },
      },
    },
  };
}

export function pcmToBase64(pcm: Buffer | Uint8Array): string {
  return Buffer.from(pcm).toString("base64");
}

export function base64ToPcm(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}
