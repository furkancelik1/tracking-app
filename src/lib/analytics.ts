import { prisma } from "@/lib/prisma";

export type DailyCompletionPoint = {
  date: string;
  count: number;
};

export type CategoryDistributionPoint = {
  category: string;
  count: number;
};

export type AnalyticsSummary = {
  totalCompletions: number;
  longestStreak: number;
};

export type AnalyticsPayload = {
  rangeDays: number;
  dailyCompletions: DailyCompletionPoint[];
  categoryDistribution: CategoryDistributionPoint[];
  summary: AnalyticsSummary;
};

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

function getLastNDaysWindow(days: number) {
  const end = startOfUtcDay(new Date());
  const start = addUtcDays(end, -(days - 1));
  return { start, end };
}

export async function getUserAnalytics(
  userId: string,
  days = 30
): Promise<AnalyticsPayload> {
  try {
    const { start, end } = getLastNDaysWindow(days);
    const endExclusive = addUtcDays(end, 1);

    const [logs, totalAggregate, routineAggregate] = await Promise.all([
      prisma.routineLog.findMany({
        where: {
          userId,
          completedAt: {
            gte: start,
            lt: endExclusive,
          },
        },
        select: {
          completedAt: true,
          routine: {
            select: {
              category: true,
            },
          },
        },
        orderBy: { completedAt: "asc" },
      }),
      prisma.routineLog.aggregate({
        where: {
          userId,
          completedAt: {
            gte: start,
            lt: endExclusive,
          },
        },
        _count: { _all: true },
      }),
      prisma.routine.aggregate({
        where: { userId, isActive: true },
        _max: { longestStreak: true },
      }),
    ]);

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
    ).map(([date, count]) => ({ date, count }));

    const categoryDistribution: CategoryDistributionPoint[] = Array.from(
      categoryMap.entries()
    )
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      rangeDays: days,
      dailyCompletions,
      categoryDistribution,
      summary: {
        totalCompletions: totalAggregate._count._all ?? 0,
        longestStreak: routineAggregate._max.longestStreak ?? 0,
      },
    };
  } catch (error) {
    console.error("[analytics] getUserAnalytics error:", error);
    return {
      rangeDays: days,
      dailyCompletions: Array.from({ length: days }, (_, i) => {
        const { start } = getLastNDaysWindow(days);
        return { date: toIsoDate(addUtcDays(start, i)), count: 0 };
      }),
      categoryDistribution: [],
      summary: {
        totalCompletions: 0,
        longestStreak: 0,
      },
    };
  }
}
