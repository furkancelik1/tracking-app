"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/dashboard/LevelBadge";
import { fireLevelUpConfetti, hapticSuccess } from "@/lib/celebrations";
import { fireDuelToast } from "@/lib/duel-notifications";
import type { DuelEntry } from "@/actions/duel.actions";
import { respondToDuel, sendDuelMessage } from "@/actions/duel.actions";
import { DuelChat } from "@/components/dashboard/DuelChat";
import {
  Swords,
  Timer,
  Trophy,
  Share2,
  Coins,
  Check,
  X,
  Rocket,
  Flame,
  Shield,
} from "lucide-react";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_HOUR_PER_MS = 60 * 60 * 1000;

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

function pickMyId(duel: DuelEntry): string {
  return duel.isChallenger
    ? duel.challenger.id
    : duel.opponent?.id ?? duel.challenger.id;
}

const VsBadge = memo(function VsBadge() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
    >
      <div className="relative">
        <div className="size-14 rounded-full bg-[#D6FF00] flex items-center justify-center shadow-lg shadow-[#D6FF00]/35">
          <span className="text-lg font-black text-black tracking-tighter">VS</span>
        </div>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#D6FF00]/50"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
});

const PlayerCard = memo(function PlayerCard({
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
          ? "border-[#D6FF00]/50 bg-gradient-to-b from-[#D6FF00]/10 to-transparent"
          : isCurrentUser
            ? "border-[#D6FF00]/25 bg-[#D6FF00]/5"
            : "border-white/10 bg-zinc-950/80"
      )}
    >
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1"
        >
          <Trophy className="size-6 text-[#D6FF00]" />
        </motion.div>
      )}

      <Avatar
        className={cn(
          "size-16 ring-2",
          isWinner
            ? "ring-[#D6FF00]"
            : isCurrentUser
              ? "ring-[#D6FF00]/70"
              : "ring-white/15"
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

      <motion.div
        key={score}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={cn(
          "text-3xl font-black tabular-nums",
          isWinner ? "text-[#D6FF00]" : isCurrentUser ? "text-[#D6FF00]" : "text-white"
        )}
      >
        {score}
      </motion.div>
    </motion.div>
  );
});

function Countdown({ endTimeMs }: { endTimeMs: number }) {
  const t = useTranslations("duel");
  const [now, setNow] = useState(() => Date.now());
  const lastHourFiredRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ms = Math.max(0, endTimeMs - now);
  const { h, m, s } = formatTimeLeft(ms);

  useEffect(() => {
    if (ms > 0 && ms <= ONE_HOUR_MS && !lastHourFiredRef.current) {
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

function ResultBanner({ duel }: { duel: DuelEntry }) {
  const t = useTranslations("duel");

  if (duel.status !== "FINISHED") return null;

  if (!duel.winnerId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-muted/50 border px-4 py-3 text-center"
      >
        <p className="text-sm font-medium">
          {t("resultDraw", { amount: duel.stake })}
        </p>
      </motion.div>
    );
  }

  const myId = pickMyId(duel);
  const isWin = duel.winnerId === myId;
  const pot = duel.stake * 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border px-4 py-3 text-center",
        isWin
          ? "bg-[#D6FF00]/10 border-[#D6FF00]/40"
          : "bg-zinc-500/10 border-zinc-500/30"
      )}
    >
      <p
        className={cn(
          "text-sm font-bold",
          isWin ? "text-[#D6FF00]" : "text-zinc-300"
        )}
      >
        {isWin
          ? t("resultWin", { amount: pot })
          : t("resultLoss", { amount: duel.stake })}
      </p>
    </motion.div>
  );
}

function PendingActions({
  duel,
  onRespond,
}: {
  duel: DuelEntry;
  onRespond: () => void;
}) {
  const t = useTranslations("duel");
  const [isPending, startTransition] = useTransition();

  const handleRespond = useCallback(
    (accept: boolean) => {
      startTransition(async () => {
        await respondToDuel({ duelId: duel.id, accept });
        onRespond();
      });
    },
    [duel.id, onRespond]
  );

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
        className="flex-1 bg-[#D6FF00] text-black hover:bg-[#c8f000]"
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

function ShareButton({ duel }: { duel: DuelEntry }) {
  const t = useTranslations("duel");

  const handleShare = useCallback(async () => {
    const text = t("shareText", {
      challengerScore: duel.challengerScore,
      opponentScore: duel.opponentScore,
    });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("arenaTitle"), text });
      } catch {
        // User cancelled or unsupported
      }
    }
  }, [duel.challengerScore, duel.opponentScore, t]);

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
      <Share2 className="size-3.5" />
      {t("share")}
    </Button>
  );
}

function DuelEmptyState() {
  const t = useTranslations("duel");
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-16 rounded-2xl bg-[#D6FF00]/10 border border-[#D6FF00]/20 flex items-center justify-center mb-4">
        <Swords className="size-8 text-[#D6FF00]" />
      </div>
      <h3 className="text-base font-semibold">{t("noDuel")}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{t("noDuelDesc")}</p>
    </div>
  );
}

const CHALLENGE_CARDS = [
  {
    id: "focus-mode",
    title: "Focus Mode",
    topic: "Disiplin Yarışı",
    message:
      "Focus Mode açıldı: Bugün en az 3 rutin tamamlayacağım. Hazır mısın?",
    icon: Rocket,
    className: "border-[#D6FF00]/35 bg-[#D6FF00]/10",
  },
  {
    id: "streak-rush",
    title: "Streak Rush",
    topic: "Streak Koruma",
    message:
      "Streak Rush kartımı oynadım. Serini koru, ben de tempoyu artırıyorum!",
    icon: Flame,
    className: "border-[#D6FF00]/30 bg-zinc-900",
  },
  {
    id: "shield-up",
    title: "Shield Up",
    topic: "Son Tur Savunması",
    message: "Shield Up! Bugünü boş geçmiyorum. Düello son ana kadar açık.",
    icon: Shield,
    className: "border-[#D6FF00]/30 bg-black",
  },
] as const;

function formatDurationLabel(endTime: string | null): string {
  if (!endTime) return "24s";
  const remainingMs = Math.max(0, new Date(endTime).getTime() - Date.now());
  const hours = Math.max(1, Math.ceil(remainingMs / ONE_HOUR_PER_MS));
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
  const durationLabel = useMemo(
    () => formatDurationLabel(duel.endTime),
    [duel.endTime]
  );

  const sendCard = useCallback(
    (message: string, title: string) => {
      startTransition(async () => {
        const result = await sendDuelMessage({
          duelId: duel.id,
          content: message,
        });
        if (!result.success) {
          toast.error("Kart gönderilemedi. Birkaç saniye sonra tekrar dene.");
          return;
        }
        toast.success(`"${title}" kartı gönderildi.`);
      });
    },
    [duel.id]
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Meydan Okuma Kartları
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {CHALLENGE_CARDS.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              type="button"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: 0.06 * index,
              }}
              disabled={disabled || isPending}
              onClick={() => sendCard(card.message, card.title)}
              className={cn(
                "rounded-xl border glass-card retro-border p-3 text-left transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60",
                card.className
              )}
            >
              <div className="mb-2 inline-flex rounded-md bg-[#D6FF00]/10 p-1.5">
                <Icon className="size-4 text-[#D6FF00]" />
              </div>
              <p className="text-sm font-black uppercase tracking-wide text-white">
                {card.title}
              </p>
              <div className="mt-2 space-y-1 text-[11px] text-zinc-400">
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

type Props = {
  duel: DuelEntry | null;
};

export function DuelArena({ duel }: Props) {
  const t = useTranslations("duel");
  const [, setTick] = useState(0);
  const refreshTick = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!duel || duel.status !== "FINISHED" || !duel.winnerId) return;
    const myId = pickMyId(duel);
    if (duel.winnerId === myId) {
      fireLevelUpConfetti();
      hapticSuccess();
    }
  }, [duel]);

  const derived = useMemo(() => {
    if (!duel) return null;
    const myId = pickMyId(duel);
    const maxScore = Math.max(duel.challengerScore, duel.opponentScore, 1);
    return {
      isActive: duel.status === "ACTIVE",
      isPending: duel.status === "PENDING",
      isFinished: duel.status === "FINISHED",
      endTimeMs: duel.endTime ? new Date(duel.endTime).getTime() : 0,
      pot: duel.stake * 2,
      myId,
      challengerPct: Math.round((duel.challengerScore / maxScore) * 100),
      opponentPct: Math.round((duel.opponentScore / maxScore) * 100),
      opponentPlayer: duel.opponent ?? {
        id: "pending-opponent",
        name: t("pending"),
        image: null,
        xp: 0,
      },
    };
  }, [duel, t]);

  if (!duel || !derived) return <DuelEmptyState />;

  const {
    isActive,
    isPending,
    isFinished,
    endTimeMs,
    pot,
    myId,
    opponentPlayer,
    challengerPct,
    opponentPct,
  } = derived;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-[#D6FF00]/10 border border-[#D6FF00]/25 flex items-center justify-center">
            <Swords className="size-5 text-[#D6FF00]" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-white">
              {t("arenaTitle")}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Coins className="size-3" />
                {t("potTotal", { amount: pot })}
              </Badge>
              {isActive && (
                <Badge className="bg-[#D6FF00]/10 text-[#D6FF00] border-[#D6FF00]/35 text-[10px]">
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
        <VsBadge />
      </div>

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
              className="h-3 bg-zinc-900 [&>div]:bg-[#D6FF00]"
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
              className="h-3 bg-zinc-900 [&>div]:bg-[#D6FF00]"
            />
          </div>
        </div>
      )}

      {isActive && (
        <div className="flex justify-center">
          <Countdown endTimeMs={endTimeMs} />
        </div>
      )}

      {isActive && (
        <p className="text-xs text-muted-foreground text-center">
          {t("completeRoutines")}
        </p>
      )}

      {isPending && <PendingActions duel={duel} onRespond={refreshTick} />}

      {isFinished && <ResultBanner duel={duel} />}

      {isActive && duel.opponent && (
        <DuelChat duelId={duel.id} currentUserId={myId} isActive={isActive} />
      )}

      {isActive && duel.opponent && (
        <ChallengeCards duel={duel} disabled={!isActive} />
      )}
    </section>
  );
}
