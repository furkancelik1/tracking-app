"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { useStreakFreeze } from "@/actions/shop.actions";
import { checkBadges } from "@/actions/badge.actions";
import { updateChallengeScoresFromLog } from "@/actions/challenge.actions";
import { updateAIChallengeProgress } from "@/actions/ai.actions";
import { updateDuelScore } from "@/actions/duel.actions";
import { calculateLevel } from "@/lib/level";

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı: periyot başlangıcı (Route Handler ile aynı mantık)
// ─────────────────────────────────────────────────────────────────────────────

function getPeriodStart(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() + diff);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "MONTHLY":
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    default: {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
  }
}

function getPrevPeriodStart(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() + diff - 7);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "MONTHLY": {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - 1);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
    default: {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - 1);
      return d;
    }
  }
}

// XP Sabitleri
// ─────────────────────────────────────────────────────────────────────────────
const XP_PER_COMPLETION = 10;
const XP_ALL_DONE_BONUS = 50;
const COINS_PER_COMPLETION = 10;
const COINS_ALL_DONE_BONUS = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  return (session.user as any).id as string;
}

/**
 * Rutini tamamla: RoutineLog oluştur + streak güncelle (atomik).
 * Streak mantığı: lastCompleted 'dün' ise +1, daha eskiyse reset.
 * @returns xpGain ve toplam XP
 */
export async function completeRoutineAction(
  routineId: string,
  note?: string
): Promise<{ xpGain: number; totalXp: number; coinGain: number; totalCoins: number; newBadges: string[]; duelScoreUpdated: boolean; duelOpponentName: string | null }> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId, isActive: true },
      select: { id: true, title: true, category: true, frequency: true, currentStreak: true, longestStreak: true, lastCompletedAt: true },
    });
    if (!routine) throw new Error("Rutin bulunamadı.");

    const periodStart = getPeriodStart(routine.frequency);

    const alreadyLogged = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
      select: { id: true },
    });
    if (alreadyLogged) throw new Error("Bu periyot için zaten tamamlandı.");

    // Streak hesaplama
    let newStreak = routine.lastCompletedAt 
      ? new Date(routine.lastCompletedAt).getUTCDate() === new Date().getUTCDate() - 1
        ? routine.currentStreak + 1
        : 1
      : 1;
    const newLongest = Math.max(newStreak, routine.longestStreak);

    // XP & Coin hesaplaması
    let xpGain = XP_PER_COMPLETION;
    let coinGain = COINS_PER_COMPLETION;

    // All Done bonus
    const todayStart = getPeriodStart("DAILY");
    const [activeRoutines, todayLogs, currentUser] = await Promise.all([
      prisma.routine.count({ where: { userId, isActive: true } }),
      prisma.routineLog.count({ where: { userId, completedAt: { gte: todayStart } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
    ]);
    if (todayLogs + 1 >= activeRoutines && activeRoutines > 1) {
      xpGain += XP_ALL_DONE_BONUS;
      coinGain += COINS_ALL_DONE_BONUS;
    }

    // Pre-compute new level
    const newXp = (currentUser?.xp ?? 0) + xpGain;
    const newLevel = calculateLevel(newXp).level;

    await prisma.$transaction([
      prisma.routineLog.create({
        data: { routineId, userId, completedAt: periodStart, note: note?.trim() || null },
      }),
      prisma.routine.update({
        where: { id: routineId },
        data: { currentStreak: newStreak, longestStreak: newLongest, lastCompleted: new Date(), streakCount: newStreak },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xpGain }, level: newLevel, coins: { increment: coinGain } },
      }),
    ]);

    // Güncel XP ve coin bilgisini al
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, coins: true },
    });

    // Rozet kontrolü
    const newBadges = await checkBadges(userId);

    // Aktif düellolarda skor güncelle
    await updateChallengeScoresFromLog(userId, routine.title).catch(() => {});

    // Disiplin düellosu skor güncelle
    const duelResult = await updateDuelScore(userId).catch(() => ({
      updated: false,
      opponentName: null,
    }));

    // AI haftalık görev ilerlemesini güncelle
    await updateAIChallengeProgress(userId, routine.category).catch(() => {});

    revalidatePath("/dashboard");
    return {
      xpGain,
      totalXp: updatedUser?.xp ?? 0,
      coinGain,
      totalCoins: updatedUser?.coins ?? 0,
      newBadges,
      duelScoreUpdated: duelResult?.updated ?? false,
      duelOpponentName: duelResult?.opponentName ?? null,
    };
  } catch (error) {
    console.error("[completeRoutineAction] Hata:", error);
    throw error;
  }
}

/**
 * Streak Freeze mantığını kaldır - inline hesaplamayla devam et
 */

/**
 * Tamamlamayı geri al: mevcut periyodun logunu sil + streak düşür.
 */
export async function undoRoutineAction(routineId: string): Promise<void> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
      select: { frequency: true, currentStreak: true, lastCompleted: true },
    });
    if (!routine) throw new Error("Rutin bulunamadı.");

    const periodStart = getPeriodStart(routine.frequency);
    const prevPeriodStart = getPrevPeriodStart(routine.frequency);

    const log = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
      select: { id: true },
    });
    if (!log) throw new Error("Bu periyotta tamamlanma kaydı yok.");

    const prevLog = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: prevPeriodStart, lt: periodStart } },
      select: { id: true, completedAt: true },
    });

    // Streak güncelle: prevLog varsa ve periyodu aynı periyoda ait ise eski periyodun son tarihinin "dün" olması lazım
    const restoredStreak = prevLog && prevLog.completedAt 
      ? new Date(prevLog.completedAt).getUTCDate() === new Date().getUTCDate() - 1
        ? routine.currentStreak - 1
        : 0
      : 0;

    const undoUser = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    const xpAfterUndo = Math.max(0, (undoUser?.xp ?? 0) - XP_PER_COMPLETION);
    const levelAfterUndo = calculateLevel(xpAfterUndo).level;

    await prisma.$transaction([
      prisma.routineLog.delete({ where: { id: log.id } }),
      prisma.routine.update({
        where: { id: routineId },
        data: { currentStreak: Math.max(0, restoredStreak), lastCompleted: prevLog ? prevPeriodStart : null },
      }),
      // XP ve coin geri al (minimum 0)
      prisma.user.update({
        where: { id: userId },
        data: { xp: { decrement: XP_PER_COMPLETION }, level: levelAfterUndo, coins: { decrement: COINS_PER_COMPLETION } },
      }),
    ]);

    // XP ve coin negatife düşmesini engelle
    await prisma.user.updateMany({
      where: { id: userId, xp: { lt: 0 } },
      data: { xp: 0 },
    });
    await prisma.user.updateMany({
      where: { id: userId, coins: { lt: 0 } },
      data: { coins: 0 },
    });

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[undoRoutineAction] Hata:", error);
    throw error;
  }
}

/**
 * Rutini sil (soft-delete).
 */
export async function deleteRoutineAction(routineId: string): Promise<void> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId, isActive: true },
      select: { id: true },
    });
    if (!routine) throw new Error("Rutin bulunamadı.");

    await prisma.routine.update({
      where: { id: routineId },
      data: { isActive: false },
    });

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[deleteRoutineAction] Hata:", error);
    throw error;
  }
}
