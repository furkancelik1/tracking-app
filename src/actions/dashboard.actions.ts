"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  startOfDay,
  subDays,
  addDays,
  format,
  getDay,
  differenceInCalendarDays,
} from "date-fns";
import { tr } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WeeklyChartPoint = {
  name: string; // "Pzt", "Sal", ...
  completed: number;
};

export type TodayProgress = {
  completed: number;
  total: number;
  percentage: number;
};

export type DashboardStats = {
  todayProgress: TodayProgress;
  activeStreak: number;
  weeklyProductivity: number; // 0-100
  totalCompletions: number;
  trends: {
    todayVsYesterday: number; // % change
    thisWeekVsLastWeek: number; // % change
    streakChange: number; // +/- vs last known
  };
};

export type DashboardPayload = {
  stats: DashboardStats;
  weeklyChart: WeeklyChartPoint[];
  isEmpty: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TR_DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;

function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Main Server Action ──────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardPayload> {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = subDays(todayStart, 1);
  const sevenDaysAgo = subDays(todayStart, 6); // This week: today - 6 days
  const fourteenDaysAgo = subDays(todayStart, 13); // Last week window
  const tomorrowStart = addDays(todayStart, 1);

  // ── Paralel DB sorguları ────────────────────────────────────────────────

  const [
    activeRoutines,
    todayLogs,
    yesterdayLogCount,
    thisWeekLogs,
    lastWeekLogs,
    streakData,
  ] = await Promise.all([
    // Aktif rutin sayısı + listesi (bugünkü tamamlanma oranı için)
    prisma.routine.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        currentStreak: true,
        logs: {
          where: { completedAt: { gte: todayStart, lt: tomorrowStart } },
          select: { id: true },
          take: 1,
        },
      },
    }),

    // Bugünkü toplam log
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: todayStart, lt: tomorrowStart } },
    }),

    // Dünkü toplam log (trend karşılaştırması)
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: yesterdayStart, lt: todayStart } },
    }),

    // Bu hafta logları (gün gün chart + toplam)
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: sevenDaysAgo, lt: tomorrowStart } },
      select: { completedAt: true },
    }),

    // Geçen hafta logları (trend karşılaştırması)
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    }),

    // Streak hesaplama: son 60 günün gün bazında log varlığı
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: subDays(todayStart, 60) } },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // ── Empty state kontrolü ──────────────────────────────────────────────

  const isEmpty = activeRoutines.length === 0;

  // ── Today progress ────────────────────────────────────────────────────

  const completedToday = activeRoutines.filter((r) => r.logs.length > 0).length;
  const totalActive = activeRoutines.length;
  const todayProgress: TodayProgress = {
    completed: completedToday,
    total: totalActive,
    percentage: totalActive > 0 ? Math.round((completedToday / totalActive) * 100) : 0,
  };

  // ── Weekly chart (Recharts format) ────────────────────────────────────

  const weeklyChart: WeeklyChartPoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(sevenDaysAgo, i);
    const dayEnd = addDays(day, 1);
    const count = thisWeekLogs.filter(
      (l) => l.completedAt >= day && l.completedAt < dayEnd
    ).length;
    return {
      name: TR_DAY_SHORT[getDay(day)] ?? "",
      completed: count,
    };
  });

  // ── Weekly productivity ───────────────────────────────────────────────

  const thisWeekTotal = thisWeekLogs.length;
  const maxPossibleThisWeek = totalActive * 7;
  const weeklyProductivity =
    maxPossibleThisWeek > 0
      ? Math.round((thisWeekTotal / maxPossibleThisWeek) * 100)
      : 0;

  // ── Active streak ─────────────────────────────────────────────────────

  const daySet = new Set<string>();
  for (const log of streakData) {
    daySet.add(format(log.completedAt, "yyyy-MM-dd"));
  }

  let activeStreak = 0;
  for (let i = 0; i <= 60; i++) {
    const day = subDays(todayStart, i);
    const key = format(day, "yyyy-MM-dd");
    if (daySet.has(key)) {
      activeStreak++;
    } else {
      // Bugün henüz tamamlama yoksa dünden say
      if (i === 0) continue;
      break;
    }
  }

  // ── Trends ────────────────────────────────────────────────────────────

  const trends = {
    todayVsYesterday: calcPercentChange(todayLogs, yesterdayLogCount),
    thisWeekVsLastWeek: calcPercentChange(thisWeekTotal, lastWeekLogs),
    streakChange: activeStreak, // basit gösterim
  };

  // ── Total completions (this week) ─────────────────────────────────────

  return {
    stats: {
      todayProgress,
      activeStreak,
      weeklyProductivity,
      totalCompletions: thisWeekTotal,
      trends,
    },
    weeklyChart,
    isEmpty,
  };
}
