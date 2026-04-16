"use client";

import { Share, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IOSInstallGuide({ open, onOpenChange }: Props) {
  const t = useTranslations("pwa.iosGuide");

  const steps = [
    {
      icon: (
        <Share className="h-5 w-5" />
      ),
      text: t("step1"),
    },
    {
      icon: (
        <Plus className="h-5 w-5" />
      ),
      text: t("step2"),
    },
    {
      icon: (
        <span className="text-base font-bold">âœ“</span>
      ),
      text: t("step3"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-2 space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div className="flex-1 pt-2">
                <p className="text-sm font-medium leading-snug">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("gotIt")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
