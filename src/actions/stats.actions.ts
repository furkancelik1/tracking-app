"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { subDays, format, eachDayOfInterval, getDay } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DisciplineTrendStatus = "fire" | "good" | "low" | "miss";

export type DisciplineTrendPoint = {
  day: string;       // "Mon", "Tue", ... veya "Pzt", "Sal", ...
  date: string;      // "2026-04-06"
  completed: number;
  total: number;
  score: number;     // 0-100 tamamlanma yüzdesi
  status: DisciplineTrendStatus;
};

function resolveStatus(score: number): DisciplineTrendStatus {
  if (score >= 80) return "fire";
  if (score >= 50) return "good";
  if (score > 0) return "low";
  return "miss";
}

// ─── Gün Detay Türleri ──────────────────────────────────────────────────────

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
  streakDays: number;        // kaç gün üst üste ≥ %50
  biggestDrop: { from: string; to: string; delta: number } | null;
  biggestSurge: { from: string; to: string; delta: number } | null;
};

// ─── Gün Adları ──────────────────────────────────────────────────────────────

const SHORT_DAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const SHORT_DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Hafta Anahtarı (AI ile aynı) ───────────────────────────────────────────

import { getISOWeek, getISOWeekYear } from "date-fns";

function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// ─── Ana Action ──────────────────────────────────────────────────────────────

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

  // Trend: ilk yarı vs ikinci yarı
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

  // Üst üste ≥%50 gün sayısı (sondan başlayarak)
  let streakDays = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.score >= 50) streakDays++;
    else break;
  }

  // En büyük düşüş ve artış (ardışık günler arası)
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

// ─── Gün Detay Action ───────────────────────────────────────────────────────

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
      select: { id: true, title: true, emoji: true, category: true },
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
      emoji: r.emoji ?? "📋",
      category: r.category,
      completed: completedIds.has(r.id),
    })),
  };
}

// ─── Bugünkü Disiplin Skoru ─────────────────────────────────────────────────

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
