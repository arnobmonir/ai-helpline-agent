/** Browser-safe Gemini Live protocol helpers (no Node Buffer). */

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
  return buildSystemNudge(
    "Softphone just connected. Pick up like a real Amber IT care agent: warm greeting only, one short breath, then wait for the caller. Sound human, not scripted.",
  );
}

/** Generic system turn for Live (repeat prompt, goodbye, etc.). */
export function buildSystemNudge(text: string) {
  return {
    clientContent: {
      turns: [
        {
          role: "user",
          parts: [
            {
              text: text.startsWith("[system]")
                ? text
                : `[system] ${text}`,
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
