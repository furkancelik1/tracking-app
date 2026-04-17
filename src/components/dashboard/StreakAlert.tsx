"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RoutineWithMeta } from "@/hooks/useRoutines";

type Props = {
  routines: RoutineWithMeta[];
};

/** Bugün tamamlanmamış ve aktif serisi olan rutinleri döner. */
function getAtRiskRoutines(
  routines: RoutineWithMeta[],
  todayIso: string | null
): RoutineWithMeta[] {
  if (!todayIso) return [];
  const todayUTC = new Date(todayIso);
  if (Number.isNaN(todayUTC.getTime())) return [];

  return routines.filter((r) => {
    if (r.currentStreak === 0) return false;
    const completedToday = r.logs.some(
      (l) => new Date(l.completedAt) >= todayUTC
    );
    return !completedToday;
  });
}

export function StreakAlert({ routines }: Props) {
  const t = useTranslations("dashboard.streakAlert");
  const [todayIso, setTodayIso] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    setTodayIso(d.toISOString());
  }, []);
  const atRisk = useMemo(() => getAtRiskRoutines(routines, todayIso), [routines, todayIso]);
  const atRiskCount = atRisk.length;
  if (atRiskCount === 0) return null;

  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20 px-4 py-3.5 flex items-start gap-3"
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, -4, 0] }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <AlertTriangle
          size={18}
          className="text-red-500 shrink-0 mt-0.5"
          aria-hidden
        />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
          {atRiskCount === 1
            ? t("titleSingle", { count: atRiskCount })
            : t("title", { count: atRiskCount })}
        </p>
        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
          {atRisk.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 mr-2"
            >
              <span
                className="inline-block size-2 rounded-full shrink-0"
                style={{ backgroundColor: r.color }}
              />
              <span className="font-medium">{r.title}</span>
              <span className="text-red-500">🔥{r.currentStreak}</span>
            </span>
          ))}
        </p>
      </div>
    </motion.div>
  );
}
