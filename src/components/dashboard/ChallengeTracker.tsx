"use client";

import React, { useEffect, useState } from "react";
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

const VOLT = "#D6FF00";

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

  useEffect(() => {
    if (isCompleted && !celebrated) {
      setCelebrated(true);
      fireLevelUpConfetti();
      hapticSuccess();
    }
  }, [isCompleted, celebrated]);

  function getMotivationKey(): string {
    if (isCompleted) return "";
    if (remaining === 1) return "almostThere";
    if (percent >= 50) return "halfWay";
    if (progress > 0) return "justStarted";
    return "";
  }

  if (!isPro) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-zinc-950/60 p-5">
        <div className="flex items-center gap-3 text-zinc-400">
          <Lock className="size-5 text-[#D6FF00]/70" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-white">{t("title")}</p>
            <p className="text-xs text-zinc-500">{t("proOnly")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasChallenge) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-zinc-950/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-900">
            <Target className="size-5 text-zinc-500" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">{t("noChallenge")}</p>
            <p className="text-xs text-zinc-600">{t("noChallengeSub")}</p>
          </div>
        </div>
      </div>
    );
  }

  const motivationKey = getMotivationKey();

  function accentBarColor(p: number): string {
    if (p >= 75) return `linear-gradient(to right, #3f3f46, ${VOLT})`;
    if (p >= 50) return `linear-gradient(to right, #27272a, #a3a3a3)`;
    return "linear-gradient(to right, #0a0a0a, #3f3f46)";
  }

  if (isCompleted) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative overflow-hidden rounded-xl border border-[#D6FF00]/35 bg-gradient-to-br from-[#D6FF00]/12 via-zinc-950 to-black"
      >
        <div className="h-1.5 bg-[#D6FF00] shadow-[0_0_20px_rgba(214,255,0,0.4)]" />

        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-[#D6FF00]/30 bg-[#D6FF00]/15">
                <Trophy className="size-5 text-[#D6FF00]" aria-hidden />
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-tight text-[#D6FF00]">
                  {t("completedTitle")}
                  <Sparkles className="size-3.5" aria-hidden />
                </h3>
                <p className="text-xs text-zinc-400">{initialData.challengeTitle}</p>
              </div>
            </div>
            <Badge className="border border-[#D6FF00]/35 bg-black/50 text-xs text-[#D6FF00]">
              {t("reward", { xp: CHALLENGE_XP, coins: CHALLENGE_COINS })}
            </Badge>
          </div>

          <p className="text-sm text-zinc-300">{t("completedMessage")}</p>

          <Progress value={100} className="h-2.5 bg-zinc-900 [&>div]:bg-[#D6FF00]" />

          <div className="flex justify-between tabular-nums text-xs text-zinc-500">
            <span>{t("progressLabel", { current: progress, target })}</span>
            <span className="font-semibold text-[#D6FF00]">100%</span>
          </div>
        </div>

        <div className="absolute right-3 top-3 animate-pulse">
          <Sparkles className="size-4 text-[#D6FF00]/40" aria-hidden />
        </div>
        <div className="absolute bottom-4 right-8 animate-pulse delay-500">
          <Sparkles className="size-3 text-[#D6FF00]/25" aria-hidden />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-xl border border-white/5 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    >
      <div className="h-1" style={{ background: accentBarColor(percent) }} />

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-[#D6FF00]/25 bg-[#D6FF00]/10">
              <Target className="size-5 text-[#D6FF00]" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white">{initialData.challengeTitle}</h3>
                {initialData.challengeCategory && (
                  <Badge
                    variant="secondary"
                    className="border border-white/10 bg-zinc-900 text-[10px] text-zinc-400"
                  >
                    {t("focus", { category: initialData.challengeCategory })}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Bot className="size-3 text-zinc-500" aria-hidden />
                <span className="text-[11px] text-zinc-500">{t("assignedBy")}</span>
              </div>
            </div>
          </div>
        </div>

        {initialData.challengeDescription && (
          <p className="pl-[52px] text-xs leading-relaxed text-zinc-500">
            {initialData.challengeDescription}
          </p>
        )}

        <div className="space-y-2">
          <Progress
            value={percent}
            className={cn(
              "h-2.5 bg-zinc-900",
              percent >= 75
                ? "[&>div]:bg-[#D6FF00]"
                : percent >= 50
                  ? "[&>div]:bg-[#D6FF00]/70"
                  : "[&>div]:bg-zinc-600"
            )}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-zinc-500">
              {t("progressLabel", { current: progress, target })}
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#D6FF00]">{percent}%</span>
          </div>
        </div>

        <AnimatePresence>
          {motivationKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/40 px-3 py-2"
            >
              <span className="text-xs text-zinc-400">
                {remaining > 0 ? t("remaining", { count: remaining }) : ""}
              </span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs font-medium text-[#D6FF00]">{t(motivationKey)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
