"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { subDays, format, eachDayOfInterval, getDay } from "date-fns";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type DisciplineTrendStatus = "fire" | "good" | "low" | "miss";

export type DisciplineTrendPoint = {
  day: string;       // "Mon", "Tue", ... veya "Pzt", "Sal", ...
  date: string;      // "2026-04-06"
  completed: number;
  total: number;
  score: number;     // 0-100 tamamlanma yÃ¼zdesi
  status: DisciplineTrendStatus;
};

function resolveStatus(score: number): DisciplineTrendStatus {
  if (score >= 80) return "fire";
  if (score >= 50) return "good";
  if (score > 0) return "low";
  return "miss";
}

// â”€â”€â”€ GÃ¼n Detay TÃ¼rleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type DayRoutineDetail = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  completed: boolean;
};

export type DayDetailData = {
  date: string;
  day: string;
  score: number;
  status: DisciplineTrendStatus;
  routines: DayRoutineDetail[];
};

export type DisciplineTrendData = {
  points: DisciplineTrendPoint[];
  weekKey: string;
  avgScore: number;
  trend: "up" | "down" | "stable";
  streakDays: number;        // kaÃ§ gÃ¼n Ã¼st Ã¼ste â‰¥ %50
  biggestDrop: { from: string; to: string; delta: number } | null;
  biggestSurge: { from: string; to: string; delta: number } | null;
};

// â”€â”€â”€ GÃ¼n AdlarÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SHORT_DAYS_TR = ["Paz", "Pzt", "Sal", "Ã‡ar", "Per", "Cum", "Cmt"];
const SHORT_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// â”€â”€â”€ Hafta AnahtarÄ± (AI ile aynÄ±) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { getISOWeek, getISOWeekYear } from "date-fns";

function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// â”€â”€â”€ Ana Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getDisciplineTrend(
  locale?: string
): Promise<DisciplineTrendData> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const lang = locale ?? (session.user as any).language ?? "en";

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekAgo = subDays(today, 6);

  const [dailyRoutines, logs] = await Promise.all([
    prisma.routine.findMany({
      where: { userId, isActive: true, frequency: "DAILY" },
      select: { id: true },
    }),
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: weekAgo } },
      select: { completedAt: true },
    }),
  ]);

  const totalRoutines = dailyRoutines.length;
  const days = eachDayOfInterval({ start: weekAgo, end: today });
  const dayNames = lang === "tr" ? SHORT_DAYS_TR : SHORT_DAYS_EN;

  const points: DisciplineTrendPoint[] = days.map((d) => {
    const dayStart = new Date(d);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const completed = logs.filter(
      (l) => l.completedAt >= dayStart && l.completedAt <= dayEnd
    ).length;

    const total = totalRoutines;
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      day: dayNames[getDay(d)] ?? "",
      date: format(d, "yyyy-MM-dd"),
      completed,
      total,
      score,
      status: resolveStatus(score),
    };
  });

  // Ortalama skor
  const avgScore =
    points.length > 0
      ? Math.round(points.reduce((s, p) => s + p.score, 0) / points.length)
      : 0;

  // Trend: ilk yarÄ± vs ikinci yarÄ±
  const mid = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, mid);
  const secondHalf = points.slice(mid);
  const avgFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((s, p) => s + p.score, 0) / firstHalf.length
      : 0;
  const avgSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((s, p) => s + p.score, 0) / secondHalf.length
      : 0;
  const diff = avgSecond - avgFirst;
  const trend: "up" | "down" | "stable" =
    diff > 10 ? "up" : diff < -10 ? "down" : "stable";

  // Ãœst Ã¼ste â‰¥%50 gÃ¼n sayÄ±sÄ± (sondan baÅŸlayarak)
  let streakDays = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.score >= 50) streakDays++;
    else break;
  }

  // En bÃ¼yÃ¼k dÃ¼ÅŸÃ¼ÅŸ ve artÄ±ÅŸ (ardÄ±ÅŸÄ±k gÃ¼nler arasÄ±)
  let biggestDrop: DisciplineTrendData["biggestDrop"] = null;
  let biggestSurge: DisciplineTrendData["biggestSurge"] = null;

  for (let i = 1; i < points.length; i++) {
    const delta = points[i]!.score - points[i - 1]!.score;
    if (delta < 0 && (!biggestDrop || delta < biggestDrop.delta)) {
      biggestDrop = {
        from: points[i - 1]!.day,
        to: points[i]!.day,
        delta,
      };
    }
    if (delta > 0 && (!biggestSurge || delta > biggestSurge.delta)) {
      biggestSurge = {
        from: points[i - 1]!.day,
        to: points[i]!.day,
        delta,
      };
    }
  }

  return {
    points,
    weekKey: getCurrentWeekKey(),
    avgScore,
    trend,
    streakDays,
    biggestDrop,
    biggestSurge,
  };
}

// â”€â”€â”€ GÃ¼n Detay Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getDayDetail(
  date: string,
  locale?: string
): Promise<DayDetailData> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const lang = locale ?? (session.user as any).language ?? "en";

  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");
  const dayNames = lang === "tr" ? SHORT_DAYS_TR : SHORT_DAYS_EN;

  const [routines, logs] = await Promise.all([
    prisma.routine.findMany({
      where: { userId, isActive: true, frequency: "DAILY" },
      select: { id: true, title: true, icon: true, category: true },
    }),
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: dayStart, lte: dayEnd } },
      select: { routineId: true },
    }),
  ]);

  const completedIds = new Set(logs.map((l) => l.routineId));
  const total = routines.length;
  const completed = routines.filter((r) => completedIds.has(r.id)).length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    date,
    day: dayNames[new Date(date + "T12:00:00Z").getUTCDay()] ?? "",
    score,
    status: resolveStatus(score),
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      emoji: r.icon ?? "📋",
      category: r.category,
      completed: completedIds.has(r.id),
    })),
  };
}

// â”€â”€â”€ BugÃ¼nkÃ¼ Disiplin Skoru â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type TodayDisciplineScore = {
  completed: number;
  total: number;
  score: number; // 0-100
};

export async function getTodayDisciplineScoreAction(): Promise<TodayDisciplineScore> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [totalRoutines, completedLogs] = await Promise.all([
    prisma.routine.count({
      where: { userId, isActive: true, frequency: "DAILY" },
    }),
    prisma.routineLog.count({
      where: { userId, completedAt: { gte: todayStart, lt: tomorrowStart } },
    }),
  ]);

  const total = totalRoutines;
  const completed = Math.min(completedLogs, total); // can't exceed total
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, score };
}
