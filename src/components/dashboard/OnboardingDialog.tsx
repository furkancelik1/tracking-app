"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  PlusCircle,
  CheckCircle2,
  Coins,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { getOnboardingStatus, completeTour } from "@/actions/badge.actions";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "addRoutine", icon: PlusCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "completeRoutine", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  { key: "earnCoins", icon: Coins, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { key: "viewAnalytics", icon: BarChart3, color: "text-purple-500", bg: "bg-purple-500/10" },
] as const;

export function OnboardingDialog() {
  const t = useTranslations("onboarding");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    getOnboardingStatus()
      .then((seen) => {
        if (!seen) setOpen(true);
      })
      .catch(() => {});
  }, []);

  async function handleFinish() {
    setCompleting(true);
    try {
      const result = await completeTour();
      setOpen(false);
      window.dispatchEvent(new CustomEvent("coins-updated"));
      toast.success(t("rewardToast"), { duration: 5000 });
      if (result.newBadges.length > 0) {
        const firstBadge = result.newBadges[0];
        if (firstBadge) {
          toast.success(t("badgeEarned", { badge: firstBadge }), {
            duration: 4000,
          });
        }
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setCompleting(false);
    }
  }

  function handleSkip() {
    handleFinish();
  }

  const currentStep = STEPS[step] ?? STEPS[0];
  const isLast = step === STEPS.length - 1;
  const StepIcon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent className="flex min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header gradient */}
        <div className="relative shrink-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-4 pt-[max(1.5rem,env(safe-area-inset-top,0px))]">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-8 w-8 p-0 text-muted-foreground"
            onClick={handleSkip}
            aria-label="Close"
            data-testid="onboarding-close"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        {/* Step content (scrolls on short viewports) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {/* Step indicators */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-8 bg-primary"
                    : i < step
                    ? "w-4 bg-primary/40"
                    : "w-4 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Icon + text */}
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center transition-all",
                currentStep.bg
              )}
            >
              <StepIcon className={cn("h-8 w-8", currentStep.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">
                {t(`steps.${currentStep.key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {t(`steps.${currentStep.key}.description`)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex shrink-0 items-center justify-between px-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back")}
          </Button>

          {isLast ? (
            <Button
              size="sm"
              onClick={handleFinish}
              disabled={completing}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              {completing ? t("finishing") : t("finish")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              className="gap-1"
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Reward hint */}
        <div className="shrink-0 border-t bg-muted/50 px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            <Coins className="inline h-3 w-3 text-yellow-500 mr-1" />
            {t("rewardHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
