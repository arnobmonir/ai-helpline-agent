"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VOICE_SETTINGS,
  VOICE_SETTINGS_STORAGE_KEY,
  humanoidPreset,
  loadVoiceSettings,
  saveVoiceSettings,
  settingsEqual,
  subscribeVoiceSettings,
  type VoiceSettings,
} from "@/lib/voice/voice-settings";

export function useVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);

  useEffect(() => {
    setSettings(loadVoiceSettings());

    const unsub = subscribeVoiceSettings((next) => {
      setSettings((prev) => (settingsEqual(prev, next) ? prev : next));
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key !== VOICE_SETTINGS_STORAGE_KEY) return;
      setSettings(loadVoiceSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = saveVoiceSettings({ ...prev, ...patch });
      return settingsEqual(prev, next) ? prev : next;
    });
  }, []);

  const applyHumanoid = useCallback(() => {
    setSettings((prev) => {
      const next = saveVoiceSettings(humanoidPreset(prev));
      return settingsEqual(prev, next) ? prev : next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings((prev) => {
      const next = saveVoiceSettings(DEFAULT_VOICE_SETTINGS);
      return settingsEqual(prev, next) ? prev : next;
    });
  }, []);

  return { settings, update, applyHumanoid, reset };
}
