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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const proBadgeClass =
  "border border-[#D6FF00]/35 bg-[#D6FF00]/12 text-[#D6FF00] shadow-[inset_0_0_0_1px_rgba(214,255,0,0.08)]";

const PODIUM = [
  {
    ring: "ring-[#D6FF00]",
    bg: "bg-[#D6FF00]/15",
    border: "border-[#D6FF00]/40",
    text: "text-[#D6FF00]",
    icon: Crown,
    gradient: "from-[#D6FF00]/20 via-zinc-950/80 to-transparent",
  },
  {
    ring: "ring-zinc-300",
    bg: "bg-zinc-300/10",
    border: "border-zinc-300/30",
    text: "text-zinc-300",
    icon: Medal,
    gradient: "from-zinc-300/15 via-zinc-900/50 to-transparent",
  },
  {
    ring: "ring-zinc-600",
    bg: "bg-zinc-600/10",
    border: "border-zinc-600/30",
    text: "text-zinc-500",
    icon: Medal,
    gradient: "from-zinc-700/20 via-zinc-950/80 to-transparent",
  },
] as const;

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
      <AvatarFallback className="text-xs font-semibold">{fallback}</AvatarFallback>
    </Avatar>
  );
}

function RateBar({
  rate,
  completed,
}: {
  rate: number;
  completed: boolean;
}) {
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <Progress
        value={rate}
        className={cn(
          "h-2 flex-1 bg-zinc-900",
          completed
            ? "[&>div]:bg-[#D6FF00]"
            : rate >= 75
              ? "[&>div]:bg-[#D6FF00]"
              : rate >= 50
                ? "[&>div]:bg-[#D6FF00]/60"
                : "[&>div]:bg-zinc-600"
        )}
      />
      <span
        className={cn(
          "w-10 text-right text-xs font-semibold tabular-nums",
          completed ? "text-[#D6FF00]" : "text-zinc-500"
        )}
      >
        {completed ? (
          <CheckCircle2 className="inline size-4 text-[#D6FF00]" aria-hidden />
        ) : (
          `${rate}%`
        )}
      </span>
    </div>
  );
}

function ChallengePodium({
  entries,
}: {
  entries: ChallengeLeaderboardEntry[];
}) {
  const t = useTranslations("challengeLeaderboard");
  const tc = useTranslations("common");

  const order = [entries[1], entries[0], entries[2]].filter(
    Boolean
  ) as ChallengeLeaderboardEntry[];
  const heights = ["h-[200px]", "h-[240px]", "h-[180px]"];

  if (entries.length === 0) return null;

  return (
    <div className="mb-6 flex items-end justify-center gap-3 sm:gap-5">
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
              "flex flex-col items-center gap-2 rounded-xl border bg-gradient-to-b p-3",
              style.gradient,
              style.border,
              entry.isCurrentUser && "ring-2 ring-[#D6FF00]/45",
              heights[i]
            )}
          >
            <div className={cn("rounded-full p-1.5", style.bg)}>
              <Icon className={cn("size-4", style.text)} aria-hidden />
            </div>

            <FramedAvatar
              xp={entry.xp}
              src={entry.image ?? undefined}
              fallback={getInitials(entry.name)}
              className={actualRank === 0 ? "size-14" : "size-11"}
              ringOverride={cn("ring-2", style.ring)}
            />

            <p className="max-w-[90px] truncate text-center text-xs font-semibold text-white">
              {entry.name ?? tc("anonymous")}
              {entry.isCurrentUser && (
                <span className="ml-1 text-[10px] text-[#D6FF00]">{tc("you")}</span>
              )}
            </p>

            <LevelBadge xp={entry.xp} compact />

            <Badge
              variant="secondary"
              className={cn(
                "tabular-nums text-xs",
                entry.challengeCompleted
                  ? "border border-[#D6FF00]/35 bg-[#D6FF00]/10 text-[#D6FF00]"
                  : "border border-white/10 bg-zinc-900 text-zinc-400"
              )}
            >
              {entry.challengeCompleted ? t("completed") : `${entry.completionRate}%`}
            </Badge>

            {entry.challengeTitle && (
              <p className="max-w-[90px] truncate text-center text-[10px] text-zinc-500">
                {entry.challengeTitle}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function ChallengeRankTable({
  entries,
}: {
  entries: ChallengeLeaderboardEntry[];
}) {
  const tc = useTranslations("common");

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
            "flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors",
            entry.isCurrentUser
              ? "border-[#D6FF00]/25 bg-[#D6FF00]/5"
              : "border-white/5 bg-black/20 hover:bg-white/[0.03]"
          )}
        >
          <span className="w-6 text-center text-sm font-bold tabular-nums text-zinc-500">
            {entry.rank}
          </span>

          <FramedAvatar
            xp={entry.xp}
            src={entry.image ?? undefined}
            fallback={getInitials(entry.name)}
            className="size-8"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {entry.name ?? tc("anonymous")}
              {entry.isCurrentUser && (
                <span className="ml-1 text-xs text-[#D6FF00]">{tc("you")}</span>
              )}
            </p>
            {entry.challengeTitle && (
              <p className="truncate text-[11px] text-zinc-500">{entry.challengeTitle}</p>
            )}
          </div>

          {entry.subscriptionTier === "PRO" && (
            <Badge className={`${proBadgeClass} shrink-0 gap-0.5 px-1.5 py-0 text-[10px]`}>
              <Sparkles className="size-2.5" aria-hidden />
              PRO
            </Badge>
          )}

          <LevelBadge xp={entry.xp} compact />

          <RateBar rate={entry.completionRate} completed={entry.challengeCompleted} />
        </motion.div>
      ))}
    </div>
  );
}

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
    <Card className="mt-6 border border-[#D6FF00]/25 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <CardContent className="flex items-center gap-4 py-4">
        <span className="text-lg font-black tabular-nums text-[#D6FF00]">#{entry.rank}</span>
        <FramedAvatar
          xp={entry.xp}
          src={entry.image ?? undefined}
          fallback={getInitials(entry.name)}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {entry.name ?? tc("anonymous")}
          </p>
          <p className="text-xs text-zinc-500">{t("among", { rank: entry.rank, total })}</p>
        </div>
        <div className="shrink-0 space-y-1 text-right">
          <RateBar rate={entry.completionRate} completed={entry.challengeCompleted} />
          {entry.challengeTitle && (
            <p className="max-w-[150px] truncate text-[11px] text-zinc-500">
              {entry.challengeTitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChallengeLeaderboardEmpty() {
  const t = useTranslations("challengeLeaderboard");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D6FF00]/20 bg-[#D6FF00]/10">
        <Target className="h-8 w-8 text-[#D6FF00]" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-white">{t("noEntries")}</h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{t("noEntriesSub")}</p>
    </div>
  );
}

type Props = {
  data: ChallengeLeaderboardPayload;
};

export function ChallengeLeaderboard({ data }: Props) {
  const t = useTranslations("challengeLeaderboard");
  const { entries, currentUser } = data;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-[#D6FF00]/30 bg-[#D6FF00]/10">
          <Trophy className="size-5 text-[#D6FF00]" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-white">{t("title")}</h2>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <ChallengeLeaderboardEmpty />
      ) : (
        <>
          <ChallengePodium entries={entries.slice(0, 3)} />
          <ChallengeRankTable entries={entries.slice(3)} />
          {currentUser && <ChallengePersonalPanel entry={currentUser} total={entries.length} />}
        </>
      )}
    </section>
  );
}
