"use client";

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

const NEON_GREEN = "#39FF14";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-zinc-800/50 bg-card/90 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center gap-0.5 py-1"
              >
                <Icon
                  className="h-5 w-5 transition-colors"
                  style={
                    isActive
                      ? {
                          color: NEON_GREEN,
                          filter: `drop-shadow(0 0 6px ${NEON_GREEN}) drop-shadow(0 0 14px ${NEON_GREEN}80)`,
                        }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                />
                <span
                  className="text-[10px] font-medium leading-none transition-colors"
                  style={
                    isActive
                      ? {
                          color: NEON_GREEN,
                          textShadow: `0 0 6px ${NEON_GREEN}60`,
                        }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {t(item.key)}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                    style={{
                      background: NEON_GREEN,
                      boxShadow: `0 0 8px ${NEON_GREEN}, 0 0 16px ${NEON_GREEN}60`,
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
