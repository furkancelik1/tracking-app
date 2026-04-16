export type LeagueTier = "BRONZE" | "SILVER" | "GOLD";

type LeagueDefinition = {
  tier: LeagueTier;
  minXp: number;
  maxXp: number | null;
  label: string;
  badgeClassName: string;
};

const LEAGUE_TABLE: LeagueDefinition[] = [
  {
    tier: "BRONZE",
    minXp: 0,
    maxXp: 1499,
    label: "Bronz",
    badgeClassName: "border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-300",
  },
  {
    tier: "SILVER",
    minXp: 1500,
    maxXp: 4999,
    label: "Gümüş",
    badgeClassName: "border-zinc-400/40 bg-zinc-400/10 text-zinc-700 dark:text-zinc-200",
  },
  {
    tier: "GOLD",
    minXp: 5000,
    maxXp: null,
    label: "Altın",
    badgeClassName: "border-yellow-400/50 bg-yellow-400/15 text-yellow-700 dark:text-yellow-300",
  },
];

export function getLeagueByXp(xp: number): LeagueDefinition {
  return (
    LEAGUE_TABLE.find((league) => {
      if (xp < league.minXp) return false;
      if (league.maxXp === null) return true;
      return xp <= league.maxXp;
    }) ?? LEAGUE_TABLE[0]!
  );
}
