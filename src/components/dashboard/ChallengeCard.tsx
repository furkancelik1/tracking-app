"use client";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
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

const SPARKLE_COUNT = 4;

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const VsBadge = memo(function VsBadge() {
  return (
    <div className="relative shrink-0">
      <motion.div
        className="absolute inset-0 rounded-full bg-[#D6FF00] blur-md"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative h-12 w-12 rounded-full bg-[#D6FF00] flex items-center justify-center shadow-lg shadow-[#D6FF00]/40"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
      >
        <motion.span
          className="text-sm font-black text-black tracking-wider"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          VS
        </motion.span>
      </motion.div>
    </div>
  );
});

const WinnerSparkle = memo(function WinnerSparkle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {Array.from({ length: SPARKLE_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: `${15 + i * 20}%`, left: `${10 + i * 25}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [0, -6, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="size-3 text-[#D6FF00]" />
        </motion.div>
      ))}
    </div>
  );
});

const PlayerSide = memo(function PlayerSide({
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

  const avatarBlock = (
    <div className="relative">
      <Avatar
        className={`size-11 ring-2 shadow-md ${
          isWinner ? "ring-[#D6FF00]" : "ring-white/15"
        }`}
      >
        <AvatarImage src={image ?? undefined} />
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.5 }}
          className={`absolute -top-1.5 ${
            isRight ? "-left-1.5" : "-right-1.5"
          } rounded-full bg-[#D6FF00] p-0.5`}
        >
          <Crown className="size-2.5 text-black" />
        </motion.div>
      )}
    </div>
  );

  const content = (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 25,
        delay: isRight ? 0.15 : 0,
      }}
      className={`flex items-center gap-3 flex-1 min-w-0 ${
        isRight ? "justify-end text-right" : ""
      }`}
    >
      {!isRight && avatarBlock}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate text-zinc-400">
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
      {isRight && avatarBlock}
    </motion.div>
  );

  if (isWinner) return <WinnerSparkle>{content}</WinnerSparkle>;
  return content;
});

type Props = {
  challenge: ChallengeEntry;
};

export function ChallengeCard({ challenge }: Props) {
  const t = useTranslations("challenges");
  const [isPending, startTransition] = useTransition();
  const [checkedIn, setCheckedIn] = useState(false);
  const [status, setStatus] = useState(challenge.status);
  const [challengerCount, setChallengerCount] = useState(
    challenge.challengerCount
  );
  const [opponentCount, setOpponentCount] = useState(challenge.opponentCount);

  const { isActive, isPendingStatus, isCompleted, totalDays, progress } =
    useMemo(() => {
      const total = challenge.durationDays;
      const active = status === "ACTIVE";
      return {
        isActive: active,
        isPendingStatus: status === "PENDING",
        isCompleted: status === "COMPLETED",
        totalDays: total,
        progress: active ? ((total - challenge.daysLeft) / total) * 100 : 0,
      };
    }, [status, challenge.durationDays, challenge.daysLeft]);

  const challengerIsWinning = challengerCount > opponentCount;
  const opponentIsWinning = opponentCount > challengerCount;

  const handleAccept = useCallback(() => {
    startTransition(async () => {
      try {
        await acceptChallengeAction(challenge.id);
        setStatus("ACTIVE");
        toast.success(t("acceptedToast"), {
          description: `"${challenge.routineTitle}" ${t("duelStartedDesc")}`,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("errorToast"));
      }
    });
  }, [challenge.id, challenge.routineTitle, t]);

  const handleDecline = useCallback(() => {
    startTransition(async () => {
      try {
        await declineChallengeAction(challenge.id);
        setStatus("DECLINED");
        toast(t("declinedToast"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("errorToast"));
      }
    });
  }, [challenge.id, t]);

  const handleCheckIn = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await challengeCheckInAction(challenge.id);
        if (!res.alreadyCheckedIn) {
          if (challenge.isChallenger) {
            setChallengerCount((c) => c + 1);
          } else {
            setOpponentCount((c) => c + 1);
          }
          toast.success(t("checkInSuccess"), {
            description: `"${challenge.routineTitle}"`,
          });
        } else {
          toast(t("alreadyCheckedIn"));
        }
        setCheckedIn(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("errorToast"));
      }
    });
  }, [challenge.id, challenge.isChallenger, challenge.routineTitle, t]);

  if (status === "DECLINED") return null;

  const youWon =
    (challenge.isChallenger && challengerIsWinning) ||
    (!challenge.isChallenger && opponentIsWinning);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <Card className="overflow-hidden border border-white/5 shadow-lg bg-gradient-to-b from-zinc-950 to-black">
        <motion.div
          className={`h-1 ${
            isCompleted || isActive ? "bg-[#D6FF00]" : "bg-zinc-700"
          }`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />

        <CardContent className="pt-4 pb-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-black text-sm text-white">
                {challenge.routineTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
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
                isCompleted || isActive
                  ? "bg-[#D6FF00]/10 text-[#D6FF00] border-[#D6FF00]/30 gap-1"
                  : "bg-zinc-900 text-zinc-300 border-white/10"
              }
            >
              {isCompleted && <Trophy className="size-3" />}
              {isActive
                ? t("active")
                : isPendingStatus
                  ? t("pendingInvite")
                  : isCompleted
                    ? t("completed")
                    : ""}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2 py-2">
            <PlayerSide
              name={challenge.challenger.name}
              image={challenge.challenger.image}
              score={challengerCount}
              isWinner={isCompleted && challengerIsWinning}
              isYou={challenge.isChallenger}
              align="left"
              color="text-[#D6FF00]"
            />
            <VsBadge />
            <PlayerSide
              name={challenge.opponent.name}
              image={challenge.opponent.image}
              score={opponentCount}
              isWinner={isCompleted && opponentIsWinning}
              isYou={!challenge.isChallenger}
              align="right"
              color="text-[#D6FF00]"
            />
          </div>

          {isActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Progress
                value={progress}
                className="h-1.5 bg-zinc-900 [&>div]:bg-[#D6FF00]"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-zinc-500">
                  {totalDays - challenge.daysLeft}/{totalDays}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {Math.round(progress)}%
                </span>
              </div>
            </motion.div>
          )}

          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                challenge.winnerId === null
                  ? "bg-zinc-500/10 text-zinc-300"
                  : youWon
                    ? "bg-[#D6FF00]/10 text-[#D6FF00] border border-[#D6FF00]/25"
                    : "bg-zinc-500/10 text-zinc-400"
              }`}
            >
              {challenge.winnerId === null
                ? t("drawMessage")
                : youWon
                  ? t("winMessage")
                  : t("lossMessage")}
            </motion.div>
          )}

          <div className="flex justify-end gap-2">
            {isPendingStatus && !challenge.isChallenger && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isPending}
                  className="h-8 text-xs border-white/15 text-zinc-300"
                >
                  {t("decline")}
                </Button>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={isPending}
                    className="h-8 text-xs gap-1 bg-[#D6FF00] text-black hover:bg-[#c8f000]"
                  >
                    <Swords className="size-3" />
                    {t("accept")}
                  </Button>
                </motion.div>
              </>
            )}
            {isActive && (
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  size="sm"
                  onClick={handleCheckIn}
                  disabled={isPending || checkedIn}
                  variant={checkedIn ? "secondary" : "default"}
                  className={`h-8 text-xs gap-1 ${
                    !checkedIn ? "bg-[#D6FF00] text-black hover:bg-[#c8f000]" : ""
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
