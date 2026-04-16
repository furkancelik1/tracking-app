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
import { useStreakFreeze } from "@/actions/shop.actions";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TR_DAY_SHORT = ["Paz", "Pzt", "Sal", "Ã‡ar", "Per", "Cum", "Cmt"] as const;

function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// â”€â”€â”€ Main Server Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getDashboardData(): Promise<DashboardPayload> {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = subDays(todayStart, 1);
  const sevenDaysAgo = subDays(todayStart, 6); // This week: today - 6 days
  const fourteenDaysAgo = subDays(todayStart, 13); // Last week window
  const tomorrowStart = addDays(todayStart, 1);

  // â”€â”€ Paralel DB sorgularÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [
    activeRoutines,
    todayLogs,
    yesterdayLogCount,
    thisWeekLogs,
    lastWeekLogs,
    streakData,
  ] = await Promise.all([
    // Aktif rutin sayÄ±sÄ± + listesi (bugÃ¼nkÃ¼ tamamlanma oranÄ± iÃ§in)
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

    // BugÃ¼nkÃ¼ toplam log
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: todayStart, lt: tomorrowStart } },
    }),

    // DÃ¼nkÃ¼ toplam log (trend karÅŸÄ±laÅŸtÄ±rmasÄ±)
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: yesterdayStart, lt: todayStart } },
    }),

    // Bu hafta loglarÄ± (gÃ¼n gÃ¼n chart + toplam)
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: sevenDaysAgo, lt: tomorrowStart } },
      select: { completedAt: true },
    }),

    // GeÃ§en hafta loglarÄ± (trend karÅŸÄ±laÅŸtÄ±rmasÄ±)
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    }),

    // Streak hesaplama: son 60 gÃ¼nÃ¼n gÃ¼n bazÄ±nda log varlÄ±ÄŸÄ±
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: subDays(todayStart, 60) } },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // â”€â”€ Empty state kontrolÃ¼ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isEmpty = activeRoutines.length === 0;

  // â”€â”€ Today progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const completedToday = activeRoutines.filter((r) => r.logs.length > 0).length;
  const totalActive = activeRoutines.length;
  const todayProgress: TodayProgress = {
    completed: completedToday,
    total: totalActive,
    percentage: totalActive > 0 ? Math.round((completedToday / totalActive) * 100) : 0,
  };

  // â”€â”€ Weekly chart (Recharts format) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Weekly productivity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const thisWeekTotal = thisWeekLogs.length;
  const maxPossibleThisWeek = totalActive * 7;
  const weeklyProductivity =
    maxPossibleThisWeek > 0
      ? Math.round((thisWeekTotal / maxPossibleThisWeek) * 100)
      : 0;

  // â”€â”€ Active streak â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const daySet = new Set<string>();
  for (const log of streakData) {
    daySet.add(format(log.completedAt, "yyyy-MM-dd"));
  }

  let activeStreak = 0;
  let usedFreeze = false;
  for (let i = 0; i <= 60; i++) {
    const day = subDays(todayStart, i);
    const key = format(day, "yyyy-MM-dd");
    if (daySet.has(key)) {
      activeStreak++;
    } else {
      // BugÃ¼n henÃ¼z tamamlama yoksa dÃ¼nden say
      if (i === 0) continue;
      // Streak Freeze: bir boÅŸluÄŸa tolerans gÃ¶ster ve bir dondurucu harca
      if (!usedFreeze) {
        const froze = await useStreakFreeze(userId);
        if (froze) {
          usedFreeze = true;
          activeStreak++; // dondurulan gÃ¼n streak'e dahil
          continue;
        }
      }
      break;
    }
  }

  // â”€â”€ Trends â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const trends = {
    todayVsYesterday: calcPercentChange(todayLogs, yesterdayLogCount),
    thisWeekVsLastWeek: calcPercentChange(thisWeekTotal, lastWeekLogs),
    streakChange: activeStreak, // basit gÃ¶sterim
  };

  // â”€â”€ Total completions (this week) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Yearly Activity Heatmap Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type YearlyHeatPoint = {
  date: string;   // "2026-04-11"
  count: number;
};

/**
 * Son 365 gÃ¼nlÃ¼k rutin tamamlama verisini gÃ¼n bazÄ±nda grupla.
 * Her gÃ¼n iÃ§in { date, count } dÃ¶ner â€” boÅŸ gÃ¼nler 0 ile doldurulur.
 */
export async function getYearlyActivityData(): Promise<YearlyHeatPoint[]> {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const todayStart = startOfDay(new Date());
  const yearAgo = subDays(todayStart, 364);

  const logs = await prisma.routineLog.findMany({
    where: {
      userId,
      completedAt: { gte: yearAgo },
    },
    select: { completedAt: true },
  });

  // GÃ¼n bazÄ±nda grupla
  const countMap = new Map<string, number>();
  for (const log of logs) {
    const key = format(log.completedAt, "yyyy-MM-dd");
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  // 365 gÃ¼nlÃ¼k tam dizi oluÅŸtur (boÅŸ gÃ¼nler 0)
  const result: YearlyHeatPoint[] = [];
  for (let i = 0; i <= 364; i++) {
    const day = addDays(yearAgo, i);
    const key = format(day, "yyyy-MM-dd");
    result.push({ date: key, count: countMap.get(key) ?? 0 });
  }

  return result;
}
