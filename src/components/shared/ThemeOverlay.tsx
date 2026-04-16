"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getEquippedTheme } from "@/actions/shop.actions";

/**
 * KuÅŸanÄ±lmÄ±ÅŸ temayÄ± <html> elementine CSS custom property olarak uygular.
 * Layout'a bir kez eklenir, tÃ¼m uygulamada geÃ§erli olur.
 */
export function ThemeOverlay() {
  const { status } = useSession();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function applyTheme() {
      try {
        const theme = await getEquippedTheme();
        if (cancelled) return;

        const root = document.documentElement;

        if (theme?.metadata) {
          const { primary, secondary, accent, glow, pattern, cardRadius, radius, cardShadow, shadow } = theme.metadata;
          if (primary) root.style.setProperty("--shop-primary", primary);
          if (secondary) root.style.setProperty("--shop-secondary", secondary);
          if (accent) root.style.setProperty("--shop-accent", accent);
          if (glow) root.style.setProperty("--shop-primary-glow", glow);
          if (cardRadius ?? radius) root.style.setProperty("--shop-card-radius", (cardRadius ?? radius) as string);
          if (cardShadow ?? shadow) root.style.setProperty("--shop-card-shadow", (cardShadow ?? shadow) as string);
          root.setAttribute("data-shop-theme", "true");
          root.setAttribute("data-theme-name", theme.name ?? "");
          if (pattern && pattern !== "none") {
            root.setAttribute("data-bg-pattern", pattern);
          } else {
            root.removeAttribute("data-bg-pattern");
          }
          setApplied(true);
        } else {
          root.style.removeProperty("--shop-primary");
          root.style.removeProperty("--shop-secondary");
          root.style.removeProperty("--shop-accent");
          root.style.removeProperty("--shop-primary-glow");
          root.style.removeProperty("--shop-card-radius");
          root.style.removeProperty("--shop-card-shadow");
          root.removeAttribute("data-shop-theme");
          root.removeAttribute("data-theme-name");
          root.removeAttribute("data-bg-pattern");
          setApplied(false);
        }
      } catch {
        // Sessizce baÅŸarÄ±sÄ±z ol
      }
    }

    applyTheme();

    // Tema deÄŸiÅŸikliklerinde yeniden uygula
    const handler = () => applyTheme();
    window.addEventListener("theme-changed", handler);

    return () => {
      cancelled = true;
      window.removeEventListener("theme-changed", handler);
    };
  }, [status]);

  return null;
}
