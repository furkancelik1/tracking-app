import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DailyCompletionPoint = {
  date: string;
  count: number;
  label: string; // "01 Nis" gibi kısa etiket
};

export type CategoryDistributionPoint = {
  category: string;
  count: number;
};

export type PeakDay = {
  day: string; // "Pazartesi", "Salı", ...
  dayIndex: number; // 0=Pazar, 6=Cumartesi
  count: number;
};

export type AnalyticsSummary = {
  totalCompletions: number;
  longestStreak: number;
  currentStreak: number;
  completionRate: number; // 0-100
  monthlySuccessRate: number; // 0-100
  activeRoutines: number;
  peakDay: PeakDay;
  averagePerDay: number;
};

export type AnalyticsPayload = {
  rangeDays: number;
  dailyCompletions: DailyCompletionPoint[];
  categoryDistribution: CategoryDistributionPoint[];
  summary: AnalyticsSummary;
};

// ─── Advanced Analytics Types ────────────────────────────────────────────────

export type RoutineSuccessRate = {
  routineId: string;
  name: string;
  category: string;
  color: string;
  icon: string;
  completedDays: number;
  totalDays: number;
  successRate: number; // 0-100
};

export type WeekdayPerformance = {
  day: string;
  dayIndex: number;
  completions: number;
  average: number; // average per that weekday
};

export type MonthlyComparison = {
  thisMonth: number;
  lastMonth: number;
  changePercent: number; // positive = improvement
};

export type Insight = {
  type: "positive" | "warning" | "neutral";
  key: string;
  params: Record<string, string | number>;
};

export type AdvancedAnalyticsPayload = {
  routineSuccessRates: RoutineSuccessRate[];
  weekdayPerformance: WeekdayPerformance[];
  monthlyComparison: MonthlyComparison;
  insights: Insight[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TR_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

const TR_DAYS = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba",
  "Perşembe", "Cuma", "Cumartesi",
];

function startOfUtcDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addUtcDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + amount);
  return d;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toShortLabel(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = TR_MONTHS_SHORT[date.getUTCMonth()] ?? "";
  return `${day} ${month}`;
}

function getLastNDaysWindow(days: number) {
  const end = startOfUtcDay(new Date());
  const start = addUtcDays(end, -(days - 1));
  return { start, end };
}

// ─── Current streak hesaplama ────────────────────────────────────────────────

function calculateCurrentStreak(dayMap: Map<string, number>): number {
  const today = startOfUtcDay(new Date());
  let streak = 0;

  for (let i = 0; ; i++) {
    const d = addUtcDays(today, -i);
    const key = toIsoDate(d);
    const count = dayMap.get(key);
    if (count === undefined || count <= 0) {
      // İlk gün (bugün) 0 ise streak kırılmamış, dünden bak
      if (i === 0) continue;
      break;
    }
    streak++;
  }
  return streak;
}

// ─── Peak day hesaplama ──────────────────────────────────────────────────────

function calculatePeakDay(logs: { completedAt: Date }[]): PeakDay {
  if (logs.length === 0) {
    return { day: "Pazartesi", dayIndex: 1, count: 0 };
  }
  const dayCounts = new Array(7).fill(0) as number[];
  for (const log of logs) {
    const idx = log.completedAt.getUTCDay();
    dayCounts[idx] = (dayCounts[idx] ?? 0) + 1;
  }
  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if ((dayCounts[i] ?? 0) > (dayCounts[maxIdx] ?? 0)) maxIdx = i;
  }
  return {
    day: TR_DAYS[maxIdx] ?? "Pazartesi",
    dayIndex: maxIdx,
    count: dayCounts[maxIdx] ?? 0,
  };
}

// ─── Main analytics function ─────────────────────────────────────────────────

export async function getUserAnalytics(
  userId: string,
  days = 30
): Promise<AnalyticsPayload> {
  try {
    const { start, end } = getLastNDaysWindow(days);
    const endExclusive = addUtcDays(end, 1);

    // Son 30 gün başarı oranı için ayrı pencere
    const month30 = getLastNDaysWindow(30);
    const month30End = addUtcDays(month30.end, 1);

    const [logs, totalAggregate, routineAggregate, activeCount, monthlyLogs, allTimeLogs] =
      await Promise.all([
        // Range içindeki loglar (grafik + kategori)
        prisma.routineLog.findMany({
          where: {
            userId,
            completedAt: { gte: start, lt: endExclusive },
          },
          select: {
            completedAt: true,
            routine: { select: { category: true } },
          },
          orderBy: { completedAt: "asc" },
        }),
        // Toplam tamamlama (range)
        prisma.routineLog.aggregate({
          where: {
            userId,
            completedAt: { gte: start, lt: endExclusive },
          },
          _count: { _all: true },
        }),
        // En uzun seri & mevcut seri
        prisma.routine.aggregate({
          where: { userId, isActive: true },
          _max: { longestStreak: true, currentStreak: true },
        }),
        // Aktif rutin sayısı
        prisma.routine.count({
          where: { userId, isActive: true },
        }),
        // Son 30 gün logları (monthly success rate)
        prisma.routineLog.findMany({
          where: {
            userId,
            completedAt: { gte: month30.start, lt: month30End },
          },
          select: { completedAt: true },
        }),
        // Tüm zamanlar logları (streak hesaplaması için max 400 gün)
        prisma.routineLog.findMany({
          where: {
            userId,
            completedAt: { gte: addUtcDays(startOfUtcDay(new Date()), -400) },
          },
          select: { completedAt: true },
          orderBy: { completedAt: "desc" },
        }),
      ]);

    // ── Daily completions map ─────────────────────────────────────────────

    const dayMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const d = addUtcDays(start, i);
      dayMap.set(toIsoDate(d), 0);
    }

    for (const log of logs) {
      const dayKey = toIsoDate(log.completedAt);
      dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);

      const category = log.routine?.category?.trim() || "Genel";
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    }

    const dailyCompletions: DailyCompletionPoint[] = Array.from(
      dayMap.entries()
    ).map(([date, count]) => {
      const d = new Date(date + "T00:00:00Z");
      return { date, count, label: toShortLabel(d) };
    });

    const categoryDistribution: CategoryDistributionPoint[] = Array.from(
      categoryMap.entries()
    )
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ── Summary hesaplamaları ─────────────────────────────────────────────

    const totalCompletions = totalAggregate._count._all ?? 0;
    const longestStreak = routineAggregate._max.longestStreak ?? 0;

    // Current streak: all-time logların gün bazında unique sayısı
    const allTimeDayMap = new Map<string, number>();
    for (const log of allTimeLogs) {
      const key = toIsoDate(log.completedAt);
      allTimeDayMap.set(key, (allTimeDayMap.get(key) ?? 0) + 1);
    }
    const currentStreak = calculateCurrentStreak(allTimeDayMap);

    // Completion rate: kaç günde en az 1 log var
    const daysWithActivity = Array.from(dayMap.values()).filter((c) => c > 0).length;
    const completionRate = days > 0 ? Math.round((daysWithActivity / days) * 100) : 0;

    // Monthly success rate: son 30 günde kaç gün aktif
    const monthDaySet = new Set<string>();
    for (const log of monthlyLogs) {
      monthDaySet.add(toIsoDate(log.completedAt));
    }
    const monthlySuccessRate = Math.round((monthDaySet.size / 30) * 100);

    // Peak day
    const peakDay = calculatePeakDay(logs);

    // Average per day
    const averagePerDay = days > 0 ? Math.round((totalCompletions / days) * 10) / 10 : 0;

    return {
      rangeDays: days,
      dailyCompletions,
      categoryDistribution,
      summary: {
        totalCompletions,
        longestStreak,
        currentStreak,
        completionRate,
        monthlySuccessRate,
        activeRoutines: activeCount,
        peakDay,
        averagePerDay,
      },
    };
  } catch (error) {
    console.error("[analytics] getUserAnalytics error:", error);
    return {
      rangeDays: days,
      dailyCompletions: Array.from({ length: days }, (_, i) => {
        const { start } = getLastNDaysWindow(days);
        const d = addUtcDays(start, i);
        return { date: toIsoDate(d), count: 0, label: toShortLabel(d) };
      }),
      categoryDistribution: [],
      summary: {
        totalCompletions: 0,
        longestStreak: 0,
        currentStreak: 0,
        completionRate: 0,
        monthlySuccessRate: 0,
        activeRoutines: 0,
        peakDay: { day: "Pazartesi", dayIndex: 1, count: 0 },
        averagePerDay: 0,
      },
    };
  }
}

// ─── Advanced Analytics ──────────────────────────────────────────────────────

export async function getAdvancedAnalytics(
  userId: string,
  days = 30
): Promise<AdvancedAnalyticsPayload> {
  try {
    const { start, end } = getLastNDaysWindow(days);
    const endExclusive = addUtcDays(end, 1);

    // Previous period for monthly comparison
    const prevStart = addUtcDays(start, -days);

    const [routines, logs, prevLogs] = await Promise.all([
      prisma.routine.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          title: true,
          category: true,
          color: true,
          icon: true,
          createdAt: true,
        },
      }),
      prisma.routineLog.findMany({
        where: {
          userId,
          completedAt: { gte: start, lt: endExclusive },
        },
        select: {
          completedAt: true,
          routineId: true,
        },
        orderBy: { completedAt: "asc" },
      }),
      prisma.routineLog.findMany({
        where: {
          userId,
          completedAt: { gte: prevStart, lt: start },
        },
        select: { completedAt: true },
      }),
    ]);

    // ── Routine Success Rates ───────────────────────────────────────────

    const routineSuccessRates: RoutineSuccessRate[] = routines.map((r) => {
      const routineLogs = logs.filter((l) => l.routineId === r.id);
      const uniqueDays = new Set(routineLogs.map((l) => toIsoDate(l.completedAt)));
      const routineAge = Math.max(
        1,
        Math.min(
          days,
          Math.ceil(
            (endExclusive.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      );
      const successRate = routineAge > 0 ? Math.round((uniqueDays.size / routineAge) * 100) : 0;

      return {
        routineId: r.id,
        name: r.title,
        category: r.category,
        color: r.color ?? "#3b82f6",
        icon: r.icon ?? "Check",
        completedDays: uniqueDays.size,
        totalDays: routineAge,
        successRate: Math.min(100, successRate),
      };
    }).sort((a, b) => b.successRate - a.successRate);

    // ── Weekday Performance ─────────────────────────────────────────────

    const weekdayCounts = new Array(7).fill(0) as number[];
    const weekdayOccurrences = new Array(7).fill(0) as number[];

    // Count how many of each weekday exist in the range
    for (let i = 0; i < days; i++) {
      const d = addUtcDays(start, i);
      weekdayOccurrences[d.getUTCDay()] = (weekdayOccurrences[d.getUTCDay()] ?? 0) + 1;
    }

    for (const log of logs) {
      const idx = log.completedAt.getUTCDay();
      weekdayCounts[idx] = (weekdayCounts[idx] ?? 0) + 1;
    }

    // Reorder: Mon(1) .. Sun(0)
    const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekdayPerformance: WeekdayPerformance[] = weekdayOrder.map((idx) => ({
      day: TR_DAYS[idx] ?? "",
      dayIndex: idx,
      completions: weekdayCounts[idx] ?? 0,
      average:
        (weekdayOccurrences[idx] ?? 0) > 0
          ? Math.round(((weekdayCounts[idx] ?? 0) / (weekdayOccurrences[idx] ?? 1)) * 10) / 10
          : 0,
    }));

    // ── Monthly Comparison ──────────────────────────────────────────────

    const thisMonthDays = new Set(logs.map((l) => toIsoDate(l.completedAt))).size;
    const lastMonthDays = new Set(prevLogs.map((l) => toIsoDate(l.completedAt))).size;
    const changePercent =
      lastMonthDays > 0
        ? Math.round(((thisMonthDays - lastMonthDays) / lastMonthDays) * 100)
        : thisMonthDays > 0
          ? 100
          : 0;

    const monthlyComparison: MonthlyComparison = {
      thisMonth: thisMonthDays,
      lastMonth: lastMonthDays,
      changePercent,
    };

    // ── Insights ────────────────────────────────────────────────────────

    const insights: Insight[] = [];

    // Best weekday insight
    const bestWeekday = weekdayPerformance.reduce(
      (best, w) => (w.completions > best.completions ? w : best),
      weekdayPerformance[0]!
    );
    if (bestWeekday.completions > 0) {
      insights.push({
        type: "positive",
        key: "bestWeekday",
        params: { day: bestWeekday.day, count: bestWeekday.completions },
      });
    }

    // Most disciplined routine
    const topRoutine = routineSuccessRates[0];
    if (topRoutine && topRoutine.successRate >= 50) {
      insights.push({
        type: "positive",
        key: "topRoutine",
        params: { name: topRoutine.name, rate: topRoutine.successRate },
      });
    }

    // Needs focus routine
    const weakRoutine = routineSuccessRates[routineSuccessRates.length - 1];
    if (
      weakRoutine &&
      routineSuccessRates.length > 1 &&
      weakRoutine.successRate < 40
    ) {
      insights.push({
        type: "warning",
        key: "weakRoutine",
        params: { name: weakRoutine.name, rate: weakRoutine.successRate },
      });
    }

    // Monthly improvement
    if (monthlyComparison.changePercent > 0 && monthlyComparison.lastMonth > 0) {
      insights.push({
        type: "positive",
        key: "monthlyImprovement",
        params: { percent: monthlyComparison.changePercent },
      });
    } else if (monthlyComparison.changePercent < 0 && monthlyComparison.lastMonth > 0) {
      insights.push({
        type: "warning",
        key: "monthlyDecline",
        params: { percent: Math.abs(monthlyComparison.changePercent) },
      });
    }

    // Weekend vs weekday
    const weekdayTotal =
      (weekdayCounts[1] ?? 0) + (weekdayCounts[2] ?? 0) + (weekdayCounts[3] ?? 0) +
      (weekdayCounts[4] ?? 0) + (weekdayCounts[5] ?? 0);
    const weekendTotal = (weekdayCounts[0] ?? 0) + (weekdayCounts[6] ?? 0);
    const weekdayAvg = weekdayTotal / 5;
    const weekendAvg = weekendTotal / 2;
    if (weekendAvg > weekdayAvg * 1.3 && weekendTotal > 0) {
      insights.push({
        type: "neutral",
        key: "weekendWarrior",
        params: {},
      });
    } else if (weekdayAvg > weekendAvg * 1.3 && weekdayTotal > 0) {
      insights.push({
        type: "neutral",
        key: "weekdayWarrior",
        params: {},
      });
    }

    return {
      routineSuccessRates,
      weekdayPerformance,
      monthlyComparison,
      insights,
    };
  } catch (error) {
    console.error("[analytics] getAdvancedAnalytics error:", error);
    return {
      routineSuccessRates: [],
      weekdayPerformance: [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
        day: TR_DAYS[idx] ?? "",
        dayIndex: idx,
        completions: 0,
        average: 0,
      })),
      monthlyComparison: { thisMonth: 0, lastMonth: 0, changePercent: 0 },
      insights: [],
    };
  }
}
