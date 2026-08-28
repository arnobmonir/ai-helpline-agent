"use client";

import { useEffect, useRef, useState } from "react";
import { GearIcon } from "@/components/softphone/icons";
import { useVoiceSettings } from "@/lib/voice/use-voice-settings";
import {
  FEATURED_VOICE_IDS,
  GEMINI_VOICES,
  agentPersonaForVoice,
  type VoiceOption,
} from "@/lib/voice/voice-settings";

const FEATURED_SET = new Set<string>(FEATURED_VOICE_IDS);

const featured = FEATURED_VOICE_IDS.map((id) =>
  GEMINI_VOICES.find((v) => v.id === id),
).filter((v): v is VoiceOption => Boolean(v));
const moreVoices = GEMINI_VOICES.filter((v) => !FEATURED_SET.has(v.id));

export function VoiceSettingsButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { settings, update, applyHumanoid, reset } = useVoiceSettings();
  const agent = agentPersonaForVoice(settings.voice);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Voice settings"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-border bg-white px-3 py-1.5 text-xs font-medium text-amber-ink shadow-sm transition hover:border-amber-red hover:text-amber-red"
      >
        <GearIcon className="h-3.5 w-3.5" />
        Voice
        <span className="hidden text-amber-muted sm:inline">
          · {settings.voice}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-border bg-white shadow-lg">
          <div className="border-b border-amber-border px-4 py-3">
            <p className="text-sm font-semibold text-amber-ink">
              Agent voice & tone
            </p>
            <p className="mt-0.5 text-xs text-amber-muted">
              Applies on the next call. This voice answers as{" "}
              <span className="font-medium text-amber-ink">
                {agent.name} ({agent.gender})
              </span>
              . Female → Nusrat, male → Rafi.
            </p>
          </div>

          <div className="max-h-[min(32rem,70vh)] space-y-4 overflow-y-auto p-4">
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-red">
                Voice
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {featured.map((v) => (
                  <VoiceChip
                    key={v.id}
                    voice={v}
                    selected={settings.voice === v.id}
                    onSelect={() => update({ voice: v.id })}
                  />
                ))}
              </div>
              <label className="mt-2 block">
                <span className="sr-only">All Gemini voices</span>
                <select
                  value={settings.voice}
                  onChange={(e) => update({ voice: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-amber-border bg-amber-cream/40 px-2.5 py-2 text-xs text-amber-ink"
                >
                  <optgroup label="Recommended">
                    {featured.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.id} — {v.style}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="More female">
                    {moreVoices
                      .filter((v) => v.gender === "female")
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.id} — {v.style}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Male">
                    {moreVoices
                      .filter((v) => v.gender === "male")
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.id} — {v.style}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>
            </section>

            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-red">
                More humanoid
              </p>
              <Toggle
                label="Affective dialog"
                hint="Match the caller’s emotion and tone"
                checked={settings.affectiveDialog}
                onChange={(affectiveDialog) => update({ affectiveDialog })}
              />
              <div className="mt-3">
                <p className="text-sm text-amber-ink">Audio quality</p>
                <p className="mb-2 text-[11px] text-amber-muted">
                  Natural is fuller speech; Fast is snappier.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <QualityChip
                    label="Fast"
                    selected={settings.audioQuality === "fast"}
                    onClick={() => update({ audioQuality: "fast" })}
                  />
                  <QualityChip
                    label="Natural"
                    selected={settings.audioQuality === "natural"}
                    onClick={() => update({ audioQuality: "natural" })}
                  />
                </div>
              </div>
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyHumanoid}
                className="flex-1 rounded-lg bg-amber-red px-3 py-2 text-xs font-semibold text-white hover:bg-amber-red-dark"
              >
                Most humanoid
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-amber-border px-3 py-2 text-xs font-medium text-amber-ink hover:bg-amber-cream"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VoiceChip({
  voice,
  selected,
  onSelect,
}: {
  voice: VoiceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border px-2.5 py-2 text-left transition ${
        selected
          ? "border-amber-red bg-amber-cream text-amber-red"
          : "border-amber-border bg-white text-amber-ink hover:border-amber-red/50"
      }`}
    >
      <span className="block text-xs font-semibold">{voice.id}</span>
      <span className="block text-[10px] text-amber-muted">{voice.style}</span>
    </button>
  );
}

function QualityChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
        selected
          ? "border-amber-red bg-amber-cream text-amber-red"
          : "border-amber-border text-amber-ink hover:bg-amber-cream/60"
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-amber-ink">{label}</p>
        <p className="text-[11px] text-amber-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-amber-red" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
