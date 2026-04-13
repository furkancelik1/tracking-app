"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getEquippedTheme } from "@/actions/shop.actions";

/**
 * Kuşanılmış temayı <html> elementine CSS custom property olarak uygular.
 * Layout'a bir kez eklenir, tüm uygulamada geçerli olur.
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
          const { primary, secondary, accent, glow } = theme.metadata;
          if (primary) root.style.setProperty("--shop-primary", primary);
          if (secondary) root.style.setProperty("--shop-secondary", secondary);
          if (accent) root.style.setProperty("--shop-accent", accent);
          if (glow) root.style.setProperty("--shop-primary-glow", glow);
          root.setAttribute("data-shop-theme", "true");
          setApplied(true);
        } else {
          root.style.removeProperty("--shop-primary");
          root.style.removeProperty("--shop-secondary");
          root.style.removeProperty("--shop-accent");
          root.style.removeProperty("--shop-primary-glow");
          root.removeAttribute("data-shop-theme");
          setApplied(false);
        }
      } catch {
        // Sessizce başarısız ol
      }
    }

    applyTheme();

    // Tema değişikliklerinde yeniden uygula
    const handler = () => applyTheme();
    window.addEventListener("theme-changed", handler);

    return () => {
      cancelled = true;
      window.removeEventListener("theme-changed", handler);
    };
  }, [status]);

  return null;
}
