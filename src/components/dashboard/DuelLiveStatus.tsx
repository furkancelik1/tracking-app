"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import type { DuelEntry } from "@/actions/duel.actions";
import { Timer, Swords, Coins, Trophy, Flame } from "lucide-react";

const TOTAL_DUEL_DURATION_MS = 24 * 60 * 60 * 1000;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTimeLeft(ms: number): { h: number; m: number; s: number } {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

function LiveCountdown({ endTimeMs }: { endTimeMs: number }) {
  const t = useTranslations("duel");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ms = Math.max(0, endTimeMs - now);
  const { h, m, s } = formatTimeLeft(ms);
  const progressPct = Math.max(
    0,
    Math.min(100, ((TOTAL_DUEL_DURATION_MS - ms) / TOTAL_DUEL_DURATION_MS) * 100)
  );

  if (ms <= 0) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <Timer className="size-3" aria-hidden />
        {t("battleEnded")}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Timer className="size-4 text-[#D6FF00]" aria-hidden />
        <div className="flex gap-1 tabular-nums text-sm font-bold">
          <span className="rounded bg-[#D6FF00]/15 px-2 py-1 text-[#D6FF00]" suppressHydrationWarning>
            {String(h).padStart(2, "0")}
            {t("hours")}
          </span>
          <span className="self-center text-zinc-600" suppressHydrationWarning>:</span>
          <span className="rounded bg-[#D6FF00]/15 px-2 py-1 text-[#D6FF00]" suppressHydrationWarning>
            {String(m).padStart(2, "0")}
            {t("minutes")}
          </span>
          <span className="self-center text-zinc-600" suppressHydrationWarning>:</span>
          <span className="rounded bg-[#D6FF00]/15 px-2 py-1 text-[#D6FF00]" suppressHydrationWarning>
            {String(s).padStart(2, "0")}
            {t("seconds")}
          </span>
        </div>
      </div>
      <Progress value={progressPct} className="h-1 [&>div]:bg-[#D6FF00]" />
    </div>
  );
}

const PlayerPanel = memo(function PlayerPanel({
  player,
  score,
  maxScore,
  isLeft,
  isCurrentUser,
  isWinner,
}: {
  player: { id: string; name: string | null; image: string | null; xp: number };
  score: number;
  maxScore: number;
  isLeft: boolean;
  isCurrentUser: boolean;
  isWinner: boolean;
}) {
  const scorePct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: isLeft ? 0.1 : 0.2 }}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-2 rounded-xl border p-4",
        isWinner
          ? "border-[#D6FF00]/40 bg-gradient-to-b from-[#D6FF00]/12 to-transparent"
          : isCurrentUser
            ? "border-[#D6FF00]/25 bg-[#D6FF00]/5"
            : "border-white/5 bg-zinc-950/80"
      )}
    >
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-2 -top-2"
        >
          <Trophy className="size-5 text-[#D6FF00]" aria-hidden />
        </motion.div>
      )}

      <Avatar
        className={cn(
          "size-14 ring-2",
          isWinner
            ? "ring-[#D6FF00]"
            : isCurrentUser
              ? "ring-[#D6FF00]/70"
              : "ring-white/10"
        )}
      >
        <AvatarImage src={player.image ?? undefined} alt={player.name ?? "?"} />
        <AvatarFallback className="text-sm font-semibold">
          {getInitials(player.name)}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-0.5 text-center">
        <p className="max-w-[90px] truncate text-xs font-semibold text-white">
          {player.name ?? "?"}
        </p>
        <LevelBadge xp={player.xp} compact />
      </div>

      <motion.div
        key={score}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={cn(
          "text-2xl font-black tabular-nums",
          isWinner
            ? "text-[#D6FF00]"
            : isCurrentUser
              ? "text-[#D6FF00]"
              : "text-zinc-300"
        )}
      >
        {score}
      </motion.div>

      <div className="w-full space-y-1">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <Flame className="size-3 text-[#D6FF00]/80" aria-hidden />
          <span>{scorePct}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-zinc-900">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              isWinner || isCurrentUser ? "bg-[#D6FF00]" : "bg-zinc-600"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
});

const VsBadge = memo(function VsBadge() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
      className="-mx-3 z-10"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-[#D6FF00] shadow-[0_0_28px_rgba(214,255,0,0.35)]">
        <span className="text-sm font-black tracking-tighter text-black">
          VS
        </span>
      </div>
    </motion.div>
  );
});

type Props = {
  duel: DuelEntry;
};

export function DuelLiveStatus({ duel }: Props) {
  const t = useTranslations("duel");

  const { isActive, isFinished, endTimeMs, pot, maxScore } = useMemo(
    () => ({
      isActive: duel.status === "ACTIVE",
      isFinished: duel.status === "FINISHED",
      endTimeMs: duel.endTime ? new Date(duel.endTime).getTime() : 0,
      pot: duel.stake * 2,
      maxScore: Math.max(duel.challengerScore, duel.opponentScore, 1),
    }),
    [
      duel.status,
      duel.endTime,
      duel.stake,
      duel.challengerScore,
      duel.opponentScore,
    ]
  );

  if (!duel.opponent) return null;

  return (
    <Card className="overflow-hidden border border-[#D6FF00]/20 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Swords className="size-4 shrink-0 text-[#D6FF00]" aria-hidden />
            <span className="truncate text-sm font-black uppercase tracking-tight text-white">
              {t("liveStatus")}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge
              variant="secondary"
              className="gap-1 border border-white/10 bg-black/50 text-[10px] text-[#D6FF00]"
            >
              <Coins className="size-3" aria-hidden />
              {t("potTotal", { amount: pot })}
            </Badge>
            {isActive && (
              <Badge className="gap-1 border border-[#D6FF00]/30 bg-[#D6FF00]/10 text-[10px] text-[#D6FF00]">
                <span className="size-1.5 animate-pulse rounded-full bg-[#D6FF00]" />
                {t("live")}
              </Badge>
            )}
            {duel.isPrivate && (
              <Badge
                variant="outline"
                className="gap-1 border-[#D6FF00]/35 text-[10px] text-[#D6FF00]"
              >
                {t("privateBadge")}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0">
          <PlayerPanel
            player={duel.challenger}
            score={duel.challengerScore}
            maxScore={maxScore}
            isLeft
            isCurrentUser={duel.isChallenger}
            isWinner={isFinished && duel.winnerId === duel.challenger.id}
          />
          <VsBadge />
          <PlayerPanel
            player={duel.opponent}
            score={duel.opponentScore}
            maxScore={maxScore}
            isLeft={false}
            isCurrentUser={!duel.isChallenger}
            isWinner={isFinished && duel.winnerId === duel.opponent.id}
          />
        </div>

        {isActive && endTimeMs > 0 && <LiveCountdown endTimeMs={endTimeMs} />}

        {isActive && (
          <p className="text-center text-[11px] text-zinc-500">
            {t("completeRoutines")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
