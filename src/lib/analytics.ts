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
