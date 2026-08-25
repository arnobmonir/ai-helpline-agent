"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  base64ToInt16,
  floatToBase64Pcm16,
  useLiveSession,
} from "@/lib/voice/use-live-session";

type SoftphonePhase = "idle" | "ringing" | "connected" | "ended" | "error";

/** Absolute floor — ambient room noise is usually well below this. */
const BARGE_IN_RMS_MIN = 0.085;
/** Must exceed recent noise floor by this factor (rejects hiss/fan). */
const BARGE_IN_NOISE_RATIO = 4.5;
/** Need this many loud frames in a row (~32ms each) before cutting her off. */
const BARGE_IN_FRAMES = 5;
/** Ignore barge-in right after she starts talking (greeting / short answers). */
const BARGE_IN_GRACE_MS = 1200;
/** UI mic activity (softer than barge-in) — ripple only, not silence logic. */
const USER_TALK_RMS = 0.018;
/** Keep agent “talking” UI briefly between audio chunks. */
const AGENT_TALK_HOLD_MS = 280;
/** Keep user “talking” UI briefly after level drops. */
const USER_TALK_HOLD_MS = 220;
/** Only uplink / count speech above this when agent is quiet (filters room noise). */
const SPEECH_GATE_RMS = 0.045;
/** Need this many loud frames (~32ms) before counting as real user speech. */
const SPEECH_GATE_FRAMES = 6;
/** After agent stops, wait this long for user speech before repeating. */
const USER_SILENCE_MS = 7000;
/** How many times to re-ask before ending the call. */
const MAX_SILENCE_REPEATS = 2;
/** After goodbye nudge, hang up. */
const SILENCE_HANGUP_DELAY_MS = 4500;

export function Softphone() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef(0);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playGenRef = useRef(0);
  /** Drop late agent audio after local barge-in until Gemini acknowledges */
  const ignoreAgentUntilRef = useRef(0);
  const micActiveRef = useRef(false);
  const lastBargeAtRef = useRef(0);
  const bargeLoudFramesRef = useRef(0);
  const noiseFloorRef = useRef(0.01);
  /** When current agent utterance started playing */
  const agentUtteranceAtRef = useRef(0);
  const userRmsRef = useRef(0);
  const userRmsSmoothRef = useRef(0);
  const agentHoldUntilRef = useRef(0);
  const userHoldUntilRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hangupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceRepeatsRef = useRef(0);
  const heardAgentRef = useRef(false);
  const endingForSilenceRef = useRef(false);
  const silenceDeadlineRef = useRef<number | null>(null);
  const speechGateFramesRef = useRef(0);
  const intentionalSpeechUntilRef = useRef(0);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [agentTalking, setAgentTalking] = useState(false);
  const [userTalking, setUserTalking] = useState(false);
  const connectedAtRef = useRef<number | null>(null);

  const isAgentPlaying = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return sourcesRef.current.length > 0;
    return (
      sourcesRef.current.length > 0 ||
      nextPlayTimeRef.current > ctx.currentTime + 0.05
    );
  }, []);

  const clearPlayback = useCallback(() => {
    playGenRef.current += 1;
    for (const src of sourcesRef.current) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    bargeLoudFramesRef.current = 0;
    setAgentTalking(false);
  }, []);

  const ensureAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playPcm24k = useCallback(
    async (base64: string, gen: number) => {
      if (gen !== playGenRef.current) return;
      if (Date.now() < ignoreAgentUntilRef.current) return;

      const ctx = await ensureAudio();
      if (gen !== playGenRef.current) return;
      if (Date.now() < ignoreAgentUntilRef.current) return;

      const int16 = base64ToInt16(base64);
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = (int16[i] ?? 0) / 32768;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);

      const now = ctx.currentTime;
      const startAt =
        nextPlayTimeRef.current > now ? nextPlayTimeRef.current : now + 0.015;

      if (gen !== playGenRef.current) return;

      const wasSilent = sourcesRef.current.length === 0;
      src.start(startAt);
      nextPlayTimeRef.current = startAt + buffer.duration;
      sourcesRef.current.push(src);
      agentHoldUntilRef.current = Date.now() + AGENT_TALK_HOLD_MS;
      setAgentTalking(true);
      if (wasSilent) {
        agentUtteranceAtRef.current = Date.now();
        bargeLoudFramesRef.current = 0;
      }
      src.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((s) => s !== src);
        agentHoldUntilRef.current = Date.now() + AGENT_TALK_HOLD_MS;
      };
    },
    [ensureAudio],
  );

  const { state, send } = useLiveSession("caller", {
    onAudio: (data) => {
      void playPcm24k(data, playGenRef.current);
    },
    onInterrupted: () => {
      clearPlayback();
      ignoreAgentUntilRef.current = 0;
    },
  });

  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const sendRef = useRef(send);
  sendRef.current = send;
  const clearPlaybackRef = useRef(clearPlayback);
  clearPlaybackRef.current = clearPlayback;
  const isAgentPlayingRef = useRef(isAgentPlaying);
  isAgentPlayingRef.current = isAgentPlaying;

  const startMic = useCallback(async () => {
    if (micActiveRef.current) return;
    try {
      setMicError(null);
      await ensureAudio();
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;
      await captureCtx.audioWorklet.addModule("/audio-worklet-pcm-capture.js");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;
      const source = captureCtx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(captureCtx, "pcm-capture");
      node.port.onmessage = (ev) => {
        if (mutedRef.current) {
          userRmsRef.current = 0;
          userRmsSmoothRef.current *= 0.85;
          speechGateFramesRef.current = 0;
          return;
        }
        const payload = ev.data as { pcm: ArrayBuffer; rms: number };
        const rms = payload.rms ?? 0;
        userRmsRef.current = rms;
        userRmsSmoothRef.current =
          userRmsSmoothRef.current * 0.65 + rms * 0.35;
        const ab = payload.pcm;
        const agentPlaying = isAgentPlayingRef.current();

        if (!agentPlaying) {
          noiseFloorRef.current =
            noiseFloorRef.current * 0.97 + Math.min(rms, 0.04) * 0.03;
          bargeLoudFramesRef.current = 0;

          const floor = Math.max(0.008, noiseFloorRef.current);
          const speechLike =
            rms >= SPEECH_GATE_RMS && rms >= floor + 0.028;
          if (speechLike) {
            speechGateFramesRef.current += 1;
            if (speechGateFramesRef.current >= SPEECH_GATE_FRAMES) {
              intentionalSpeechUntilRef.current = Date.now() + 800;
            }
          } else {
            speechGateFramesRef.current = 0;
          }

          // Don't stream room noise to Gemini — she waits forever on hiss
          if (speechGateFramesRef.current < SPEECH_GATE_FRAMES) {
            return;
          }
        } else {
          // Speaker echo must not look like the caller talking
          speechGateFramesRef.current = 0;
          const floor = Math.max(0.008, noiseFloorRef.current);
          const loudEnough =
            rms >= BARGE_IN_RMS_MIN && rms >= floor * BARGE_IN_NOISE_RATIO;
          const pastGrace =
            Date.now() - agentUtteranceAtRef.current >= BARGE_IN_GRACE_MS;

          if (loudEnough && pastGrace) {
            bargeLoudFramesRef.current += 1;
          } else {
            bargeLoudFramesRef.current = 0;
          }

          const barged =
            bargeLoudFramesRef.current >= BARGE_IN_FRAMES &&
            Date.now() - lastBargeAtRef.current > 800;

          if (barged) {
            lastBargeAtRef.current = Date.now();
            bargeLoudFramesRef.current = 0;
            intentionalSpeechUntilRef.current = Date.now() + 800;
            clearPlaybackRef.current();
            ignoreAgentUntilRef.current = Date.now() + 500;
            sendRef.current({ type: "barge_in" });
            // fall through — send this chunk so Gemini hears you
          } else {
            // Don't uplink noise while she talks (prevents false Gemini interrupt)
            return;
          }
        }

        const b64 = floatToBase64Pcm16(ab);
        sendRef.current({ type: "audio", data: b64 });
      };
      source.connect(node);
      const gain = captureCtx.createGain();
      gain.gain.value = 0;
      node.connect(gain);
      gain.connect(captureCtx.destination);
      workletNodeRef.current = node;
      micActiveRef.current = true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone permission denied";
      setMicError(message);
      micActiveRef.current = false;
    }
  }, [ensureAudio]);

  const stopMic = useCallback(() => {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    void captureCtxRef.current?.close();
    captureCtxRef.current = null;
    micActiveRef.current = false;
    userRmsRef.current = 0;
    userRmsSmoothRef.current = 0;
    speechGateFramesRef.current = 0;
    setUserTalking(false);
  }, []);

  useEffect(() => {
    // Preload worklet so the first Call is snappier
    void (async () => {
      try {
        const ctx = new AudioContext({ sampleRate: 16000 });
        await ctx.audioWorklet.addModule("/audio-worklet-pcm-capture.js");
        if (ctx.state !== "closed") {
          await ctx.close().catch(() => undefined);
        }
      } catch {
        /* ignore — startMic will retry */
      }
    })();
  }, []);

  const clearSilenceTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (hangupTimerRef.current) {
      clearTimeout(hangupTimerRef.current);
      hangupTimerRef.current = null;
    }
    silenceDeadlineRef.current = null;
  }, []);

  const resetSilenceWatch = useCallback(() => {
    clearSilenceTimers();
    silenceRepeatsRef.current = 0;
    heardAgentRef.current = false;
    endingForSilenceRef.current = false;
    speechGateFramesRef.current = 0;
    intentionalSpeechUntilRef.current = 0;
  }, [clearSilenceTimers]);

  const fireSilenceAction = useCallback(() => {
    if (endingForSilenceRef.current) return;
    if (isAgentPlayingRef.current()) return;

    if (silenceRepeatsRef.current < MAX_SILENCE_REPEATS) {
      silenceRepeatsRef.current += 1;
      const n = silenceRepeatsRef.current;
      sendRef.current({
        type: "nudge",
        text:
          n === 1
            ? 'Caller silent. Say exactly this vibe in Bangla/Banglish (one short line), then briefly repeat your last question and wait: "কিছু শুনতে পাচ্ছি না স্যার, আবার একটু বলবেন প্লিজ?" Do not add new topics.'
            : 'Still silent. Again say: "কিছু শুনতে পাচ্ছি না, আবার একটু বলবেন প্লিজ?" then repeat the same last question once, very briefly, and wait.',
      });
      return;
    }

    endingForSilenceRef.current = true;
    sendRef.current({
      type: "nudge",
      text: 'Caller never responded. Say a short goodbye like "ঠিক আছে স্যার, পরে কল করবেন, ধন্যবাদ" and stop. No more questions.',
    });
    hangupTimerRef.current = setTimeout(() => {
      hangupTimerRef.current = null;
      sendRef.current({ type: "hangup" });
      stopMic();
      clearPlayback();
    }, SILENCE_HANGUP_DELAY_MS);
  }, [stopMic, clearPlayback]);

  useEffect(() => {
    if (state.status === "connected" || state.status === "parked") {
      void startMic();
      if (!connectedAtRef.current) connectedAtRef.current = Date.now();
    }
    if (
      state.status === "ended" ||
      state.status === "idle" ||
      state.status === "error"
    ) {
      stopMic();
      clearPlayback();
      resetSilenceWatch();
      connectedAtRef.current = null;
      setElapsed(0);
      setAgentTalking(false);
      setUserTalking(false);
    }
  }, [state.status, startMic, stopMic, clearPlayback, resetSilenceWatch]);

  useEffect(() => {
    if (!(state.status === "connected" || state.status === "parked")) return;
    const id = setInterval(() => {
      if (connectedAtRef.current) {
        setElapsed(Math.floor((Date.now() - connectedAtRef.current) / 1000));
      }
      const now = Date.now();
      const agentActive =
        isAgentPlayingRef.current() || now < agentHoldUntilRef.current;
      setAgentTalking(agentActive);

      // Soft ripple only — does NOT drive silence / hangup
      const level = userRmsSmoothRef.current;
      const floor = Math.max(0.006, noiseFloorRef.current);
      const rippleSpeech =
        !mutedRef.current &&
        !agentActive &&
        level >= USER_TALK_RMS &&
        level >= floor + 0.012;
      if (rippleSpeech) {
        userHoldUntilRef.current = now + USER_TALK_HOLD_MS;
      }
      setUserTalking(
        (!agentActive && rippleSpeech) || now < userHoldUntilRef.current,
      );

      // Silence watchdog — only intentional speech (gated) resets the timer
      if (endingForSilenceRef.current) return;
      if (state.status !== "connected") return;

      if (agentActive) {
        heardAgentRef.current = true;
        silenceDeadlineRef.current = null;
        return;
      }

      const intentional = now < intentionalSpeechUntilRef.current;
      if (intentional) {
        silenceRepeatsRef.current = 0;
        silenceDeadlineRef.current = null;
        return;
      }

      if (!heardAgentRef.current) return;

      if (silenceDeadlineRef.current == null) {
        silenceDeadlineRef.current = now + USER_SILENCE_MS;
        return;
      }

      if (now >= silenceDeadlineRef.current) {
        silenceDeadlineRef.current = null;
        fireSilenceAction();
      }
    }, 100);
    return () => clearInterval(id);
  }, [state.status, fireSilenceAction]);

  useEffect(() => {
    return () => {
      stopMic();
      clearPlayback();
      clearSilenceTimers();
      void audioCtxRef.current?.close();
    };
  }, [stopMic, clearPlayback, clearSilenceTimers]);

  const phase: SoftphonePhase =
    state.status === "error"
      ? "error"
      : state.status === "ringing" || state.status === "connecting"
        ? "ringing"
        : state.status === "connected" || state.status === "parked"
          ? "connected"
          : state.status === "ended"
            ? "ended"
            : "idle";

  const onCall = async () => {
    await ensureAudio();
    clearPlayback();
    send({ type: "start_call" });
  };

  const onHangup = () => {
    send({ type: "hangup" });
    stopMic();
    clearPlayback();
  };

  const onToggleMute = () => {
    const next = !muted;
    setMuted(next);
    send({ type: "mute", muted: next });
    if (next) {
      userRmsRef.current = 0;
      userRmsSmoothRef.current = 0;
      userHoldUntilRef.current = 0;
      setUserTalking(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const latestCaption =
    captions &&
    [...state.transcript].reverse().find((l) => l.role === "nusrat")?.text;

  const talkMode: "idle" | "ring" | "listen" | "user" | "agent" =
    phase === "ringing"
      ? "ring"
      : phase === "connected"
        ? agentTalking
          ? "agent"
          : userTalking
            ? "user"
            : "listen"
        : "idle";

  const talkHint =
    talkMode === "agent"
      ? "Nusrat speaking…"
      : talkMode === "user"
        ? "You're speaking…"
        : talkMode === "listen"
          ? "Listening…"
          : talkMode === "ring"
            ? "Ringing…"
            : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
      <div className="w-full overflow-visible rounded-[2rem] border border-amber-border bg-gradient-to-b from-[#2a1218] to-[#1a0a0e] p-8 text-white shadow-xl">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-rose-200/70">
          Amber IT Helpline
        </p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-wide">
          09611-123123
        </h1>
        <p className="mt-2 text-center text-sm text-rose-100/70">
          {phase === "idle" && "Ready to call"}
          {phase === "ringing" && "Ringing… Nusrat will pick up"}
          {phase === "connected" &&
            (state.status === "parked"
              ? "Parked — waiting for human"
              : `Connected · ${formatTime(elapsed)}`)}
          {phase === "ended" && "Call ended"}
          {phase === "error" && "Call error"}
        </p>

        <div className="mt-8 flex justify-center py-4">
          <div className="relative flex h-40 w-40 items-center justify-center">
            {talkMode === "listen" && (
              <>
                <span className="talk-ripple talk-ripple-listen" />
                <span className="talk-ripple talk-ripple-listen talk-ripple-delay" />
              </>
            )}
            {(talkMode === "ring" || talkMode === "agent") && (
              <>
                <span className="talk-ripple talk-ripple-agent" />
                <span className="talk-ripple talk-ripple-agent talk-ripple-delay" />
                <span className="talk-ripple talk-ripple-agent talk-ripple-delay-2" />
              </>
            )}
            {talkMode === "user" && (
              <>
                <span className="talk-ripple talk-ripple-user" />
                <span className="talk-ripple talk-ripple-user talk-ripple-delay" />
                <span className="talk-ripple talk-ripple-user talk-ripple-delay-2" />
              </>
            )}
            <div
              className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-amber-red text-3xl font-bold ${
                talkMode === "ring" ? "ring-pulse" : ""
              } ${
                talkMode === "user"
                  ? "shadow-[0_0_32px_rgba(52,211,153,0.45)]"
                  : talkMode === "agent" || talkMode === "ring"
                    ? "shadow-[0_0_32px_rgba(232,58,82,0.45)]"
                    : talkMode === "listen"
                      ? "shadow-[0_0_22px_rgba(255,255,255,0.12)]"
                      : ""
              }`}
            >
              {phase === "connected" || phase === "ringing" ? "●" : "☎"}
            </div>
          </div>
        </div>

        {talkHint && (
          <p
            className={`text-center text-xs font-medium tracking-wide ${
              talkMode === "agent" || talkMode === "ring"
                ? "text-rose-200"
                : talkMode === "user"
                  ? "text-emerald-300"
                  : "text-rose-100/55"
            }`}
          >
            {talkHint}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          {phase === "idle" || phase === "ended" || phase === "error" ? (
            <button
              type="button"
              onClick={() => void onCall()}
              disabled={!state.connected}
              className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Call
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleMute}
                className={`rounded-full px-5 py-3 text-sm font-semibold ${
                  muted ? "bg-amber-500 text-black" : "bg-white/10 text-white"
                }`}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={onHangup}
                className="rounded-full bg-amber-red px-8 py-3 text-sm font-semibold text-white"
              >
                Hang up
              </button>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-rose-100/60">
          <span>
            Proxy:{" "}
            {state.connected ? (
              <span className="text-emerald-300">online</span>
            ) : (
              <span className="text-amber-300">connecting…</span>
            )}
          </span>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setCaptions((v) => !v)}
          >
            Captions {captions ? "on" : "off"}
          </button>
        </div>

        {captions && latestCaption && (
          <p className="mt-4 rounded-xl bg-black/30 p-3 text-center text-sm text-rose-50">
            {latestCaption}
          </p>
        )}
      </div>

      {!state.hasApiKey && state.connected && (
        <p className="rounded-xl border border-amber-border bg-white px-4 py-3 text-sm text-amber-muted">
          <span className="font-semibold text-amber-red">Missing API key.</span>{" "}
          Add <code className="text-amber-ink">GEMINI_API_KEY</code> to{" "}
          <code className="text-amber-ink">.env.local</code> and restart{" "}
          <code className="text-amber-ink">npm run dev</code>.
        </p>
      )}

      {micError && (
        <p className="rounded-xl border border-amber-border bg-white px-4 py-3 text-sm text-amber-red">
          Mic error: {micError}. Allow microphone access and try again.
        </p>
      )}

      {state.error && (
        <p className="rounded-xl border border-amber-border bg-white px-4 py-3 text-sm text-amber-red">
          {state.error}
        </p>
      )}

      <p className="text-center text-xs text-amber-muted">
        To interrupt: speak clearly for a moment while she talks. Headphones
        help.
      </p>
    </div>
  );
}
