"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "zen-sound-enabled";

type ThemeTone = {
  frequency: number;
  type: OscillatorType;
  duration: number;
  fadeIn?: number;
};

const THEME_TONES: Record<string, ThemeTone> = {
  "Zen Mode Focus":  { frequency: 330, type: "sine",     duration: 500, fadeIn: 80 },
  "Forest Silence":  { frequency: 330, type: "sine",     duration: 500, fadeIn: 80 },
  "Neon Purple":     { frequency: 880, type: "triangle", duration: 250 },
  "Prestige Gold":   { frequency: 880, type: "triangle", duration: 250 },
  "Ember Overdrive": { frequency: 220, type: "sawtooth", duration: 200 },
  "Arctic Focus":    { frequency: 660, type: "sine",     duration: 350 },
};
const DEFAULT_TONE: ThemeTone = { frequency: 440, type: "sine", duration: 300 };

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

function getTone(): ThemeTone {
  if (typeof document === "undefined") return DEFAULT_TONE;
  const name = document.documentElement.getAttribute("data-theme-name");
  return (name && THEME_TONES[name]) || DEFAULT_TONE;
}

export function useSoundEffect() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;

    const warm = () => {
      if (!ctxRef.current) ctxRef.current = new Ctor();
      if (ctxRef.current.state === "suspended") {
        void ctxRef.current.resume();
      }
    };

    window.addEventListener("pointerdown", warm, { capture: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", warm, { capture: true });
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  const playComplete = useCallback(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "false") return;

    const Ctor = getAudioContextCtor();
    if (!Ctor) return;

    try {
      if (!ctxRef.current) ctxRef.current = new Ctor();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();

      const tone = getTone();
      const now = ctx.currentTime;
      const durationSec = tone.duration / 1000;
      const fadeInSec = (tone.fadeIn ?? 20) / 1000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.frequency, now);
      osc.frequency.exponentialRampToValueAtTime(
        tone.frequency * 0.96,
        now + durationSec
      );

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + fadeInSec);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // AudioContext may be blocked by browser policy
    }
  }, []);

  return { playComplete };
}
