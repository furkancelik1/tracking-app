"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "chromium" | "ios" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // iOS Safari doesn't fire beforeinstallprompt
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return "chromium";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const plat = detectPlatform();
    setPlatform(plat);

    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const daysSince =
        (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
      } else {
        localStorage.removeItem("pwa-install-dismissed");
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const installApp = useCallback(async () => {
    // iOS doesn't support beforeinstallprompt — show guide modal
    if (platform === "ios") {
      setShowIOSGuide(true);
      return false;
    }

    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt, platform]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  }, []);

  const closeIOSGuide = useCallback(() => {
    setShowIOSGuide(false);
  }, []);

  const canPrompt = platform === "ios"
    ? !isInstalled && !dismissed
    : !!deferredPrompt && !isInstalled && !dismissed;

  return {
    /** true when user can be prompted (banner or settings button) */
    canPrompt,
    /** true when app runs in standalone mode */
    isInstalled,
    /** "chromium" | "ios" | "other" */
    platform,
    /** triggers native install or opens iOS guide */
    installApp,
    /** dismiss the banner for 7 days */
    dismiss,
    /** whether to show iOS "Add to Home Screen" guide modal */
    showIOSGuide,
    /** close iOS guide modal */
    closeIOSGuide,
  };
}
