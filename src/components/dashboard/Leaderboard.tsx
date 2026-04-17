"use client";

import React from "react";
import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardPayload } from "@/actions/leaderboard.actions";
import { Trophy, Medal, Flame, Crown, Sparkles, Globe, Shield, Zap } from "lucide-react";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { getAvatarFrame } from "@/lib/level";
import { getUserLeague } from "@/lib/level";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { getLeagueLeaderboard, getGlobalCommunityChallengeAction } from "@/actions/leaderboard.actions";

// â”€â”€â”€ Podium renkleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PODIUM = [
  { ring: "ring-yellow-400", bg: "bg-yellow-400/10", text: "text-yellow-400", icon: Crown, label: "AltÄ±n" },
  { ring: "ring-zinc-300", bg: "bg-zinc-300/10", text: "text-zinc-300", icon: Medal, label: "GÃ¼mÃ¼ÅŸ" },
  { ring: "ring-amber-600", bg: "bg-amber-600/10", text: "text-amber-600", icon: Medal, label: "Bronz" },
] as const;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return String(xp);
}

// â”€â”€â”€ Seviye BazlÄ± Avatar Ã‡erÃ§evesi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FramedAvatar({
  xp,
  src,
  fallback,
  className,
  fallbackClassName,
  ringOverride,
}: {
  xp: number;
  src?: string;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
  /** Podium gibi Ã¶zel ring sÄ±nÄ±fÄ± kullanmak iÃ§in */
  ringOverride?: string;
}) {
  const frame = getAvatarFrame(xp);
  const ringClass = ringOverride ?? frame.ring;

  const avatar = (
    <Avatar
      className={cn(
        ringClass,
        frame.glow,
        "transition-all",
        className
      )}
    >
      <AvatarImage src={src} alt={fallback} />
      <AvatarFallback className={cn("font-semibold", fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );

  if (frame.isLegend) {
    return (
      <motion.div
        className="inline-flex rounded-full"
        animate={{
          boxShadow: [
            "0 0 6px 2px rgba(239,68,68,0.15)",
            "0 0 24px 8px rgba(239,68,68,0.45)",
            "0 0 6px 2px rgba(239,68,68,0.15)",
          ],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {avatar}
      </motion.div>
    );
  }

  return avatar;
}

// â”€â”€â”€ Podium BileÅŸeni (Top 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useTranslations("common");
  // SÄ±ralama: 2. | 1. | 3. (gÃ¶rsel podyum dÃ¼zeni)
  const order = [entries[1], entries[0], entries[2]].filter(Boolean) as LeaderboardEntry[];
  const heights = ["h-28", "h-36", "h-24"];

  if (entries.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8">
      {order.map((entry, i) => {
        const actualRank = entry.rank - 1; // 0-indexed
        const style = PODIUM[actualRank];
        if (!style) return null;
        const Icon = style.icon;

        return (
          <div
            key={entry.id}
            className={cn("flex flex-col items-center gap-2", heights[i])}
          >
            <div className="relative">
              <FramedAvatar
                xp={entry.xp}
                src={entry.image ?? undefined}
                fallback={getInitials(entry.name)}
                className={actualRank === 0 ? "size-16 sm:size-20" : "size-12 sm:size-16"}
                fallbackClassName="text-sm"
                ringOverride={cn("ring-2", style.ring)}
              />
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 rounded-full p-1",
                  style.bg
                )}
              >
                <Icon className={cn("size-3.5", style.text)} />
              </span>
            </div>
            <p className="text-sm font-semibold truncate max-w-[80px] sm:max-w-[120px] text-center">
              {entry.name ?? t("anonymous")}
              {entry.isCurrentUser && (
                <span className="text-xs text-indigo-400 ml-1">{t("you")}</span>
              )}
            </p>
            {entry.subscriptionTier === "PRO" && (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5">
                <Sparkles className="size-2.5" /> PRO
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn("tabular-nums text-xs", style.text)}
            >
              {formatXp(entry.xp)} XP
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-[10px]", getUserLeague(entry.xp).badgeClassName)}
            >
              {getUserLeague(entry.xp).icon} {getUserLeague(entry.xp).label}
            </Badge>
            <LevelBadge xp={entry.xp} compact />
            {entry.currentStreak > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-orange-400">
                <Flame className="size-3" /> {entry.currentStreak}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// â”€â”€â”€ SÄ±ralama Tablosu (4â€“10) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RankTable({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useTranslations("common");
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors",
            entry.isCurrentUser
              ? "bg-indigo-500/10 border border-indigo-500/20"
              : entry.subscriptionTier === "PRO"
                ? "bg-card/50 hover:bg-card/80 border border-amber-400/30"
                : "bg-card/50 hover:bg-card/80"
          )}
        >
          <span className="w-6 text-center text-sm font-bold tabular-nums text-muted-foreground">
            {entry.rank}
          </span>
          <FramedAvatar
            xp={entry.xp}
            src={entry.image ?? undefined}
            fallback={getInitials(entry.name)}
            className="size-8"
            fallbackClassName="text-xs"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {entry.name ?? t("anonymous")}
              {entry.isCurrentUser && (
                <span className="text-xs text-indigo-400 ml-1">{t("you")}</span>
              )}
            </p>
          </div>
          {entry.subscriptionTier === "PRO" && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
              <Sparkles className="size-2.5" /> PRO
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-[10px] shrink-0", getUserLeague(entry.xp).badgeClassName)}
          >
            {getUserLeague(entry.xp).icon} {getUserLeague(entry.xp).label}
          </Badge>
          <LevelBadge xp={entry.xp} compact />
          {entry.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0">
              <Flame className="size-3" /> {entry.currentStreak}
            </span>
          )}
          <span className="text-sm font-semibold tabular-nums text-indigo-400 shrink-0">
            {formatXp(entry.xp)} XP
          </span>
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ KiÅŸisel Panel (altta sabit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PersonalPanel({ entry, totalUsers }: { entry: LeaderboardEntry; totalUsers: number }) {
  const t = useTranslations("common");
  const tLb = useTranslations("leaderboard");
  const league = getUserLeague(entry.xp);
  return (
    <Card className="border-indigo-500/30 bg-indigo-500/5 mt-6">
      <CardContent className="flex items-center gap-4 py-4">
        <span className="text-lg font-bold tabular-nums text-indigo-400">
          #{entry.rank}
        </span>
        <FramedAvatar
          xp={entry.xp}
          src={entry.image ?? undefined}
          fallback={getInitials(entry.name)}
          className="size-10"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.name ?? t("anonymous")}</p>
          <p className="text-xs text-muted-foreground">
            {tLb("usersAmong", { rank: entry.rank, total: totalUsers })}
          </p>
          <Badge variant="outline" className={cn("mt-1 text-[10px]", league.badgeClassName)}>
            {league.icon} {league.label} Lig
          </Badge>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums text-indigo-400">
            {formatXp(entry.xp)} XP
          </p>
          {entry.currentStreak > 0 && (
            <span className="flex items-center justify-end gap-0.5 text-xs text-orange-400">
              <Flame className="size-3" /> {t("dayStreak", { count: entry.currentStreak })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// â”€â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LeaderboardEmpty() {
  const t = useTranslations("leaderboard");
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
        <Trophy className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {t("emptyDescription")}
      </p>
    </div>
  );
}

// â”€â”€â”€ Ana BileÅŸen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  data: LeaderboardPayload;
  isLoggedIn?: boolean;
};

export function Leaderboard({ data, isLoggedIn = false }: Props) {
  const t = useTranslations("leaderboard");
  const [tab, setTab] = useState<"global" | "league" | "challenges">("global");
  const [leagueData, setLeagueData] = useState<LeaderboardPayload | null>(null);
  const [challengeData, setChallengeData] = useState<Awaited<
    ReturnType<typeof getGlobalCommunityChallengeAction>
  > | null>(null);
  const [isPending, startTransition] = useTransition();
  const tabLabels = React.useMemo(
    () => ({
      global: t("tabs.global"),
      league: t("tabs.league"),
      challenges: t("tabs.challenges"),
    }),
    [t]
  );

  const handleTabChange = (newTab: "global" | "league" | "challenges") => {
    setTab(newTab);
    if (newTab === "league" && !leagueData) {
      startTransition(async () => {
        try {
          const result = await getLeagueLeaderboard();
          setLeagueData(result);
        } catch {
          setLeagueData({ topTen: [], currentUser: null, totalUsers: 0 });
        }
      });
    }
    if (newTab === "challenges" && !challengeData) {
      startTransition(async () => {
        try {
          const c = await getGlobalCommunityChallengeAction();
          setChallengeData(c);
        } catch {
          setChallengeData({
            target: 10_000,
            weekCompletions: 0,
            weekStart: new Date().toISOString(),
            weekEnd: new Date().toISOString(),
          });
        }
      });
    }
  };

  const activeData = tab === "global" ? data : tab === "league" ? leagueData ?? data : data;
  const { topTen, currentUser, totalUsers } = activeData;

  return (
    <div>
      {/* Tab Switcher */}
      {isLoggedIn && (
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 mb-6">
          <button
            onClick={() => handleTabChange("global")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === "global"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="size-4" />
            {tabLabels.global}
          </button>
          <button
            onClick={() => handleTabChange("league")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === "league"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className="size-4" />
            {tabLabels.league}
          </button>
          <button
            onClick={() => handleTabChange("challenges")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === "challenges"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="size-4" />
            {tabLabels.challenges}
          </button>
        </div>
      )}

      {/* Loading */}
      {isPending && tab !== "challenges" && (
        <div className="flex justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {isPending && tab === "challenges" && !challengeData && (
        <div className="flex justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-[#D6FF00] border-t-transparent" />
        </div>
      )}

      {/* Global community challenge */}
      {!isPending && tab === "challenges" && challengeData && (
        <div className="rounded-2xl border border-[#D6FF00]/25 bg-black p-6 space-y-4 shadow-[0_0_40px_rgba(214,255,0,0.08)]">
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-[#D6FF00]" />
            <h3 className="text-lg font-black uppercase tracking-tight text-[#D6FF00]">
              {t("globalChallengeTitle")}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("globalChallengeSubtitle")}</p>
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#D6FF00] transition-all duration-500"
              style={{
                width: `${Math.min(100, (challengeData.weekCompletions / challengeData.target) * 100)}%`,
              }}
            />
          </div>
          <p className="text-sm font-bold tabular-nums text-white">
            {t("globalChallengeProgress", {
              current: challengeData.weekCompletions,
              target: challengeData.target,
            })}
          </p>
        </div>
      )}

      {/* Rankings */}
      {!isPending && tab !== "challenges" && topTen.length === 0 ? (
        tab === "league" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="size-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">{t("leagueEmpty")}</p>
          </div>
        ) : (
          <LeaderboardEmpty />
        )
      ) : !isPending && tab !== "challenges" ? (
        <>
          <Podium entries={topTen.slice(0, 3)} />
          <RankTable entries={topTen.slice(3)} />
          {currentUser && <PersonalPanel entry={currentUser} totalUsers={totalUsers} />}
        </>
      ) : null}
    </div>
  );
}
