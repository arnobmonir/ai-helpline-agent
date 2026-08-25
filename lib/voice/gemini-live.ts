import {
  AGENT_TOOLS,
  GEMINI_LIVE_MODEL,
  NUSRAT_SYSTEM_INSTRUCTION,
  NUSRAT_VOICE,
} from "@/lib/agent/amber-agent";

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

export function buildAudioClientMessage(base64Pcm: string) {
  return {
    realtimeInput: {
      audio: {
        mimeType: "audio/pcm;rate=16000",
        data: base64Pcm,
      },
    },
  };
}

/** Hint Gemini the user started speaking (barge-in). */
export function buildActivityStartMessage() {
  return {
    realtimeInput: {
      activityStart: {},
    },
  };
}

export function buildToolResponseMessage(
  functionResponses: Array<{
    id?: string;
    name: string;
    response: Record<string, unknown>;
  }>,
) {
  return {
    toolResponse: {
      functionResponses: functionResponses.map((fr) => ({
        id: fr.id,
        name: fr.name,
        response: fr.response,
      })),
    },
  };
}

/** Ask Nusrat to speak the greeting after setup completes. */
export function buildGreetingNudge() {
  return {
    clientContent: {
      turns: [
        {
          role: "user",
          parts: [
            {
              text: "[system] Softphone just connected. Pick up like a real Amber IT care agent: warm greeting only, one short breath, then wait for the caller. Sound human, not scripted.",
            },
          ],
        },
      ],
      turnComplete: true,
    },
  };
}

export type GeminiServerMessage = {
  setupComplete?: unknown;
  error?: { code?: number; message?: string; status?: string };
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    generationComplete?: boolean;
    modelTurn?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        text?: string;
      }>;
    };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
  toolCall?: {
    functionCalls?: Array<{
      id?: string;
      name?: string;
      args?: Record<string, unknown>;
    }>;
  };
  toolCallCancellation?: unknown;
};

export function parseGeminiMessage(raw: string): GeminiServerMessage | null {
  try {
    return JSON.parse(raw) as GeminiServerMessage;
  } catch {
    return null;
  }
}
