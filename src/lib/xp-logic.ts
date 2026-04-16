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
