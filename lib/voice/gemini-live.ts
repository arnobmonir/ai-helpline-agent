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
import { LIVE_VAD, transcriptionEnabled } from "@/lib/voice/live-config";

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
  transcription?: boolean;
  systemInstruction?: string;
}) {
  const model = options?.model || GEMINI_LIVE_MODEL;
  const voice = options?.voice || process.env.GEMINI_LIVE_VOICE || NUSRAT_VOICE;
  const affective = isAffectiveDialogEnabled();
  const transcribe = transcriptionEnabled(options?.transcription);

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
        parts: [
          {
            text: options?.systemInstruction || NUSRAT_SYSTEM_INSTRUCTION,
          },
        ],
      },
      tools: AGENT_TOOLS,
      ...(transcribe
        ? {
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          }
        : {}),
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: LIVE_VAD.startOfSpeechSensitivity,
          endOfSpeechSensitivity: LIVE_VAD.endOfSpeechSensitivity,
          prefixPaddingMs: LIVE_VAD.prefixPaddingMs,
          silenceDurationMs: LIVE_VAD.silenceDurationMs,
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
