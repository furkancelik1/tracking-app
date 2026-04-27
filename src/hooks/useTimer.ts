"use client";

import { useState, useEffect, useRef } from "react";

type TimerState = {
  secondsLeft: number;
  isExpired: boolean;
  formatted: string;
  progress: number;
};

type UseTimerOptions = {
  nextResetAt: Date | string | null | undefined;
  totalDuration?: number;
  onExpire?: () => void;
};

const EMPTY_STATE: TimerState = {
  secondsLeft: 0,
  isExpired: false,
  formatted: "—",
  progress: 0,
};

function compute(
  nextResetAt: Date | string | null | undefined,
  totalDuration: number | undefined
): TimerState {
  if (!nextResetAt) return EMPTY_STATE;

  const target = new Date(nextResetAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((target - now) / 1000));

  return {
    secondsLeft: diff,
    isExpired: diff === 0 && now >= target,
    formatted: formatSeconds(diff),
    progress:
      totalDuration && totalDuration > 0
        ? Math.min(1, 1 - diff / totalDuration)
        : 0,
  };
}

export function useTimer({
  nextResetAt,
  totalDuration,
  onExpire,
}: UseTimerOptions): TimerState {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [state, setState] = useState<TimerState>(() =>
    compute(nextResetAt, totalDuration)
  );

  useEffect(() => {
    if (!nextResetAt) {
      setState(EMPTY_STATE);
      return;
    }

    let fired = false;
    const tick = () => {
      const next = compute(nextResetAt, totalDuration);
      setState(next);
      if (next.isExpired && !fired) {
        fired = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextResetAt, totalDuration]);

  return state;
}

function formatSeconds(total: number): string {
  if (total <= 0) return "0s";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
