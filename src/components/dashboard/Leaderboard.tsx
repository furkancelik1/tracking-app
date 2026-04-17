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
  { ring: "ring-[#D6FF00]", bg: "bg-[#D6FF00]/15", text: "text-[#D6FF00]", icon: Crown },
  { ring: "ring-zinc-300", bg: "bg-zinc-300/10", text: "text-zinc-300", icon: Medal },
  { ring: "ring-zinc-600", bg: "bg-zinc-600/10", text: "text-zinc-500", icon: Medal },
] as const;

const proBadgeClass =
  "border border-[#D6FF00]/35 bg-[#D6FF00]/12 text-[#D6FF00] shadow-[inset_0_0_0_1px_rgba(214,255,0,0.08)]";

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
                <span className="ml-1 text-xs text-[#D6FF00]">{t("you")}</span>
              )}
            </p>
            {entry.subscriptionTier === "PRO" && (
              <Badge className={`${proBadgeClass} gap-0.5 px-1.5 py-0 text-[10px]`}>
                <Sparkles className="size-2.5" aria-hidden /> PRO
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
              <span className="flex items-center gap-0.5 text-[11px] text-[#D6FF00]">
                <Flame className="size-3" aria-hidden /> {entry.currentStreak}
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
              ? "border border-[#D6FF00]/25 bg-[#D6FF00]/5"
              : entry.subscriptionTier === "PRO"
                ? "border border-[#D6FF00]/15 bg-black/20 hover:bg-white/[0.03]"
                : "border border-transparent bg-black/20 hover:bg-white/[0.03]"
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
                <span className="ml-1 text-xs text-[#D6FF00]">{t("you")}</span>
              )}
            </p>
          </div>
          {entry.subscriptionTier === "PRO" && (
            <Badge className={`${proBadgeClass} shrink-0 gap-0.5 px-1.5 py-0 text-[10px]`}>
              <Sparkles className="size-2.5" aria-hidden /> PRO
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
            <span className="flex shrink-0 items-center gap-0.5 text-xs text-[#D6FF00]">
              <Flame className="size-3" aria-hidden /> {entry.currentStreak}
            </span>
          )}
          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#D6FF00]">
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
    <Card className="mt-6 border border-[#D6FF00]/25 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <CardContent className="flex items-center gap-4 py-4">
        <span className="text-lg font-black tabular-nums text-[#D6FF00]">#{entry.rank}</span>
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
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-[#D6FF00]">{formatXp(entry.xp)} XP</p>
          {entry.currentStreak > 0 && (
            <span className="flex items-center justify-end gap-0.5 text-xs text-[#D6FF00]">
              <Flame className="size-3" aria-hidden /> {t("dayStreak", { count: entry.currentStreak })}
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
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D6FF00]/20 bg-[#D6FF00]/10">
        <Trophy className="h-8 w-8 text-[#D6FF00]" aria-hidden />
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
  const challengeProgress = challengeData
    ? Math.max(0, Math.min(100, (challengeData.weekCompletions / challengeData.target) * 100))
    : 0;

  return (
    <div>
      {/* Tab Switcher */}
      {isLoggedIn && (
        <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => handleTabChange("global")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm",
              tab === "global"
                ? "bg-[#D6FF00] text-black shadow-[0_0_20px_rgba(214,255,0,0.2)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            <Globe className="size-4 shrink-0" aria-hidden />
            {tabLabels.global}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("league")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm",
              tab === "league"
                ? "bg-[#D6FF00] text-black shadow-[0_0_20px_rgba(214,255,0,0.2)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            <Shield className="size-4 shrink-0" aria-hidden />
            {tabLabels.league}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("challenges")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm",
              tab === "challenges"
                ? "bg-[#D6FF00] text-black shadow-[0_0_20px_rgba(214,255,0,0.2)]"
                : "text-zinc-500 hover:text-white"
            )}
          >
            <Zap className="size-4 shrink-0" aria-hidden />
            {tabLabels.challenges}
          </button>
        </div>
      )}

      {/* Loading */}
      {isPending && tab !== "challenges" && (
        <div className="flex justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-[#D6FF00]/30 border-t-[#D6FF00]" />
        </div>
      )}
      {isPending && tab === "challenges" && !challengeData && (
        <div className="flex justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-[#D6FF00] border-t-transparent" />
        </div>
      )}

      {/* Global community challenge */}
      {!isPending && tab === "challenges" && challengeData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-black p-6 sm:p-7 space-y-5"
        >
          <div className="absolute -top-20 -right-10 size-64 rounded-full bg-[#D6FF00]/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 size-64 rounded-full bg-[#D6FF00]/5 blur-3xl" />

          <div className="relative z-10 flex items-center gap-2">
            <Trophy className="size-6 text-[#D6FF00]" />
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#D6FF00]">
              {t("globalChallengeTitle")}
            </h3>
          </div>
          <p className="relative z-10 text-sm text-zinc-300">{t("globalChallengeSubtitle")}</p>

          <motion.p
            key={challengeData.weekCompletions}
            initial={{ scale: 0.92, opacity: 0.7 }}
            animate={{ scale: [1, 1.09, 1], opacity: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative z-10 text-right text-2xl sm:text-3xl font-black tracking-tight text-[#D6FF00] tabular-nums"
          >
            {challengeData.weekCompletions.toLocaleString()} / {challengeData.target.toLocaleString()}
          </motion.p>

          <div className="relative z-10 h-5 w-full rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-[#D6FF00]"
              animate={{ width: `${challengeProgress}%` }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              style={{
                boxShadow: "0 0 16px rgba(214,255,0,0.8), 0 0 34px rgba(214,255,0,0.45)",
              }}
            />
          </div>

          <p className="relative z-10 text-sm font-semibold text-zinc-300">
            {t("globalChallengeProgress", {
              current: challengeData.weekCompletions,
              target: challengeData.target,
            })}
          </p>
        </motion.div>
      )}

      {/* Rankings */}
      {!isPending && tab !== "challenges" && topTen.length === 0 ? (
        tab === "league" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="mb-4 size-10 text-[#D6FF00]/35" aria-hidden />
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
