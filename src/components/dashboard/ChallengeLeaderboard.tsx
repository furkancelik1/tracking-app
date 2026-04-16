"use client";

import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { getAvatarFrame } from "@/lib/level";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Trophy,
  Medal,
  Crown,
  Sparkles,
  Target,
  CheckCircle2,
} from "lucide-react";
import type {
  ChallengeLeaderboardEntry,
  ChallengeLeaderboardPayload,
} from "@/actions/challenge.actions";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PODIUM = [
  {
    ring: "ring-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/40",
    text: "text-yellow-400",
    icon: Crown,
    gradient: "from-yellow-400/20 via-amber-400/10 to-transparent",
  },
  {
    ring: "ring-zinc-300",
    bg: "bg-zinc-300/10",
    border: "border-zinc-300/30",
    text: "text-zinc-300",
    icon: Medal,
    gradient: "from-zinc-300/15 via-zinc-200/5 to-transparent",
  },
  {
    ring: "ring-amber-600",
    bg: "bg-amber-600/10",
    border: "border-amber-600/30",
    text: "text-amber-600",
    icon: Medal,
    gradient: "from-amber-600/15 via-amber-500/5 to-transparent",
  },
] as const;

// â”€â”€â”€ Framed Avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FramedAvatar({
  xp,
  src,
  fallback,
  className,
  ringOverride,
}: {
  xp: number;
  src?: string;
  fallback: string;
  className?: string;
  ringOverride?: string;
}) {
  const frame = getAvatarFrame(xp);
  const ringClass = ringOverride ?? frame.ring;

  return (
    <Avatar className={cn(ringClass, frame.glow, "transition-all", className)}>
      <AvatarImage src={src} alt={fallback} />
      <AvatarFallback className="font-semibold text-xs">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}

// â”€â”€â”€ Progress pill for a row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RateBar({
  rate,
  completed,
}: {
  rate: number;
  completed: boolean;
}) {
  const t = useTranslations("challengeLeaderboard");

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Progress
        value={rate}
        className={cn(
          "h-2 flex-1",
          completed
            ? "[&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-amber-500"
            : rate >= 75
              ? "[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-emerald-500"
              : rate >= 50
                ? "[&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-indigo-500"
                : "[&>div]:bg-gradient-to-r [&>div]:from-indigo-400 [&>div]:to-purple-500"
        )}
      />
      <span
        className={cn(
          "text-xs font-semibold tabular-nums w-10 text-right",
          completed ? "text-yellow-500" : "text-muted-foreground"
        )}
      >
        {completed ? (
          <CheckCircle2 className="size-4 text-yellow-500 inline" />
        ) : (
          `${rate}%`
        )}
      </span>
    </div>
  );
}

// â”€â”€â”€ Top 3 Podium â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChallengePodium({
  entries,
}: {
  entries: ChallengeLeaderboardEntry[];
}) {
  const t = useTranslations("challengeLeaderboard");
  const tc = useTranslations("common");

  // Visual order: 2nd | 1st | 3rd
  const order = [entries[1], entries[0], entries[2]].filter(
    Boolean
  ) as ChallengeLeaderboardEntry[];
  const heights = ["h-[200px]", "h-[240px]", "h-[180px]"];

  if (entries.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5 mb-6">
      {order.map((entry, i) => {
        const actualRank = entry.rank - 1;
        const style = PODIUM[actualRank];
        if (!style) return null;
        const Icon = style.icon;

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl p-3 border",
              "bg-gradient-to-b",
              style.gradient,
              style.border,
              entry.isCurrentUser && "ring-2 ring-indigo-500/50",
              heights[i]
            )}
          >
            {/* Medal */}
            <div className={cn("rounded-full p-1.5", style.bg)}>
              <Icon className={cn("size-4", style.text)} />
            </div>

            {/* Avatar */}
            <FramedAvatar
              xp={entry.xp}
              src={entry.image ?? undefined}
              fallback={getInitials(entry.name)}
              className={actualRank === 0 ? "size-14" : "size-11"}
              ringOverride={cn("ring-2", style.ring)}
            />

            {/* Name */}
            <p className="text-xs font-semibold truncate max-w-[90px] text-center">
              {entry.name ?? tc("anonymous")}
              {entry.isCurrentUser && (
                <span className="text-[10px] text-indigo-400 ml-1">
                  {tc("you")}
                </span>
              )}
            </p>

            <LevelBadge xp={entry.xp} compact />

            {/* Completion rate */}
            <Badge
              variant="secondary"
              className={cn(
                "tabular-nums text-xs",
                entry.challengeCompleted
                  ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                  : ""
              )}
            >
              {entry.challengeCompleted
                ? t("completed")
                : `${entry.completionRate}%`}
            </Badge>

            {/* Challenge title */}
            {entry.challengeTitle && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[90px] text-center">
                {entry.challengeTitle}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// â”€â”€â”€ Rank Rows (4â€“20) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChallengeRankTable({
  entries,
}: {
  entries: ChallengeLeaderboardEntry[];
}) {
  const tc = useTranslations("common");
  const t = useTranslations("challengeLeaderboard");

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03, duration: 0.3 }}
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors",
            entry.isCurrentUser
              ? "bg-indigo-500/10 border border-indigo-500/20"
              : "bg-card/50 hover:bg-card/80"
          )}
        >
          {/* Rank */}
          <span className="w-6 text-center text-sm font-bold tabular-nums text-muted-foreground">
            {entry.rank}
          </span>

          {/* Avatar */}
          <FramedAvatar
            xp={entry.xp}
            src={entry.image ?? undefined}
            fallback={getInitials(entry.name)}
            className="size-8"
          />

          {/* Name + Challenge */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {entry.name ?? tc("anonymous")}
              {entry.isCurrentUser && (
                <span className="text-xs text-indigo-400 ml-1">
                  {tc("you")}
                </span>
              )}
            </p>
            {entry.challengeTitle && (
              <p className="text-[11px] text-muted-foreground truncate">
                {entry.challengeTitle}
              </p>
            )}
          </div>

          {/* PRO Badge */}
          {entry.subscriptionTier === "PRO" && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5 shrink-0">
              <Sparkles className="size-2.5" /> PRO
            </Badge>
          )}

          <LevelBadge xp={entry.xp} compact />

          {/* Progress */}
          <RateBar rate={entry.completionRate} completed={entry.challengeCompleted} />
        </motion.div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Personal Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChallengePersonalPanel({
  entry,
  total,
}: {
  entry: ChallengeLeaderboardEntry;
  total: number;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("challengeLeaderboard");

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
          <p className="text-sm font-semibold truncate">
            {entry.name ?? tc("anonymous")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("among", { rank: entry.rank, total })}
          </p>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <RateBar rate={entry.completionRate} completed={entry.challengeCompleted} />
          {entry.challengeTitle && (
            <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
              {entry.challengeTitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// â”€â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChallengeLeaderboardEmpty() {
  const t = useTranslations("challengeLeaderboard");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
        <Target className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-lg font-semibold">{t("noEntries")}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {t("noEntriesSub")}
      </p>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  data: ChallengeLeaderboardPayload;
};

export function ChallengeLeaderboard({ data }: Props) {
  const t = useTranslations("challengeLeaderboard");
  const { entries, currentUser } = data;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-amber-500/15 to-yellow-500/15">
          <Trophy className="size-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Content */}
      {entries.length === 0 ? (
        <ChallengeLeaderboardEmpty />
      ) : (
        <>
          <ChallengePodium entries={entries.slice(0, 3)} />
          <ChallengeRankTable entries={entries.slice(3)} />
          {currentUser && (
            <ChallengePersonalPanel entry={currentUser} total={entries.length} />
          )}
        </>
      )}
    </section>
  );
}
