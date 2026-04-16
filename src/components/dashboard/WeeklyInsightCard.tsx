"use client";

import { useState, useTransition, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, RefreshCw, Lock, Target, CheckCircle2, Share2, Trophy, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { getWeeklyInsightAction, type WeeklyInsightPayload } from "@/actions/ai.actions";
import { fireAllDoneConfetti } from "@/lib/celebrations";
import { ShareInsightModal } from "@/components/dashboard/ShareInsightModal";

// â”€â”€â”€ Error Boundary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WeeklyInsightErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[WeeklyInsightCard] Render error caught by ErrorBoundary:", error.message);
    console.error("[WeeklyInsightCard] Component stack:", errorInfo.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive/60" />
            <p className="text-sm text-muted-foreground max-w-xs">
              AI KoÃ§ bileÅŸeni yÃ¼klenemedi. Dashboard Ã§alÄ±ÅŸmaya devam ediyor.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// â”€â”€â”€ Analiz Animasyonu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          â—
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        >
          â—
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
        >
          â—
        </motion.span>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Ana BileÅŸen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface WeeklyInsightCardProps {
  initialData: WeeklyInsightPayload | null;
  isPro: boolean;
}

export function WeeklyInsightCard({ initialData, isPro }: WeeklyInsightCardProps) {
  return (
    <WeeklyInsightErrorBoundary>
      <WeeklyInsightCardInner initialData={initialData} isPro={isPro} />
    </WeeklyInsightErrorBoundary>
  );
}

function WeeklyInsightCardInner({ initialData, isPro }: WeeklyInsightCardProps) {
  const t = useTranslations("aiInsight");
  const locale = useLocale();
  const [data, setData] = useState<WeeklyInsightPayload | null>(initialData);
  const [isPending, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confettiFired = useRef(false);

  // GÃ¶rev tamamlandÄ±ÄŸÄ±nda confetti
  useEffect(() => {
    if (data?.challengeCompleted && !confettiFired.current) {
      confettiFired.current = true;
      fireAllDoneConfetti();
    }
  }, [data?.challengeCompleted]);

  const handleRegenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getWeeklyInsightAction({ locale });
        setData(result);
        if (!result.insight) {
          setError(t("analyzing"));
        }
      } catch {
        setError(t("error"));
        setData(null);
      }
    });
  };

  const handleForceGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await getWeeklyInsightAction({ force: true, locale });
        setData(result);
        if (!result.insight) {
          setError(t("analyzing"));
        }
      } catch {
        setError(t("error"));
        setData(null);
      }
    });
  };

  // â”€â”€ PRO Gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            {process.env.NODE_ENV === "development" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-500 hover:text-amber-400"
                onClick={handleForceGenerate}
                disabled={isPending}
                title="Force Generate AI (dev only)"
              >
                <Zap className={cn("h-4 w-4", isPending && "animate-pulse")} />
              </Button>
            )}
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

              {/* â”€â”€ AI Success Highlight â”€â”€ */}
              {data!.successHighlight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 w-fit"
                >
                  <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-emerald-400">
                    {t("successHighlight.label")}:
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {data!.successHighlight}
                  </span>
                </motion.div>
              )}

              {/* â”€â”€ AI Challenge Section â”€â”€ */}
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
                  <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
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
                {error ?? t("noData")}
              </p>
              <div className="flex items-center gap-2">
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
                {process.env.NODE_ENV === "development" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceGenerate}
                    disabled={isPending}
                    className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                  >
                    <Zap className={cn("h-3.5 w-3.5 mr-1.5", isPending && "animate-pulse")} />
                    {t("forceGenerate")}
                  </Button>
                )}
              </div>
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
