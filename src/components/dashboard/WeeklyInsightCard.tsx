"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, RefreshCw, Lock, Target, CheckCircle2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { getWeeklyInsightAction, type WeeklyInsightPayload } from "@/actions/ai.actions";
import { fireAllDoneConfetti } from "@/lib/celebrations";
import { ShareInsightModal } from "@/components/dashboard/ShareInsightModal";

// ─── Analiz Animasyonu ───────────────────────────────────────────────────────

function AnalyzingAnimation({ text }: { text: string }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 blur-lg opacity-30" />
        <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Brain className="h-7 w-7 text-white" />
        </div>
      </motion.div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{text}</span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ●
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        >
          ●
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
        >
          ●
        </motion.span>
      </div>
    </motion.div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

interface WeeklyInsightCardProps {
  initialData: WeeklyInsightPayload | null;
  isPro: boolean;
}

export function WeeklyInsightCard({ initialData, isPro }: WeeklyInsightCardProps) {
  const t = useTranslations("aiInsight");
  const [data, setData] = useState<WeeklyInsightPayload | null>(initialData);
  const [isPending, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);
  const confettiFired = useRef(false);

  // Görev tamamlandığında confetti
  useEffect(() => {
    if (data?.challengeCompleted && !confettiFired.current) {
      confettiFired.current = true;
      fireAllDoneConfetti();
    }
  }, [data?.challengeCompleted]);

  const handleRegenerate = () => {
    startTransition(async () => {
      try {
        const result = await getWeeklyInsightAction();
        setData(result);
      } catch {
        setData(null);
      }
    });
  };

  // ── PRO Gate ──────────────────────────────────────────────────────────────
  if (!isPro) {
    return (
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-violet-400" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("proOnly")}
          </p>
          <Button variant="outline" size="sm" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10" asChild>
            <a href="/settings">{t("upgradeCta")}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const weekNumber = data?.weekKey?.split("-W")[1] ?? "";
  const hasInsight = data?.insight && data.insight.length > 0;

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {t("title")}
              <Badge className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5">
                <Sparkles className="size-2.5" /> AI
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
          </div>
        </div>
        {hasInsight && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-indigo-400"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-violet-400"
              onClick={handleRegenerate}
              disabled={isPending}
            >
              <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <AnimatePresence mode="wait">
          {isPending ? (
            <AnalyzingAnimation key="loading" text={t("loading")} />
          ) : hasInsight ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="prose prose-sm prose-invert max-w-none">
                {data!.insight!.split("\n").filter(Boolean).map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm text-foreground/90 leading-relaxed mb-3 last:mb-0"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* ── AI Challenge Section ── */}
              {data!.challengeTitle && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className={cn(
                    "mt-4 p-3 rounded-lg border",
                    data!.challengeCompleted
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  )}
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    {data!.challengeCompleted ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Target className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        data!.challengeCompleted ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {data!.challengeTitle}
                      </p>
                      {data!.challengeDescription && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {data!.challengeDescription}
                        </p>
                      )}
                    </div>
                    {data!.challengeCategory && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {data!.challengeCategory}
                      </Badge>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">
                        {t("challenge.progress")}
                      </span>
                      <span className={cn(
                        "text-[11px] font-medium",
                        data!.challengeCompleted ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {data!.challengeProgress}/{data!.challengeTarget}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          data!.challengeCompleted
                            ? "bg-gradient-to-r from-emerald-500 to-green-400"
                            : "bg-gradient-to-r from-amber-500 to-orange-400"
                        )}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, (data!.challengeProgress / Math.max(1, data!.challengeTarget)) * 100)}%`,
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Completed reward */}
                  {data!.challengeCompleted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{t("challenge.reward")}</span>
                    </motion.div>
                  )}
                </motion.div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                {weekNumber && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("weekLabel", { week: weekNumber })}
                  </span>
                )}
                {data?.generatedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("generatedAt", {
                      date: new Date(data.generatedAt).toLocaleDateString(),
                    })}
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-6 text-center"
            >
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("noData")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isPending}
                className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isPending && "animate-spin")} />
                {t("regenerate")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Share Modal */}
      {hasInsight && data && (
        <ShareInsightModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          data={data}
        />
      )}
    </Card>
  );
}
