"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Swords,
  Check,
  Timer,
  Zap,
  Trophy,
  Sparkles,
  Crown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  acceptChallengeAction,
  declineChallengeAction,
  challengeCheckInAction,
  type ChallengeEntry,
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

// â”€â”€â”€ VS Badge Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function VsBadge() {
  return (
    <div className="relative shrink-0">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur-md"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner badge */}
      <motion.div
        className="relative h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
      >
        <motion.span
          className="text-sm font-black text-white tracking-wider"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          VS
        </motion.span>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ Sparkle Effect for Winner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WinnerSparkle({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {/* Sparkle particles */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: `${15 + i * 20}%`,
            left: `${10 + i * 25}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
            y: [0, -6, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="size-3 text-amber-400" />
        </motion.div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Player Side â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlayerSide({
  name,
  image,
  score,
  isWinner,
  isYou,
  align,
  color,
}: {
  name: string | null;
  image: string | null;
  score: number;
  isWinner: boolean;
  isYou: boolean;
  align: "left" | "right";
  color: string;
}) {
  const t = useTranslations("challenges");
  const isRight = align === "right";

  const content = (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25, delay: isRight ? 0.15 : 0 }}
      className={`flex items-center gap-3 flex-1 min-w-0 ${isRight ? "justify-end text-right" : ""}`}
    >
      {!isRight && (
        <div className="relative">
          <Avatar className={`size-11 ring-2 shadow-md ${isWinner ? "ring-amber-400" : "ring-border"}`}>
            <AvatarImage src={image ?? undefined} />
            <AvatarFallback className="text-xs font-semibold">{getInitials(name)}</AvatarFallback>
          </Avatar>
          {isWinner && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-400 p-0.5"
            >
              <Crown className="size-2.5 text-white" />
            </motion.div>
          )}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate text-muted-foreground">
          {isYou ? t("you") : name}
        </p>
        <motion.p
          className={`text-2xl font-black tabular-nums ${color}`}
          key={score}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {score}
        </motion.p>
      </div>
      {isRight && (
        <div className="relative">
          <Avatar className={`size-11 ring-2 shadow-md ${isWinner ? "ring-amber-400" : "ring-border"}`}>
            <AvatarImage src={image ?? undefined} />
            <AvatarFallback className="text-xs font-semibold">{getInitials(name)}</AvatarFallback>
          </Avatar>
          {isWinner && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
              className="absolute -top-1.5 -left-1.5 rounded-full bg-amber-400 p-0.5"
            >
              <Crown className="size-2.5 text-white" />
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );

  if (isWinner) return <WinnerSparkle>{content}</WinnerSparkle>;
  return content;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  challenge: ChallengeEntry;
};

export function ChallengeCard({ challenge }: Props) {
  const t = useTranslations("challenges");
  const [isPending, startTransition] = useTransition();
  const [checkedIn, setCheckedIn] = useState(false);
  const [status, setStatus] = useState(challenge.status);
  const [challengerCount, setChallengerCount] = useState(challenge.challengerCount);
  const [opponentCount, setOpponentCount] = useState(challenge.opponentCount);

  const isActive = status === "ACTIVE";
  const isPendingStatus = status === "PENDING";
  const isCompleted = status === "COMPLETED";
  const totalDays = challenge.durationDays;
  const progress = isActive ? ((totalDays - challenge.daysLeft) / totalDays) * 100 : 0;

  const challengerIsWinning = challengerCount > opponentCount;
  const opponentIsWinning = opponentCount > challengerCount;

  const handleAccept = () => {
    startTransition(async () => {
      try {
        await acceptChallengeAction(challenge.id);
        setStatus("ACTIVE");
        toast.success("âš”ï¸");
      } catch {
        toast.error("Error");
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await declineChallengeAction(challenge.id);
        setStatus("DECLINED");
      } catch {
        toast.error("Error");
      }
    });
  };

  const handleCheckIn = () => {
    startTransition(async () => {
      try {
        const res = await challengeCheckInAction(challenge.id);
        if (!res.alreadyCheckedIn) {
          // Update local score
          if (challenge.isChallenger) {
            setChallengerCount((c) => c + 1);
          } else {
            setOpponentCount((c) => c + 1);
          }
        }
        setCheckedIn(true);
        if (!res.alreadyCheckedIn) toast.success("âœ…");
      } catch {
        toast.error("Error");
      }
    });
  };

  if (status === "DECLINED") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-b from-card to-card/80">
        {/* Animated top bar */}
        <motion.div
          className={`h-1 ${
            isCompleted
              ? "bg-gradient-to-r from-amber-400 to-yellow-500"
              : isActive
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                : "bg-gradient-to-r from-amber-400 to-orange-400"
          }`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />

        <CardContent className="pt-4 pb-5 space-y-4">
          {/* Header: routine title + status badge */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-sm">{challenge.routineTitle}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Timer className="size-3" />
                {isActive
                  ? t("daysLeft", { count: challenge.daysLeft })
                  : isPendingStatus
                    ? t("waiting")
                    : isCompleted
                      ? t("completed")
                      : ""}
              </div>
            </div>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={
                isCompleted
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1"
                  : isActive
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1"
                    : ""
              }
            >
              {isCompleted && <Trophy className="size-3" />}
              {isActive ? t("active") : isPendingStatus ? t("pendingInvite") : isCompleted ? t("completed") : ""}
            </Badge>
          </div>

          {/* â”€â”€ VS Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="flex items-center justify-between gap-2 py-2">
            <PlayerSide
              name={challenge.challenger.name}
              image={challenge.challenger.image}
              score={challengerCount}
              isWinner={isCompleted && challengerIsWinning}
              isYou={challenge.isChallenger}
              align="left"
              color="text-indigo-400"
            />

            <VsBadge />

            <PlayerSide
              name={challenge.opponent.name}
              image={challenge.opponent.image}
              score={opponentCount}
              isWinner={isCompleted && opponentIsWinning}
              isYou={!challenge.isChallenger}
              align="right"
              color="text-orange-400"
            />
          </div>

          {/* Progress bar */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {totalDays - challenge.daysLeft}/{totalDays}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            </motion.div>
          )}

          {/* Winner result message */}
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={`
                rounded-xl px-4 py-3 text-center text-sm font-semibold
                ${
                  challenge.winnerId === null
                    ? "bg-zinc-500/10 text-zinc-400"
                    : (challenge.isChallenger && challengerIsWinning) ||
                        (!challenge.isChallenger && opponentIsWinning)
                      ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-zinc-500/10 text-muted-foreground"
                }
              `}
            >
              {challenge.winnerId === null
                ? t("drawMessage")
                : (challenge.isChallenger && challengerIsWinning) ||
                    (!challenge.isChallenger && opponentIsWinning)
                  ? t("winMessage")
                  : t("lossMessage")}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isPendingStatus && !challenge.isChallenger && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isPending}
                  className="h-8 text-xs"
                >
                  {t("decline")}
                </Button>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={isPending}
                    className="h-8 text-xs gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    <Swords className="size-3" />
                    {t("accept")}
                  </Button>
                </motion.div>
              </>
            )}
            {isActive && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="sm"
                  onClick={handleCheckIn}
                  disabled={isPending || checkedIn}
                  variant={checkedIn ? "secondary" : "default"}
                  className={`h-8 text-xs gap-1 ${
                    !checkedIn
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                      : ""
                  }`}
                >
                  {checkedIn ? (
                    <>
                      <Check className="size-3" />
                      {t("checkedIn")}
                    </>
                  ) : (
                    <>
                      <Zap className="size-3" />
                      {t("checkIn")}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
