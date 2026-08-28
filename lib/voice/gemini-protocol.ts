/** Browser-safe Gemini Live protocol helpers (no Node Buffer). */

import { buildCareGreeting } from "@/lib/kb/troubleshooting";
import { agentPersonaForVoice } from "@/lib/voice/voice-settings";

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

/** Ask the desk agent to speak the greeting after setup completes. */
export function buildGreetingNudge(voice?: string) {
  const persona = agentPersonaForVoice(voice);
  const greeting = buildCareGreeting(persona.nameBn);
  return buildSystemNudge(
    `Softphone just connected. You are ${persona.name} (${persona.nameBn}), a ${persona.gender === "male" ? "man" : "woman"}. Speak this greeting only, one short breath, then wait for the caller. Do not add extra lines. Do not use any other name.\n${greeting}`,
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
