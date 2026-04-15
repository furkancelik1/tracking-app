/**
 * xp-logic.ts
 *
 * Public API for XP / Level / Rank calculations.
 * All core logic lives in `./level.ts` — this file is the canonical import point
 * referenced throughout the app (routine actions, marketplace gating, UI components).
 */

// ─── Re-export level engine ──────────────────────────────────────────────────

export {
  calculateLevel,
  didLevelUp,
  getAvatarFrame,
  type LevelInfo,
  type RankTitle,
  type AvatarFrameConfig,
} from "./level";

// ─── XP & Coin reward constants ──────────────────────────────────────────────

/** XP awarded for each routine completion. */
export const XP_PER_COMPLETION = 10;

/** Bonus XP when every active routine is completed in one day. */
export const XP_ALL_DONE_BONUS = 50;

/** Coins awarded per routine completion. */
export const COINS_PER_COMPLETION = 10;

/** Bonus coins for the "all done" achievement. */
export const COINS_ALL_DONE_BONUS = 50;

// ─── Marketplace level gate helper ──────────────────────────────────────────

/**
 * Returns true if the user's current XP satisfies the item's minimum level
 * requirement. Items with minLevel === 0 are always unlocked.
 */
export function meetsLevelRequirement(userXp: number, itemMinLevel: number): boolean {
  if (itemMinLevel <= 0) return true;
  const { level } = calculateLevel(userXp);
  return level >= itemMinLevel;
}
