/**
 * xp-logic.ts
 *
 * Public API for XP / Level / Rank calculations.
 * All core logic lives in `./level.ts` â€” this file is the canonical import point
 * referenced throughout the app (routine actions, marketplace gating, UI components).
 */

import { calculateLevel } from "./level";

// â”€â”€â”€ Re-export level engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export {
  calculateLevel,
  didLevelUp,
  getAvatarFrame,
  type LevelInfo,
  type RankTitle,
  type AvatarFrameConfig,
} from "./level";

// â”€â”€â”€ XP & Coin reward constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** XP awarded for each routine completion. */
export const XP_PER_COMPLETION = 10;

/** Bonus XP when every active routine is completed in one day. */
export const XP_ALL_DONE_BONUS = 50;

/** Coins awarded per routine completion. */
export const COINS_PER_COMPLETION = 10;

/** Bonus coins for the "all done" achievement. */
export const COINS_ALL_DONE_BONUS = 50;

type FlexibleFrequencyType = "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function diffUtcDays(from: Date, to: Date): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function startOfUtcWeek(date: Date): Date {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function normalizeDaysOfWeek(daysOfWeek: number[]): number[] {
  return Array.from(new Set(daysOfWeek.filter((d) => d >= 0 && d <= 6))).sort(
    (a, b) => a - b
  );
}

function getPreviousScheduledDate(completedAt: Date, daysOfWeek: number[]): Date | null {
  const validDays = normalizeDaysOfWeek(daysOfWeek);
  if (validDays.length === 0) return null;
  const probe = startOfUtcDay(completedAt);
  probe.setUTCDate(probe.getUTCDate() - 1);
  for (let i = 0; i < 7; i++) {
    if (validDays.includes(probe.getUTCDay())) {
      return new Date(probe);
    }
    probe.setUTCDate(probe.getUTCDate() - 1);
  }
  return null;
}

export function calculateFlexibleStreak(input: {
  frequencyType: FlexibleFrequencyType;
  currentStreak: number;
  lastCompletedAt: Date | null;
  completedAt?: Date;
  daysOfWeek?: number[];
}): number {
  const completedAt = input.completedAt ?? new Date();
  const lastCompletedAt = input.lastCompletedAt;
  if (!lastCompletedAt) return 1;

  if (input.frequencyType === "WEEKLY") {
    const lastWeekStart = startOfUtcWeek(lastCompletedAt);
    const currentWeekStart = startOfUtcWeek(completedAt);
    const weekDiff = Math.floor(
      (currentWeekStart.getTime() - lastWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    if (weekDiff <= 0) return input.currentStreak;
    return weekDiff === 1 ? input.currentStreak + 1 : 1;
  }

  if (input.frequencyType === "SPECIFIC_DAYS") {
    const previousScheduled = getPreviousScheduledDate(completedAt, input.daysOfWeek ?? []);
    if (!previousScheduled) {
      const dayDiff = diffUtcDays(lastCompletedAt, completedAt);
      if (dayDiff <= 0) return input.currentStreak;
      return dayDiff === 1 ? input.currentStreak + 1 : 1;
    }
    if (dateKey(lastCompletedAt) === dateKey(previousScheduled)) {
      return input.currentStreak + 1;
    }
    if (dateKey(lastCompletedAt) === dateKey(completedAt)) {
      return input.currentStreak;
    }
    return 1;
  }

  const dayDiff = diffUtcDays(lastCompletedAt, completedAt);
  if (dayDiff <= 0) return input.currentStreak;
  return dayDiff === 1 ? input.currentStreak + 1 : 1;
}

// â”€â”€â”€ Marketplace level gate helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Returns true if the user's current XP satisfies the item's minimum level
 * requirement. Items with minLevel === 0 are always unlocked.
 */
export function meetsLevelRequirement(userXp: number, itemMinLevel: number): boolean {
  if (itemMinLevel <= 0) return true;
  const { level } = calculateLevel(userXp);
  return level >= itemMinLevel;
}
