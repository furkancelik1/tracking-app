"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AICoachBriefing } from "@/components/dashboard/AICoachBriefing";
import { useTranslations } from "next-intl";
import type { WeeklyInsightPayload } from "@/actions/ai.actions";

type Props = {
  xp: number;
  initialInsight: WeeklyInsightPayload | null;
  isPro: boolean;
};

export function AICoachButton({ xp, initialInsight, isPro }: Props) {
  const t = useTranslations("coach");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/10 transition-colors"
        title={t("title")}
      >
        <Bot className="h-4 w-4 text-indigo-400" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <div className="p-1">
            <AICoachBriefing xp={xp} initialInsight={initialInsight} isPro={isPro} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
