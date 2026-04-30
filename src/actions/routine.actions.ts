"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { useStreakFreeze } from "@/actions/shop.actions";
import { checkBadges } from "@/actions/badge.actions";
import { updateChallengeScoresFromLog } from "@/actions/challenge.actions";
import { sendPushToUserAction } from "@/actions/push.actions";
import { updateAIChallengeProgress } from "@/actions/ai.actions";
import { updateDuelScore } from "@/actions/duel.actions";
import { calculateLevel } from "@/lib/level";
import { calculateFlexibleStreak } from "@/lib/xp-logic";
import { RoutineIntensity, type RoutineFrequency } from "@prisma/client";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// YardÄ±mcÄ±: periyot baÅŸlangÄ±cÄ± (Route Handler ile aynÄ± mantÄ±k)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getPeriodStart(frequencyType: string): Date {
  const now = new Date();
  switch (frequencyType) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() + diff);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    default: {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
  }
}

function getPrevPeriodStart(frequencyType: string): Date {
  const now = new Date();
  switch (frequencyType) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() + diff - 7);
      d.setUTCHours(0, 0, 0, 0);
      return d;
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
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { XP_PER_COMPLETION, XP_ALL_DONE_BONUS, COINS_PER_COMPLETION, COINS_ALL_DONE_BONUS } from "@/constants/rewards";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Server Actions
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Oturum bulunamadÄ±. LÃ¼tfen tekrar giriÅŸ yapÄ±n.");
  return (session.user as any).id as string;
}

export async function createRoutineAction(input: {
  title: string;
  description?: string;
  category?: string;
  color?: string;
  icon?: string;
  frequencyType?: "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";
  intensity?: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes?: number;
  imageUrl?: string | null;
  isGuided?: boolean;
  coachTip?: string | null;
}) {
  const userId = await requireUser();

  const frequencyType = input.frequencyType ?? "DAILY";
  const frequency: RoutineFrequency =
    frequencyType === "DAILY" ? "DAILY" : "WEEKLY";
  const mins = Math.min(480, Math.max(0, input.estimatedMinutes ?? 0));
  const intensity: RoutineIntensity =
    input.intensity === "LOW"
      ? RoutineIntensity.LOW
      : input.intensity === "HIGH"
        ? RoutineIntensity.HIGH
        : RoutineIntensity.MEDIUM;
  const imageUrl = input.imageUrl?.trim() || null;
  const coachTip = input.coachTip?.trim() || null;

  const created = await prisma.routine.create({
    data: {
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || "Genel",
      color: input.color ?? "#3b82f6",
      icon: input.icon ?? "CheckCircle",
      frequency,
      intensity,
      estimatedMinutes: mins,
      imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null,
      isGuided: input.isGuided ?? false,
      coachTip: coachTip && coachTip.length > 0 ? coachTip : null,
    },
  });

  revalidatePath("/[locale]/dashboard", "page");
  return created;
}

/**
 * Rutini tamamla: RoutineLog oluÅŸtur + streak gÃ¼ncelle (atomik).
 * Streak mantÄ±ÄŸÄ±: lastCompleted 'dÃ¼n' ise +1, daha eskiyse reset.
 * @returns xpGain ve toplam XP
 *
 * Çevrimdışı kullanım: tarayıcı IndexedDB kuyruğu + `flushPendingRoutineLogs`
 * (bkz. `@/lib/offline/routine-sync-manager`).
 */
export async function completeRoutineAction(
  routineId: string,
  note?: string,
  timezoneOffsetMinutes?: number
): Promise<{ xpGain: number; totalXp: number; coinGain: number; totalCoins: number; newBadges: string[]; duelScoreUpdated: boolean; duelOpponentName: string | null }> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId, isActive: true },
      select: {
        id: true,
        title: true,
        category: true,
        frequency: true,
        currentStreak: true,
        longestStreak: true,
        lastCompletedAt: true,
      },
    });
    if (!routine) throw new Error("Rutin bulunamadÄ±.");

    const periodType = routine.frequency === "WEEKLY" ? "WEEKLY" : "DAILY";
    const todayStart = getPeriodStart("DAILY");
    const periodStart = getPeriodStart(periodType);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    if (routine.frequency === "WEEKLY") {
      const alreadyWeeklyLogged = await prisma.routineLog.findFirst({
        where: { routineId, userId, completedAt: { gte: periodStart } },
        select: { id: true },
      });
      if (alreadyWeeklyLogged) {
        throw new Error("Bu hafta için zaten tamamlandı.");
      }
    } else {
      const alreadyLogged = await prisma.routineLog.findFirst({
        where: { routineId, userId, completedAt: { gte: todayStart, lte: todayEnd } },
        select: { id: true },
      });
      if (alreadyLogged) throw new Error("Bu periyot iÃ§in zaten tamamlandÄ±.");
    }

    // Streak hesaplama
    const now = new Date();
    let newStreak = calculateFlexibleStreak({
      frequencyType: periodType,
      currentStreak: routine.currentStreak,
      lastCompletedAt: routine.lastCompletedAt,
      completedAt: now,
      daysOfWeek: [],
    });
    const newLongest = Math.max(newStreak, routine.longestStreak);

    // XP & Coin hesaplamasÄ±
    let xpGain = XP_PER_COMPLETION;
    let coinGain = COINS_PER_COMPLETION;

    // All Done bonus
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
        data: { routineId, userId, completedAt: now, note: note?.trim() || null },
      }),
      prisma.routine.update({
        where: { id: routineId },
        data: { currentStreak: newStreak, longestStreak: newLongest, lastCompletedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xpGain }, level: newLevel, coins: { increment: coinGain } },
      }),
    ]);

    // GÃ¼ncel XP ve coin bilgisini al
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, coins: true },
    });

    // Rozet kontrolÃ¼
    const newBadges = await checkBadges(userId);

    // Aktif dÃ¼ellolarda skor gÃ¼ncelle
    await updateChallengeScoresFromLog(userId, routine.title, timezoneOffsetMinutes).catch(() => {});

    // Disiplin dÃ¼ellosu skor gÃ¼ncelle
    const duelResult = await updateDuelScore(userId).catch(() => ({
      updated: false,
      opponentName: null,
    }));

    // AI haftalık görev ilerlemesini güncelle
    await updateAIChallengeProgress(userId, routine.category).catch(() => {});

    // Challenge leaderboard cache'ini invalidate et (on-demand revalidation)
    (revalidateTag as any)("challenge-leaderboard");
    revalidatePath("/[locale]/dashboard", "page");
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
 * Streak Freeze mantÄ±ÄŸÄ±nÄ± kaldÄ±r - inline hesaplamayla devam et
 */

/**
 * TamamlamayÄ± geri al: mevcut periyodun logunu sil + streak dÃ¼ÅŸÃ¼r.
 */
export async function undoRoutineAction(routineId: string): Promise<void> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
      select: { frequency: true, currentStreak: true, lastCompletedAt: true },
    });
    if (!routine) throw new Error("Rutin bulunamadÄ±.");

    const periodType = routine.frequency === "WEEKLY" ? "WEEKLY" : "DAILY";
    const periodStart = getPeriodStart(periodType);
    const prevPeriodStart = getPrevPeriodStart(periodType);

    const log = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
      select: { id: true },
    });
    if (!log) throw new Error("Bu periyotta tamamlanma kaydÄ± yok.");

    const prevLog = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: prevPeriodStart, lt: periodStart } },
      select: { id: true, completedAt: true },
    });

    // Streak gÃ¼ncelle: prevLog varsa ve periyodu aynÄ± periyoda ait ise eski periyodun son tarihinin "dÃ¼n" olmasÄ± lazÄ±m
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
        data: { currentStreak: Math.max(0, restoredStreak), lastCompletedAt: prevLog ? prevPeriodStart : null },
      }),
      // XP ve coin geri al (minimum 0)
      prisma.user.update({
        where: { id: userId },
        data: { xp: { decrement: XP_PER_COMPLETION }, level: levelAfterUndo, coins: { decrement: COINS_PER_COMPLETION } },
      }),
    ]);

    // XP ve coin negatife dÃ¼ÅŸmesini engelle
    await prisma.user.updateMany({
      where: { id: userId, xp: { lt: 0 } },
      data: { xp: 0 },
    });
    await prisma.user.updateMany({
      where: { id: userId, coins: { lt: 0 } },
      data: { coins: 0 },
    });

    revalidatePath("/[locale]/dashboard", "page");
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
      select: { id: true, title: true },
    });
    if (!routine) throw new Error("Rutin bulunamadÄ±.");

    await prisma.routine.update({
      where: { id: routineId },
      data: { isActive: false },
    });

    // If this routine was participating in any ACTIVE challenges, cancel them.
    // We choose to cancel (mark as CANCELLED) rather than auto-award to avoid
    // surprising payouts. Product can change to forfeit-on-delete if desired.
    try {
      const affected = await prisma.challenge.findMany({
        where: {
          status: "ACTIVE",
          routineTitle: { equals: routine!.title, mode: "insensitive" },
          OR: [{ challengerId: userId }, { opponentId: userId }],
        },
        select: { id: true, challengerId: true, opponentId: true },
      });

      for (const ch of affected) {
        await prisma.challenge.update({ where: { id: ch.id }, data: { status: "EXPIRED" } });
        const otherId = ch.challengerId === userId ? ch.opponentId : ch.challengerId;
        // notify opponent about cancellation
        await sendPushToUserAction(otherId, {
          title: "Düello İptal Edildi",
          body: "Rakibin rutini sildi; düello iptal edildi.",
          url: "/social",
          tag: `challenge-cancel-${ch.id}`,
        }).catch(() => {});
      }
    } catch (e) {
      // non-fatal
    }

    revalidatePath("/[locale]/dashboard", "page");
  } catch (error) {
    console.error("[deleteRoutineAction] Hata:", error);
    throw error;
  }
}
