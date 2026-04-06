"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type TimerState = {
  secondsLeft: number;
  isExpired: boolean;
  formatted: string; // "2h 15m 30s"
  progress: number;  // 0–1, percentage elapsed (for progress bars)
};

type UseTimerOptions = {
  nextResetAt: Date | string | null | undefined;
  totalDuration?: number; // seconds — used to calculate progress
  onExpire?: () => void;
};

/**
 * Client-side countdown timer. Ticks every second.
 * Calls `onExpire` exactly once when the timer reaches 0.
 *
 * @param nextResetAt - The target reset timestamp
 * @param totalDuration - Total duration in seconds (for progress bar calculation)
 * @param onExpire - Callback fired once when the timer expires
 */
export function useTimer({
  nextResetAt,
  totalDuration,
  onExpire,
}: UseTimerOptions): TimerState {
  const expireFiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const computeState = useCallback((): TimerState => {
    if (!nextResetAt) {
      return { secondsLeft: 0, isExpired: false, formatted: "—", progress: 0 };
    }

    const target = new Date(nextResetAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));

    return {
      secondsLeft: diff,
      isExpired: diff === 0 && now >= target,
      formatted: formatSeconds(diff),
      progress:
        totalDuration != null && totalDuration > 0
          ? Math.min(1, 1 - diff / totalDuration)
          : 0,
    };
  }, [nextResetAt, totalDuration]);

  const [state, setState] = useState<TimerState>(computeState);

  useEffect(() => {
    // Reset the expiry flag when the target changes
    expireFiredRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(computeState());

    if (!nextResetAt) return;

    const tick = () => {
      const next = computeState();
      setState(next);

      if (next.isExpired && !expireFiredRef.current) {
        expireFiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextResetAt, computeState]);

  return state;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(total: number): string {
  if (total <= 0) return "0s";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
