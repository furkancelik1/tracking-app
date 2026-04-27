"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IOSNavigator = Navigator & { standalone?: boolean };

type Platform = "chromium" | "ios" | "other";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_TTL_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  return "chromium";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as IOSNavigator).standalone === true
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
    setPlatform(detectPlatform());

    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / DAY_MS;
      if (daysSince < DISMISS_TTL_DAYS) {
        setDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (platform === "ios") {
      setShowIOSGuide(true);
      return false;
    }
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt, platform]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  const closeIOSGuide = useCallback(() => setShowIOSGuide(false), []);

  const canPrompt =
    platform === "ios"
      ? !isInstalled && !dismissed
      : !!deferredPrompt && !isInstalled && !dismissed;

  return {
    canPrompt,
    isInstalled,
    platform,
    installApp,
    dismiss,
    showIOSGuide,
    closeIOSGuide,
  };
}
