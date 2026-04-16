"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Target, Bot, Trophy, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { WeeklyInsightPayload } from "@/actions/ai.actions";
import { fireLevelUpConfetti, hapticSuccess } from "@/lib/celebrations";

type Props = {
  initialData: WeeklyInsightPayload | null;
  isPro: boolean;
};

const CHALLENGE_XP = 75;
const CHALLENGE_COINS = 30;

export function ChallengeTracker({ initialData, isPro }: Props) {
  const t = useTranslations("challengeTracker");
  const [celebrated, setCelebrated] = useState(false);

  const hasChallenge =
    initialData &&
    initialData.challengeTitle &&
    initialData.challengeTarget > 0;

  const progress = hasChallenge ? initialData.challengeProgress : 0;
  const target = hasChallenge ? initialData.challengeTarget : 0;
  const isCompleted = hasChallenge ? initialData.challengeCompleted : false;
  const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  const remaining = target - progress;

  // Completion celebration â€” fire once
  useEffect(() => {
    if (isCompleted && !celebrated) {
      setCelebrated(true);
      fireLevelUpConfetti();
      hapticSuccess();
    }
  }, [isCompleted, celebrated]);

  // Motivational sub-message based on progress
  function getMotivationKey(): string {
    if (isCompleted) return "";
    if (remaining === 1) return "almostThere";
    if (percent >= 50) return "halfWay";
    if (progress > 0) return "justStarted";
    return "";
  }

  // â”€â”€ No PRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!isPro) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card/50 p-5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Lock className="size-5" />
          <div>
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="text-xs">{t("proOnly")}</p>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ No active challenge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!hasChallenge) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card/50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted/60">
            <Target className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("noChallenge")}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {t("noChallengeSub")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const motivationKey = getMotivationKey();

  // â”€â”€ Completed state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isCompleted) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative overflow-hidden rounded-xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10"
      >
        {/* Gold shimmer top bar */}
        <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500" />

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-yellow-500/20">
                <Trophy className="size-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                  {t("completedTitle")}
                  <Sparkles className="size-3.5" />
                </h3>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
                  {initialData.challengeTitle}
                </p>
              </div>
            </div>
            <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs">
              {t("reward", { xp: CHALLENGE_XP, coins: CHALLENGE_COINS })}
            </Badge>
          </div>

          <p className="text-sm text-yellow-700/90 dark:text-yellow-300/90">
            {t("completedMessage")}
          </p>

          <Progress value={100} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-amber-500" />

          <div className="flex justify-between text-xs text-yellow-600/70 dark:text-yellow-400/70 tabular-nums">
            <span>{t("progressLabel", { current: progress, target })}</span>
            <span>100%</span>
          </div>
        </div>

        {/* Floating sparkle particles */}
        <div className="absolute top-3 right-3 animate-pulse">
          <Sparkles className="size-4 text-yellow-400/50" />
        </div>
        <div className="absolute bottom-4 right-8 animate-pulse delay-500">
          <Sparkles className="size-3 text-amber-400/40" />
        </div>
      </motion.div>
    );
  }

  // â”€â”€ Active challenge (in progress) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border bg-card overflow-hidden"
    >
      {/* Accent bar with gradient based on progress */}
      <div
        className="h-1"
        style={{
          background:
            percent >= 75
              ? "linear-gradient(to right, #22c55e, #16a34a)"
              : percent >= 50
                ? "linear-gradient(to right, #3b82f6, #6366f1)"
                : "linear-gradient(to right, #6366f1, #a855f7)",
        }}
      />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-indigo-500/15 to-purple-500/15">
              <Target className="size-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{initialData.challengeTitle}</h3>
                {initialData.challengeCategory && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {t("focus", { category: initialData.challengeCategory })}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Bot className="size-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  {t("assignedBy")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {initialData.challengeDescription && (
          <p className="text-xs text-muted-foreground leading-relaxed pl-[52px]">
            {initialData.challengeDescription}
          </p>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress
            value={percent}
            className={cn(
              "h-2.5",
              percent >= 75
                ? "[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-emerald-500"
                : percent >= 50
                  ? "[&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-indigo-500"
                  : "[&>div]:bg-gradient-to-r [&>div]:from-indigo-400 [&>div]:to-purple-500"
            )}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("progressLabel", { current: progress, target })}
            </span>
            <span className="text-xs font-medium tabular-nums">{percent}%</span>
          </div>
        </div>

        {/* Motivation message */}
        <AnimatePresence>
          {motivationKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2"
            >
              <span className="text-xs">
                {remaining > 0
                  ? t("remaining", { count: remaining })
                  : ""}
              </span>
              <span className="text-xs text-muted-foreground">â€¢</span>
              <span className="text-xs font-medium">
                {t(motivationKey)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
