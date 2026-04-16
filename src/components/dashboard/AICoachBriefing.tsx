"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import {
  Bot,
  Sparkles,
  Target,
  Trophy,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { DailyCoachPayload, WeeklyInsightPayload } from "@/actions/ai.actions";
import { getDailyCoachMessage } from "@/actions/ai.actions";
import { calculateLevel, normalizeRankTitle } from "@/lib/level";

type Props = {
  xp: number;
  initialInsight: WeeklyInsightPayload | null;
  isPro: boolean;
};

const LEGEND_LEVEL = 51;
const XP_PER_LEVEL = 100;
const LEGEND_XP = LEGEND_LEVEL * XP_PER_LEVEL; // 5100

export function AICoachBriefing({ xp, initialInsight, isPro }: Props) {
  const t = useTranslations("coach");
  const tLevels = useTranslations("levels");
  const locale = useLocale();

  const [coach, setCoach] = useState<DailyCoachPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoach = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDailyCoachMessage(locale);
      setCoach(data);
    } catch {
      setCoach(null);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchCoach();
  }, [fetchCoach]);

  // Level bilgileri
  const levelInfo = calculateLevel(xp);
  const normalizedRank = normalizeRankTitle(levelInfo.rank);
  const xpToLegend = Math.max(0, LEGEND_XP - xp);
  const legendProgress = Math.min(100, Math.round((xp / LEGEND_XP) * 100));

  // Challenge bilgileri
  const challenge = initialInsight;
  const hasChallengeData =
    challenge && challenge.challengeTitle && challenge.challengeTarget > 0;
  const challengePercent = hasChallengeData
    ? Math.min(
        100,
        Math.round(
          (challenge.challengeProgress / challenge.challengeTarget) * 100
        )
      )
    : 0;

  // Developer mode â€” API key yok
  if (coach && !coach.hasApiKey) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500/10">
            <AlertTriangle className="size-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t("developerMode")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("addApiKey")}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-indigo-500/20 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <div className="p-5 space-y-4">
        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <Bot className="size-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              {t("title")}
              <Sparkles className="size-3.5 text-purple-400" />
            </h2>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* â”€â”€ Daily Message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 py-3"
            >
              <Loader2 className="size-4 animate-spin text-indigo-400" />
              <span className="text-xs text-muted-foreground">
                {t("thinking")}
              </span>
            </motion.div>
          ) : coach?.message ? (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-lg bg-card/60 border border-border/50 p-3"
            >
              <p className="text-sm leading-relaxed">{coach.message}</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-2"
            >
              <p className="text-xs text-muted-foreground">{t("noMessage")}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Challenge + Coach Tip Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Weekly Challenge Progress */}
          <div className="rounded-lg bg-card/60 border border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Target className="size-3.5 text-emerald-400" />
              <span>{t("weeklyChallenge")}</span>
            </div>

            {hasChallengeData ? (
              <>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {challenge.challengeTitle}
                </p>
                <div className="space-y-1">
                  <Progress
                    value={challengePercent}
                    className="h-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                    <span>
                      {challenge.challengeProgress}/{challenge.challengeTarget}
                    </span>
                    <span
                      className={cn(
                        challenge.challengeCompleted
                          ? "text-emerald-500 font-medium"
                          : ""
                      )}
                    >
                      {challenge.challengeCompleted
                        ? t("challengeComplete")
                        : `${challengePercent}%`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isPro ? t("noChallengeYet") : t("proChallengeOnly")}
              </p>
            )}
          </div>

          {/* Coach Tip â€” Legend Progress */}
          <div className="rounded-lg bg-card/60 border border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Trophy className="size-3.5 text-amber-400" />
              <span>{t("coachTip")}</span>
            </div>

            {coach?.coachTip ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {coach.coachTip}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                {xpToLegend > 0
                  ? t("legendRemaining", { xp: xpToLegend.toLocaleString() })
                  : t("legendReached")}
              </p>
            )}

            <div className="space-y-1">
              <Progress value={legendProgress} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>
                  {tLevels(`ranks.${normalizedRank}` as Parameters<typeof tLevels>[0])}
                </span>
                <span className="flex items-center gap-0.5">
                  {tLevels("ranks.Efsane")}
                  <ChevronRight className="size-2.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
