"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkBadges } from "@/actions/badge.actions";
import { updateChallengeScoresFromLog } from "@/actions/challenge.actions";
import { updateAIChallengeProgress } from "@/actions/ai.actions";
import { updateDuelScore } from "@/actions/duel.actions";
import { calculateLevel } from "@/lib/level";

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı Fonksiyonlar: Tarih ve Periyot Mantığı
// ─────────────────────────────────────────────────────────────────────────────

/** İki tarih arasındaki farkın tam olarak 1 gün olup olmadığını (Dün mü?) kontrol eder */
function isYesterday(date: Date): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  
  const diffInMs = today.getTime() - target.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  return diffInDays === 1;
}

/** Verilen tarihin bugün olup olmadığını kontrol eder */
function isToday(date: Date): boolean {
  const today = new Date();
  const target = new Date(date);
  return today.getUTCDate() === target.getUTCDate() &&
         today.getUTCMonth() === target.getUTCMonth() &&
         today.getUTCFullYear() === target.getUTCFullYear();
}

function getPeriodStart(frequency: string): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  switch (frequency) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      now.setUTCDate(now.getUTCDate() + diff);
      return now;
    }
    case "MONTHLY":
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    default:
      return now;
  }
}

function getPrevPeriodStart(frequency: string): Date {
  const start = getPeriodStart(frequency);
  const d = new Date(start);
  switch (frequency) {
    case "WEEKLY": d.setUTCDate(d.getUTCDate() - 7); break;
    case "MONTHLY": d.setUTCMonth(d.getUTCMonth() - 1); break;
    default: d.setUTCDate(d.getUTCDate() - 1); break;
  }
  return d;
}

// ── XP ve Ekonomi Sabitleri ──────────────────────────────────────────────────
const XP_PER_COMPLETION = 10;
const XP_ALL_DONE_BONUS = 50;
const COINS_PER_COMPLETION = 10;
const COINS_ALL_DONE_BONUS = 50;

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Oturum bulunamadı.");
  return (session.user as any).id as string;
}

// ── Server Actions ───────────────────────────────────────────────────────────

export async function completeRoutineAction(routineId: string, note?: string) {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId, isActive: true },
      select: { 
        id: true, title: true, category: true, frequency: true, 
        currentStreak: true, longestStreak: true, lastCompleted: true 
      },
    });
    if (!routine) throw new Error("Rutin bulunamadı.");

    const periodStart = getPeriodStart(routine.frequency);
    const alreadyLogged = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
    });
    if (alreadyLogged) throw new Error("Bu periyot için zaten tamamlandı.");

    // Streak Mantığı
    let newStreak = 1;
    if (routine.lastCompleted) {
      if (isYesterday(new Date(routine.lastCompleted))) {
        newStreak = routine.currentStreak + 1;
      } else if (isToday(new Date(routine.lastCompleted))) {
        newStreak = routine.currentStreak;
      }
    }
    const newLongest = Math.max(newStreak, routine.longestStreak);

    // Kullanıcı verilerini ve bugünkü ilerlemeyi al
    const [currentUser, activeRoutines, todayLogs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { xp: true, coins: true } }),
      prisma.routine.count({ where: { userId, isActive: true } }),
      prisma.routineLog.count({ where: { userId, completedAt: { gte: getPeriodStart("DAILY") } } }),
    ]);

    let xpGain = XP_PER_COMPLETION;
    let coinGain = COINS_PER_COMPLETION;
    
    // "Hepsi Tamam" Bonusu
    if (todayLogs + 1 >= activeRoutines && activeRoutines > 1) {
      xpGain += XP_ALL_DONE_BONUS;
      coinGain += COINS_ALL_DONE_BONUS;
    }

    const newTotalXp = (currentUser?.xp ?? 0) + xpGain;
    const newTotalCoins = (currentUser?.coins ?? 0) + coinGain;
    const newLevel = calculateLevel(newTotalXp).level;

    // ATOMİK GÜNCELLEME
    await prisma.$transaction([
      prisma.routineLog.create({
        data: { routineId, userId, completedAt: new Date(), note: note?.trim() || null },
      }),
      prisma.routine.update({
        where: { id: routineId },
        data: { 
          currentStreak: newStreak, 
          longestStreak: newLongest, 
          lastCompleted: new Date(),
          streakCount: newStreak 
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: newTotalXp, level: newLevel, coins: newTotalCoins },
      }),
    ]);

    // Yan Etkiler (Hata olsa da ana işlemi bozmaz)
    checkBadges(userId).catch(() => {});
    updateChallengeScoresFromLog(userId, routine.title).catch(() => {});
    updateDuelScore(userId).catch(() => {});
    updateAIChallengeProgress(userId, routine.category).catch(() => {});

    revalidatePath("/dashboard");
    return { 
      xpGain, totalXp: newTotalXp, 
      coinGain, totalCoins: newTotalCoins,
      duelScoreUpdated: true 
    };
  } catch (error) {
    console.error("[completeRoutineAction] Hata:", error);
    throw error;
  }
}

export async function undoRoutineAction(routineId: string) {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
      select: { currentStreak: true, frequency: true }
    });
    if (!routine) throw new Error("Rutin bulunamadı.");

    const periodStart = getPeriodStart(routine.frequency);
    const log = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
      orderBy: { completedAt: "desc" }
    });
    if (!log) throw new Error("Geri alınacak log bulunamadı.");

    // Bir önceki logu bul (Streak restorasyonu için)
    const prevLog = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { lt: periodStart } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true }
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true, coins: true } });
    const finalXp = Math.max(0, (user?.xp ?? 0) - XP_PER_COMPLETION);
    const finalCoins = Math.max(0, (user?.coins ?? 0) - COINS_PER_COMPLETION);

    await prisma.$transaction([
      prisma.routineLog.delete({ where: { id: log.id } }),
      prisma.routine.update({
        where: { id: routineId },
        data: { 
          currentStreak: prevLog ? Math.max(0, routine.currentStreak - 1) : 0,
          lastCompleted: prevLog ? prevLog.completedAt : null,
          streakCount: prevLog ? Math.max(0, routine.currentStreak - 1) : 0
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: finalXp, coins: finalCoins, level: calculateLevel(finalXp).level },
      }),
    ]);

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[undoRoutineAction] Hata:", error);
    throw error;
  }
}

export async function deleteRoutineAction(routineId: string) {
  const userId = await requireUser();
  await prisma.routine.update({
    where: { id: routineId, userId },
    data: { isActive: false },
  });
  revalidatePath("/dashboard");
}