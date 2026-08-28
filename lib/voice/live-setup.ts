import { LIVE_VAD } from "@/lib/voice/live-config";
import {
  liveMediaResolution,
  parseVoiceSettings,
  type VoiceSettings,
} from "@/lib/voice/voice-settings";

/** Shared Gemini Live `setup` payload (browser + proxy). */
export function buildLiveSetupMessage(options: {
  model: string;
  systemInstruction: string;
  tools: unknown;
  settings?: Partial<VoiceSettings> | VoiceSettings;
  transcription?: boolean;
}) {
  const settings = parseVoiceSettings(options.settings);
  const affective = settings.affectiveDialog;

  return {
    setup: {
      model: `models/${options.model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        mediaResolution: liveMediaResolution(settings.audioQuality),
        thinkingConfig: { thinkingBudget: 0 },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: settings.voice,
            },
          },
        },
        ...(affective ? { enableAffectiveDialog: true } : {}),
      },
      systemInstruction: {
        parts: [{ text: options.systemInstruction }],
      },
      tools: options.tools,
      ...(options.transcription
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
