/** Shared Gemini Live realtime settings (browser + proxy). */

export const LIVE_VAD = {
  startOfSpeechSensitivity: "START_SENSITIVITY_LOW" as const,
  endOfSpeechSensitivity: "END_SENSITIVITY_LOW" as const,
  prefixPaddingMs: 40,
  silenceDurationMs: 400,
};

export function transcriptionEnabled(force?: boolean): boolean {
  const env = (process.env.GEMINI_LIVE_TRANSCRIPTION || "").toLowerCase();
  if (env === "false" || env === "0") return false;
  if (env === "true" || env === "1") return true;
  return Boolean(force);
}
