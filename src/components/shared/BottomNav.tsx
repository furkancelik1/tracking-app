"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Route } from "next";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Home,
  Store,
  Users,
  Trophy,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard" as Route, key: "routines", icon: Home },
  { href: "/marketplace" as Route, key: "marketplace", icon: Store },
  { href: "/social" as Route, key: "social", icon: Users },
  { href: "/leaderboard" as Route, key: "leaderboard", icon: Trophy },
  { href: "/settings" as Route, key: "settings", icon: Settings },
] as const;

const VOLT = "#D6FF00";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-1 pt-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[48px] min-w-0 flex-1 touch-manipulation items-stretch justify-center"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="relative flex w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1"
              >
                <Icon
                  className="h-[22px] w-[22px] shrink-0 transition-colors"
                  aria-hidden
                  style={
                    isActive
                      ? {
                          color: VOLT,
                          filter: `drop-shadow(0 0 6px ${VOLT}) drop-shadow(0 0 12px ${VOLT}99)`,
                        }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                />
                <span
                  className="max-w-full truncate text-center text-[10px] font-semibold leading-tight transition-colors"
                  style={
                    isActive
                      ? {
                          color: VOLT,
                          textShadow: `0 0 8px ${VOLT}66`,
                        }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {t(item.key)}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                    style={{
                      background: VOLT,
                      boxShadow: `0 0 10px ${VOLT}, 0 0 18px ${VOLT}66`,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
