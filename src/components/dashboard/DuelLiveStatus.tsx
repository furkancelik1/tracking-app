"use client";

import React, { useState, useEffect } from "react";
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Live Countdown ──────────────────────────────────────────────────────────

function LiveCountdown({ endTimeMs }: { endTimeMs: number }) {
  const t = useTranslations("duel");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, endTimeMs - now);
  const { h, m, s } = formatTimeLeft(ms);
  const totalDuration = 24 * 60 * 60 * 1000;
  const progressPct = Math.max(0, Math.min(100, ((totalDuration - ms) / totalDuration) * 100));

  if (ms <= 0) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <Timer className="size-3" />
        {t("battleEnded")}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Timer className="size-4 text-orange-400" />
        <div className="flex gap-1 tabular-nums text-sm font-bold">
          <span className="bg-orange-500/10 text-orange-500 rounded px-2 py-1">
            {String(h).padStart(2, "0")}{t("hours")}
          </span>
          <span className="text-muted-foreground self-center">:</span>
          <span className="bg-orange-500/10 text-orange-500 rounded px-2 py-1">
            {String(m).padStart(2, "0")}{t("minutes")}
          </span>
          <span className="text-muted-foreground self-center">:</span>
          <span className="bg-orange-500/10 text-orange-500 rounded px-2 py-1">
            {String(s).padStart(2, "0")}{t("seconds")}
          </span>
        </div>
      </div>
      <Progress value={progressPct} className="h-1" />
    </div>
  );
}

// ─── Player Panel ────────────────────────────────────────────────────────────

function PlayerPanel({
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
        "flex-1 flex flex-col items-center gap-2 rounded-xl p-4 border relative",
        isWinner
          ? "border-yellow-400/50 bg-gradient-to-b from-yellow-400/10 to-transparent"
          : isCurrentUser
            ? "border-orange-500/30 bg-orange-500/5"
            : "border-border bg-card/50"
      )}
    >
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2"
        >
          <Trophy className="size-5 text-yellow-400" />
        </motion.div>
      )}

      {/* Avatar */}
      <Avatar
        className={cn(
          "size-14 ring-2",
          isWinner
            ? "ring-yellow-400"
            : isCurrentUser
              ? "ring-orange-400"
              : "ring-border"
        )}
      >
        <AvatarImage src={player.image ?? undefined} alt={player.name ?? "?"} />
        <AvatarFallback className="text-sm font-semibold">
          {getInitials(player.name)}
        </AvatarFallback>
      </Avatar>

      <div className="text-center space-y-0.5">
        <p className="text-xs font-semibold truncate max-w-[90px]">
          {player.name ?? "?"}
        </p>
        <LevelBadge xp={player.xp} compact />
      </div>

      {/* Score */}
      <motion.div
        key={score}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={cn(
          "text-2xl font-black tabular-nums",
          isWinner ? "text-yellow-400" : isCurrentUser ? "text-orange-400" : "text-foreground"
        )}
      >
        {score}
      </motion.div>

      {/* Discipline Bar */}
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <Flame className="size-3" />
          <span>{scorePct}%</span>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              isWinner
                ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                : isCurrentUser
                  ? "bg-gradient-to-r from-orange-400 to-red-500"
                  : "bg-gradient-to-r from-slate-400 to-slate-500"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── VS Badge ────────────────────────────────────────────────────────────────

function VsBadge() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
      className="z-10 -mx-3"
    >
      <div className="size-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
        <span className="text-sm font-black text-white tracking-tighter">VS</span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Props = {
  duel: DuelEntry;
};

export function DuelLiveStatus({ duel }: Props) {
  const t = useTranslations("duel");

  const isActive = duel.status === "ACTIVE";
  const isFinished = duel.status === "FINISHED";
  const endTimeMs = duel.endTime ? new Date(duel.endTime).getTime() : 0;
  const pot = duel.stake * 2;
  const myId = duel.isChallenger ? duel.challenger.id : duel.opponent?.id;

  const maxScore = Math.max(duel.challengerScore, duel.opponentScore, 1);

  if (!duel.opponent) return null;

  return (
    <Card className="overflow-hidden border-orange-500/20">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="size-4 text-orange-400" />
            <span className="text-sm font-bold">{t("liveStatus")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Coins className="size-3 text-yellow-500" />
              {t("potTotal", { amount: pot })}
            </Badge>
            {isActive && (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("live")}
              </Badge>
            )}
            {duel.isPrivate && (
              <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-500">
                {t("privateBadge")}
              </Badge>
            )}
          </div>
        </div>

        {/* Players VS */}
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

        {/* Countdown */}
        {isActive && endTimeMs > 0 && (
          <LiveCountdown endTimeMs={endTimeMs} />
        )}

        {/* Tip */}
        {isActive && (
          <p className="text-[11px] text-muted-foreground text-center">
            {t("completeRoutines")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
