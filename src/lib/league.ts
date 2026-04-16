import { getUserLeague, type UserLeagueTier } from "./level";

export type LeagueTier = UserLeagueTier;

export function getLeagueByXp(xp: number) {
  return getUserLeague(xp);
}
