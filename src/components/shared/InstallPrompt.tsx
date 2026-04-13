"use client";

import { usePWA } from "@/hooks/useInstallPrompt";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { IOSInstallGuide } from "@/components/shared/IOSInstallGuide";

export function InstallPrompt() {
  const t = useTranslations("pwa");
  const { canPrompt, installApp, dismiss, showIOSGuide, closeIOSGuide } = usePWA();

  return (
    <>
      <AnimatePresence>
        {canPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Download className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("installTitle")}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t("installDescription")}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={installApp}>
                  {t("installButton")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={dismiss}
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <IOSInstallGuide open={showIOSGuide} onOpenChange={closeIOSGuide} />
    </>
  );
}
