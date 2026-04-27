"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { RoutineWithMeta } from "@/hooks/useRoutines";

type Props = {
  routines: RoutineWithMeta[];
};

function isTodayCompleted(routine: RoutineWithMeta, todayISO: string): boolean {
  return routine.logs.some((l) => l.completedAt >= todayISO);
}

function getProgressColor(pct: number): string {
  if (pct <= 25) return `hsl(${pct * 1.2}, 85%, 50%)`;
  if (pct <= 50) return `hsl(${30 + (pct - 25) * 0.8}, 85%, 50%)`;
  if (pct <= 75) return `hsl(${50 + (pct - 50) * 1.2}, 80%, 45%)`;
  return `hsl(${80 + (pct - 75) * 1.6}, 75%, 42%)`;
}

export function RoutineProgressBar({ routines }: Props) {
  const t = useTranslations("dashboard.progressBar");
  const [isMounted, setIsMounted] = useState(false);
  const [todayISO, setTodayISO] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("label")}</span>
          <span className="font-medium tabular-nums">...</span>
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    );
  }
  useEffect(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    setTodayISO(d.toISOString());
  }, []);

  const total = routines.length;
  const completed = todayISO
    ? routines.filter((r) => isTodayCompleted(r, todayISO)).length
    : 0;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const color = getProgressColor(pct);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("label")}</span>
        <motion.span
          key={completed}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-medium tabular-nums"
        >
          {t("completed", { completed, total })}
        </motion.span>
      </div>

      <div className="relative h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        {pct > 0 && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full opacity-25"
            style={{
              background: "linear-gradient(90deg, transparent, white 50%, transparent)",
              width: "30%",
            }}
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
}
