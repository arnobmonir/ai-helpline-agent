/** Gemini Live native-audio voices + caller-tunable session params. */

export type AudioQuality = "fast" | "natural";

export interface VoiceSettings {
  voice: string;
  /** Match caller emotion/tone (v1alpha). Slightly more latency. */
  affectiveDialog: boolean;
  /** Fast = low media resolution; Natural = fuller, more human speech. */
  audioQuality: AudioQuality;
}

export interface VoiceOption {
  id: string;
  style: string;
  gender: "female" | "male";
}

/** Voices called out for Nusrat; rest are still selectable. */
export const FEATURED_VOICE_IDS = [
  "Sulafat",
  "Kore",
  "Aoede",
  "Leda",
  "Autonoe",
] as const;

/** Gemini Live / TTS prebuilt voices (30). */
export const GEMINI_VOICES: VoiceOption[] = [
  { id: "Sulafat", style: "Warm", gender: "female" },
  { id: "Kore", style: "Firm", gender: "female" },
  { id: "Aoede", style: "Breezy", gender: "female" },
  { id: "Leda", style: "Youthful", gender: "female" },
  { id: "Autonoe", style: "Bright", gender: "female" },
  { id: "Zephyr", style: "Bright", gender: "female" },
  { id: "Callirrhoe", style: "Easy-going", gender: "female" },
  { id: "Despina", style: "Smooth", gender: "female" },
  { id: "Erinome", style: "Clear", gender: "female" },
  { id: "Gacrux", style: "Mature", gender: "female" },
  { id: "Laomedeia", style: "Upbeat", gender: "female" },
  { id: "Vindemiatrix", style: "Gentle", gender: "female" },
  { id: "Achernar", style: "Soft", gender: "female" },
  { id: "Pulcherrima", style: "Forward", gender: "female" },
  { id: "Puck", style: "Upbeat", gender: "male" },
  { id: "Charon", style: "Informative", gender: "male" },
  { id: "Fenrir", style: "Excitable", gender: "male" },
  { id: "Orus", style: "Firm", gender: "male" },
  { id: "Enceladus", style: "Breathy", gender: "male" },
  { id: "Iapetus", style: "Clear", gender: "male" },
  { id: "Umbriel", style: "Easy-going", gender: "male" },
  { id: "Algieba", style: "Smooth", gender: "male" },
  { id: "Algenib", style: "Gravelly", gender: "male" },
  { id: "Alnilam", style: "Firm", gender: "male" },
  { id: "Achird", style: "Friendly", gender: "male" },
  { id: "Rasalgethi", style: "Informative", gender: "male" },
  { id: "Sadachbia", style: "Lively", gender: "male" },
  { id: "Sadaltager", style: "Knowledgeable", gender: "male" },
  { id: "Schedar", style: "Even", gender: "male" },
  { id: "Zubenelgenubi", style: "Casual", gender: "male" },
];

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voice: "Sulafat",
  affectiveDialog: false,
  audioQuality: "fast",
};

export const VOICE_SETTINGS_STORAGE_KEY = "amberit.voiceSettings";

const VOICE_IDS = new Set(GEMINI_VOICES.map((v) => v.id));
const listeners = new Set<(settings: VoiceSettings) => void>();

export function voiceMeta(id: string): VoiceOption | undefined {
  return GEMINI_VOICES.find((v) => v.id === id);
}

export function settingsEqual(a: VoiceSettings, b: VoiceSettings): boolean {
  return (
    a.voice === b.voice &&
    a.affectiveDialog === b.affectiveDialog &&
    a.audioQuality === b.audioQuality
  );
}

export type AgentPersona = {
  name: string;
  nameBn: string;
  gender: "female" | "male";
};

/** Female desk agent stays Nusrat; male Gemini voices introduce as Rafi. */
export function agentPersonaForVoice(voiceId?: string): AgentPersona {
  const gender = voiceMeta(voiceId || "")?.gender ?? "female";
  if (gender === "male") {
    return { name: "Rafi", nameBn: "রাফি", gender: "male" };
  }
  return { name: "Nusrat", nameBn: "নুসরাত", gender: "female" };
}

export function parseVoiceSettings(raw: unknown): VoiceSettings {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const voice =
    typeof input.voice === "string" && input.voice.trim()
      ? input.voice.trim()
      : DEFAULT_VOICE_SETTINGS.voice;
  return {
    voice: VOICE_IDS.has(voice) ? voice : DEFAULT_VOICE_SETTINGS.voice,
    affectiveDialog: Boolean(input.affectiveDialog),
    audioQuality: input.audioQuality === "natural" ? "natural" : "fast",
  };
}

export function humanoidPreset(current?: Partial<VoiceSettings>): VoiceSettings {
  return parseVoiceSettings({
    voice: current?.voice || DEFAULT_VOICE_SETTINGS.voice,
    affectiveDialog: true,
    audioQuality: "natural",
  });
}

export function subscribeVoiceSettings(
  listener: (settings: VoiceSettings) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function liveMediaResolution(
  quality: AudioQuality,
): "MEDIA_RESOLUTION_LOW" | "MEDIA_RESOLUTION_MEDIUM" {
  return quality === "natural"
    ? "MEDIA_RESOLUTION_MEDIUM"
    : "MEDIA_RESOLUTION_LOW";
}

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_VOICE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return parseVoiceSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function saveVoiceSettings(settings: VoiceSettings): VoiceSettings {
  const next = parseVoiceSettings(settings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      VOICE_SETTINGS_STORAGE_KEY,
      JSON.stringify(next),
    );
  }
  // Defer so Softphone is not updated during VoiceSettingsButton's setState.
  queueMicrotask(() => {
    for (const listener of listeners) listener(next);
  });
  return next;
}
