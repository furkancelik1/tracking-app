"use client";

import { usePWA } from "@/hooks/useInstallPrompt";
import { Smartphone, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { IOSInstallGuide } from "@/components/shared/IOSInstallGuide";

export function PWAInstallSection() {
  const t = useTranslations("pwa");
  const { canPrompt, isInstalled, installApp, showIOSGuide, closeIOSGuide } = usePWA();

  return (
    <>
      <section className="rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold">{t("settingsTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settingsDescription")}
        </p>

        {isInstalled ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            <span>{t("alreadyInstalled")}</span>
          </div>
        ) : canPrompt ? (
          <Button
            variant="outline"
            className="gap-2"
            onClick={installApp}
          >
            <Smartphone className="h-4 w-4" />
            {t("installAppButton")}
          </Button>
        ) : null}
      </section>
      <IOSInstallGuide open={showIOSGuide} onOpenChange={closeIOSGuide} />
    </>
  );
}
