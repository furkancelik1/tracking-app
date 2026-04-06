import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  addSeconds,
  startOfTomorrow,
  formatDuration,
  intervalToDuration,
} from "date-fns";
import type { ResetType } from "@prisma/client";

// ─── Shadcn default ──────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Timer Utilities ─────────────────────────────────────────────────────────

/**
 * Computes nextResetAt for a BasketItem on activation.
 * ROLLING: now + card.duration seconds
 * FIXED:   start of next calendar day (00:00:00 local time)
 */
export function computeNextResetAt(
  resetType: ResetType,
  durationSeconds: number
): Date {
  if (resetType === "ROLLING") {
    return addSeconds(new Date(), durationSeconds);
  }
  return startOfTomorrow();
}

/**
 * Returns true if the timer has expired and the item should revert to PENDING.
 */
export function isTimerExpired(
  nextResetAt: Date | null | undefined
): boolean {
  if (!nextResetAt) return false;
  return new Date() > new Date(nextResetAt);
}

/**
 * Returns a human-readable countdown string from now until the reset time.
 * Returns "Expired" if the date is in the past.
 */
export function formatCountdown(
  nextResetAt: Date | null | undefined
): string {
  if (!nextResetAt) return "—";
  const target = new Date(nextResetAt);
  const now = new Date();
  if (now >= target) return "Expired";

  const duration = intervalToDuration({ start: now, end: target });
  return formatDuration(duration, {
    format: ["hours", "minutes", "seconds"],
    zero: false,
    delimiter: " ",
  });
}

/**
 * Formats a duration in seconds for catalogue display (e.g. "2h 30m").
 */
export function formatCardDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
