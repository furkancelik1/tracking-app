"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

function calcNewStreak(
  frequency: string,
  currentStreak: number,
  lastCompletedAt: Date | null
): number {
  if (!lastCompletedAt) return 1;
  const prevStart = getPrevPeriodStart(frequency);
  const currentStart = getPeriodStart(frequency);
  const last = new Date(lastCompletedAt);
  return last >= prevStart && last < currentStart ? currentStreak + 1 : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// XP Sabitleri
// ─────────────────────────────────────────────────────────────────────────────

const XP_PER_COMPLETION = 10;
const XP_ALL_DONE_BONUS = 50;

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
 * @returns xpGain ve toplam XP (level-up algılaması için)
 */
export async function completeRoutineAction(
  routineId: string,
  note?: string
): Promise<{ xpGain: number; totalXp: number }> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId, isActive: true },
      select: { id: true, frequency: true, currentStreak: true, longestStreak: true, lastCompletedAt: true },
    });
    if (!routine) throw new Error("Rutin bulunamadı.");

    const periodStart = getPeriodStart(routine.frequency);

    const alreadyLogged = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
      select: { id: true },
    });
    if (alreadyLogged) throw new Error("Bu periyot için zaten tamamlandı.");

    const newStreak = calcNewStreak(routine.frequency, routine.currentStreak, routine.lastCompletedAt);
    const newLongest = Math.max(newStreak, routine.longestStreak);

    // ── XP hesaplaması ────────────────────────────────────────────────────
    let xpGain = XP_PER_COMPLETION;

    // All Done bonus: bu tamamlama sonrası bugünkü tüm aktif rutinler tamam mı?
    const todayStart = getPeriodStart("DAILY");
    const [activeRoutines, todayLogs] = await Promise.all([
      prisma.routine.count({ where: { userId, isActive: true } }),
      prisma.routineLog.count({ where: { userId, completedAt: { gte: todayStart } } }),
    ]);
    // todayLogs henüz bu tamamlamayı içermiyor, +1 ekleyerek kontrol et
    if (todayLogs + 1 >= activeRoutines && activeRoutines > 1) {
      xpGain += XP_ALL_DONE_BONUS;
    }

    await prisma.$transaction([
      prisma.routineLog.create({
        data: { routineId, userId, completedAt: periodStart, note: note?.trim() || null },
      }),
      prisma.routine.update({
        where: { id: routineId },
        data: { currentStreak: newStreak, longestStreak: newLongest, lastCompletedAt: periodStart },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xpGain } },
      }),
    ]);

    // Güncel XP'yi al (level-up algılaması için)
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    revalidatePath("/dashboard");
    return { xpGain, totalXp: updatedUser?.xp ?? 0 };
  } catch (error) {
    console.error("[completeRoutineAction] Hata:", error);
    throw error;
  }
}

/**
 * Tamamlamayı geri al: mevcut periyodun logunu sil + streak düşür.
 */
export async function undoRoutineAction(routineId: string): Promise<void> {
  const userId = await requireUser();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
      select: { frequency: true, currentStreak: true },
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
      select: { id: true },
    });

    const restoredStreak = prevLog ? Math.max(0, routine.currentStreak - 1) : 0;

    await prisma.$transaction([
      prisma.routineLog.delete({ where: { id: log.id } }),
      prisma.routine.update({
        where: { id: routineId },
        data: { currentStreak: restoredStreak, lastCompletedAt: prevLog ? prevPeriodStart : null },
      }),
      // XP geri al (minimum 0)
      prisma.user.update({
        where: { id: userId },
        data: { xp: { decrement: XP_PER_COMPLETION } },
      }),
    ]);

    // XP negatife düşmesini engelle
    await prisma.user.updateMany({
      where: { id: userId, xp: { lt: 0 } },
      data: { xp: 0 },
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
