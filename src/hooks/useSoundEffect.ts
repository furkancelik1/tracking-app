"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "zen-sound-enabled";

type ThemeTone = {
  frequency: number;
  type: OscillatorType;
  duration: number; // ms
  fadeIn?: number;  // ms
};

const THEME_TONES: Record<string, ThemeTone> = {
  "Zen Mode Focus":   { frequency: 330, type: "sine",     duration: 500, fadeIn: 80 },
  "Forest Silence":   { frequency: 330, type: "sine",     duration: 500, fadeIn: 80 },
  "Neon Purple":      { frequency: 880, type: "triangle", duration: 250 },
  "Prestige Gold":    { frequency: 880, type: "triangle", duration: 250 },
  "Ember Overdrive":  { frequency: 220, type: "sawtooth", duration: 200 },
  "Arctic Focus":     { frequency: 660, type: "sine",     duration: 350 },
  default:            { frequency: 440, type: "sine",     duration: 300 },
};
const DEFAULT_TONE: ThemeTone = { frequency: 440, type: "sine", duration: 300 };

function getThemeName(): string {
  if (typeof document === "undefined") return "default";
  return document.documentElement.getAttribute("data-theme-name") ?? "default";
}

function getTone(): ThemeTone {
  const name = getThemeName();
  return THEME_TONES[name] ?? DEFAULT_TONE;
}

export function useSoundEffect() {
  const ctxRef = useRef<AudioContext | null>(null);

  // Pre-warm AudioContext on first user gesture
  useEffect(() => {
    function warm() {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      // Resume if suspended (browser autoplay policy)
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume();
      }
      window.removeEventListener("pointerdown", warm, { capture: true });
    }
    window.addEventListener("pointerdown", warm, { capture: true, once: true });
    return () => window.removeEventListener("pointerdown", warm, { capture: true });
  }, []);

  const playComplete = useCallback(() => {
    if (typeof window === "undefined") return;

    const enabled = localStorage.getItem(STORAGE_KEY);
    // Default ON if key doesn't exist
    if (enabled === "false") return;

    try {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const tone = getTone();
      const now = ctx.currentTime;
      const durationSec = tone.duration / 1000;
      const fadeInSec = (tone.fadeIn ?? 20) / 1000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.frequency, now);

      // Gentle pitch micro-fall for organic feel
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
      // AudioContext may be blocked; fail silently.
    }
  }, []);

  return { playComplete };
}
