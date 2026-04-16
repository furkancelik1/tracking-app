"use client";

import React from "react";
import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { fireLevelUpConfetti, hapticSuccess } from "@/lib/celebrations";
import { fireDuelToast } from "@/lib/duel-notifications";
import { nativeShareImage } from "@/lib/share";
import type { DuelEntry } from "@/actions/duel.actions";
import { respondToDuel, sendDuelMessage } from "@/actions/duel.actions";
import { DuelChat } from "@/components/dashboard/DuelChat";
import {
  Swords,
  Timer,
  Trophy,
  Share2,
  Coins,
  ShieldAlert,
  Sparkles,
  Check,
  X,
  Rocket,
  Flame,
  Shield,
} from "lucide-react";

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

function formatTimeLeft(ms: number): { h: number; m: number; s: number } {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

// â”€â”€â”€ VS Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function VsBadge() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
    >
      <div className="relative">
        <div className="size-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
          <span className="text-lg font-black text-white tracking-tighter">VS</span>
        </div>
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-400/50"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Player Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlayerCard({
  player,
  score,
  isLeft,
  isWinner,
  isCurrentUser,
}: {
  player: { id: string; name: string | null; image: string | null; xp: number };
  score: number;
  isLeft: boolean;
  isWinner: boolean;
  isCurrentUser: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: isLeft ? 0.1 : 0.2 }}
      className={cn(
        "flex-1 flex flex-col items-center gap-3 rounded-xl p-4 border relative overflow-hidden",
        isWinner
          ? "border-yellow-400/50 bg-gradient-to-b from-yellow-400/10 to-transparent"
          : isCurrentUser
            ? "border-indigo-500/30 bg-indigo-500/5"
            : "border-border bg-card/50"
      )}
    >
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1"
        >
          <Trophy className="size-6 text-yellow-400" />
        </motion.div>
      )}

      <Avatar
        className={cn(
          "size-16 ring-2",
          isWinner
            ? "ring-yellow-400"
            : isCurrentUser
              ? "ring-indigo-400"
              : "ring-border"
        )}
      >
        <AvatarImage src={player.image ?? undefined} alt={player.name ?? "?"} />
        <AvatarFallback className="text-sm font-semibold">
          {getInitials(player.name)}
        </AvatarFallback>
      </Avatar>

      <div className="text-center space-y-1">
        <p className="text-sm font-semibold truncate max-w-[100px]">
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
          "text-3xl font-black tabular-nums",
          isWinner ? "text-yellow-400" : isCurrentUser ? "text-indigo-400" : "text-foreground"
        )}
      >
        {score}
      </motion.div>
    </motion.div>
  );
}

// â”€â”€â”€ Countdown Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Countdown({ endTimeMs }: { endTimeMs: number }) {
  const t = useTranslations("duel");
  const [now, setNow] = useState(Date.now());
  const lastHourFiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, endTimeMs - now);
  const { h, m, s } = formatTimeLeft(ms);

  // Son 1 saat uyarÄ±sÄ± (bir kez)
  const ONE_HOUR = 60 * 60 * 1000;
  useEffect(() => {
    if (ms > 0 && ms <= ONE_HOUR && !lastHourFiredRef.current) {
      lastHourFiredRef.current = true;
      fireDuelToast("ending", {
        title: t("notifLastHour"),
        description: t("notifLastHourDesc"),
      });
    }
  }, [ms, t]);

  if (ms <= 0) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <Timer className="size-3" />
        {t("battleEnded")}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Timer className="size-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{t("timeLeft")}:</span>
      <div className="flex gap-1 tabular-nums text-sm font-bold">
        <span className="bg-accent rounded px-1.5 py-0.5">
          {String(h).padStart(2, "0")}{t("hours")}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-accent rounded px-1.5 py-0.5">
          {String(m).padStart(2, "0")}{t("minutes")}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-accent rounded px-1.5 py-0.5">
          {String(s).padStart(2, "0")}{t("seconds")}
        </span>
      </div>
    </div>
  );
}

// â”€â”€â”€ Duel Result Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResultBanner({
  duel,
}: {
  duel: DuelEntry;
}) {
  const t = useTranslations("duel");
  const myId = duel.isChallenger ? duel.challenger.id : (duel.opponent?.id ?? duel.challenger.id);
  const pot = duel.stake * 2;

  if (duel.status !== "FINISHED" || !duel.winnerId) {
    // Draw
    if (duel.status === "FINISHED") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-muted/50 border px-4 py-3 text-center"
        >
          <p className="text-sm font-medium">{t("resultDraw", { amount: duel.stake })}</p>
        </motion.div>
      );
    }
    return null;
  }

  const isWin = duel.winnerId === myId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border px-4 py-3 text-center",
        isWin
          ? "bg-yellow-400/10 border-yellow-400/40"
          : "bg-destructive/10 border-destructive/30"
      )}
    >
      <p className={cn("text-sm font-bold", isWin ? "text-yellow-500" : "text-destructive")}>
        {isWin ? t("resultWin", { amount: pot }) : t("resultLoss", { amount: duel.stake })}
      </p>
    </motion.div>
  );
}

// â”€â”€â”€ Pending Duel Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PendingActions({
  duel,
  onRespond,
}: {
  duel: DuelEntry;
  onRespond: () => void;
}) {
  const t = useTranslations("duel");
  const [isPending, startTransition] = useTransition();

  const handleRespond = (accept: boolean) => {
    startTransition(async () => {
      await respondToDuel({ duelId: duel.id, accept });
      onRespond();
    });
  };

  // Sadece rakip (opponent) kabul/red edebilir
  if (duel.isChallenger) {
    return (
      <div className="rounded-lg bg-muted/50 border px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">{t("pending")}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button
        variant="default"
        className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
        disabled={isPending}
        onClick={() => handleRespond(true)}
      >
        <Check className="size-4 mr-1.5" />
        {t("accept")}
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        disabled={isPending}
        onClick={() => handleRespond(false)}
      >
        <X className="size-4 mr-1.5" />
        {t("decline")}
      </Button>
    </div>
  );
}

// â”€â”€â”€ Share Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ShareButton({ duel }: { duel: DuelEntry }) {
  const t = useTranslations("duel");
  const arenaRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    const text = t("shareText", {
      challengerScore: duel.challengerScore,
      opponentScore: duel.opponentScore,
    });

    // Web Share API ile text paylaÅŸÄ±mÄ±
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t("arenaTitle"),
          text,
        });
      } catch {
        // KullanÄ±cÄ± iptal etti veya desteklenmiyor
      }
    }
  }, [duel, t]);

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
      <Share2 className="size-3.5" />
      {t("share")}
    </Button>
  );
}

// â”€â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DuelEmptyState() {
  const t = useTranslations("duel");
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <Swords className="size-8 text-red-400" />
      </div>
      <h3 className="text-base font-semibold">{t("noDuel")}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{t("noDuelDesc")}</p>
    </div>
  );
}

// --- Challenge Cards (quick taunt/motivation cards) ---

const CHALLENGE_CARDS = [
  {
    id: "focus-mode",
    title: "Focus Mode",
    topic: "Disiplin Yarışı",
    message: "Focus Mode açıldı: Bugün en az 3 rutin tamamlayacağım. Hazır mısın?",
    icon: Rocket,
    className: "border-indigo-500/30 bg-indigo-500/10",
  },
  {
    id: "streak-rush",
    title: "Streak Rush",
    topic: "Streak Koruma",
    message: "Streak Rush kartımı oynadım. Serini koru, ben de tempoyu artırıyorum!",
    icon: Flame,
    className: "border-orange-500/30 bg-orange-500/10",
  },
  {
    id: "shield-up",
    title: "Shield Up",
    topic: "Son Tur Savunması",
    message: "Shield Up! Bugünü boş geçmiyorum. Düello son ana kadar açık.",
    icon: Shield,
    className: "border-emerald-500/30 bg-emerald-500/10",
  },
] as const;

function formatDuration(endTime: string | null): string {
  if (!endTime) return "24s";
  const remainingMs = Math.max(0, new Date(endTime).getTime() - Date.now());
  const hours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  return `${hours}s`;
}

function ChallengeCards({
  duel,
  disabled,
}: {
  duel: DuelEntry;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const durationLabel = React.useMemo(() => formatDuration(duel.endTime), [duel.endTime]);

  const sendCard = (message: string, title: string) => {
    startTransition(async () => {
      const result = await sendDuelMessage({ duelId: duel.id, content: message });
      if (!result.success) {
        toast.error("Kart gönderilemedi. Birkaç saniye sonra tekrar dene.");
        return;
      }
      toast.success(`"${title}" kartı gönderildi.`);
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Meydan Okuma Kartları</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {CHALLENGE_CARDS.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              type="button"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.06 * index }}
              disabled={disabled || isPending}
              onClick={() => sendCard(card.message, card.title)}
              className={cn(
                "rounded-xl border glass-card retro-border p-3 text-left transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60",
                card.className
              )}
            >
              <div className="mb-2 inline-flex rounded-md bg-background/70 p-1.5">
                <Icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">{card.title}</p>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <p>Konu: {card.topic}</p>
                <p>Ödül: {duel.stake * 2} altın</p>
                <p>Süre: {durationLabel}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€ Main DuelArena â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  duel: DuelEntry | null;
};

export function DuelArena({ duel }: Props) {
  const t = useTranslations("duel");
  const [, setTick] = useState(0);

  // CanlÄ± skor takibi iÃ§in polling olabilir ama ÅŸimdilik page reload'a dayalÄ±
  // Confetti on first mount if winner is current user
  useEffect(() => {
    if (!duel) return;
    if (duel.status === "FINISHED" && duel.winnerId) {
      const myId = duel.isChallenger
        ? duel.challenger.id
        : (duel.opponent?.id ?? duel.challenger.id);
      if (duel.winnerId === myId) {
        fireLevelUpConfetti();
        hapticSuccess();
      }
    }
  }, [duel]);

  if (!duel) return <DuelEmptyState />;

  const isActive = duel.status === "ACTIVE";
  const isPending = duel.status === "PENDING";
  const isFinished = duel.status === "FINISHED";
  const endTimeMs = duel.endTime ? new Date(duel.endTime).getTime() : 0;
  const pot = duel.stake * 2;
  const myId = duel.isChallenger ? duel.challenger.id : (duel.opponent?.id ?? duel.challenger.id);
  const opponentPlayer = duel.opponent ?? {
    id: "pending-opponent",
    name: t("pending"),
    image: null,
    xp: 0,
  };

  const maxScore = Math.max(duel.challengerScore, duel.opponentScore, 1);
  const challengerPct = Math.round((duel.challengerScore / maxScore) * 100);
  const opponentPct = Math.round((duel.opponentScore / maxScore) * 100);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-to-br from-red-500/15 to-orange-500/15 flex items-center justify-center">
            <Swords className="size-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">{t("arenaTitle")}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Coins className="size-3" />
                {t("potTotal", { amount: pot })}
              </Badge>
              {isActive && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                  {t("battleStarted")}
                </Badge>
              )}
              {isPending && (
                <Badge variant="outline" className="text-[10px]">
                  {t("pending")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {(isActive || isFinished) && <ShareButton duel={duel} />}
      </div>

      {/* Arena â€” Two players side by side with VS in the middle */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-4">
          <PlayerCard
            player={duel.challenger}
            score={duel.challengerScore}
            isLeft
            isWinner={isFinished && duel.winnerId === duel.challenger.id}
            isCurrentUser={duel.challenger.id === myId}
          />
          <PlayerCard
            player={opponentPlayer}
            score={duel.opponentScore}
            isLeft={false}
            isWinner={isFinished && duel.winnerId === duel.opponent?.id}
            isCurrentUser={opponentPlayer.id === myId}
          />
        </div>
        {/* VS overlay */}
        <VsBadge />
      </div>

      {/* Progress Bars â€” "Disiplin Ã‡ubuklarÄ±" */}
      {(isActive || isFinished) && (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate max-w-[120px]">
                {duel.challenger.name ?? "?"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {duel.challengerScore}
              </span>
            </div>
            <Progress
              value={challengerPct}
              className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate max-w-[120px]">
                {duel.opponent?.name ?? "?"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {duel.opponentScore}
              </span>
            </div>
            <Progress
              value={opponentPct}
              className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-red-400 [&>div]:to-orange-500"
            />
          </div>
        </div>
      )}

      {/* Timer */}
      {isActive && (
        <div className="flex justify-center">
          <Countdown endTimeMs={endTimeMs} />
        </div>
      )}

      {/* Tip */}
      {isActive && (
        <p className="text-xs text-muted-foreground text-center">
          {t("completeRoutines")}
        </p>
      )}

      {/* Pending Actions */}
      {isPending && (
        <PendingActions
          duel={duel}
          onRespond={() => setTick((t) => t + 1)}
        />
      )}

      {/* Result Banner */}
      {isFinished && <ResultBanner duel={duel} />}

      {/* Duel Chat */}
      {isActive && duel.opponent && (
        <DuelChat
          duelId={duel.id}
          currentUserId={myId}
          isActive={isActive}
        />
      )}

      {isActive && duel.opponent && <ChallengeCards duel={duel} disabled={!isActive} />}
    </section>
  );
}
