"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Oturum bulunamadÄ±.");
  return (session.user as any).id as string;
}

export type BadgeWithStatus = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  criteriaType: string;
  criteriaValue: number;
  earned: boolean;
  earnedAt: string | null;
};

/**
 * TÃ¼m rozetleri getir â€” kazanÄ±lanlar earned:true, diÄŸerleri false.
 */
export async function getAllBadges(): Promise<BadgeWithStatus[]> {
  const userId = await requireUser();

  const [badges, userBadges] = await Promise.all([
    prisma.badge.findMany({ orderBy: { criteriaValue: "asc" } }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    }),
  ]);

  const earnedMap = new Map(
    userBadges.map((ub) => [ub.badgeId, ub.earnedAt])
  );

  return badges.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    criteriaType: b.criteriaType,
    criteriaValue: b.criteriaValue,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id)?.toISOString() ?? null,
  }));
}

/**
 * KullanÄ±cÄ±nÄ±n rozetlerini kontrol et ve hak edilenleri ata.
 * Yeni kazanÄ±lan rozet adlarÄ±nÄ± dÃ¶ndÃ¼r (toast gÃ¶stermek iÃ§in).
 */
export async function checkBadges(userId: string): Promise<string[]> {
  const [user, badges, userBadges, totalCompletions, routineCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, coins: true },
      }),
      prisma.badge.findMany(),
      prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
      prisma.routineLog.count({ where: { userId } }),
      prisma.routine.count({ where: { userId, isActive: true } }),
    ]);

  if (!user) return [];

  const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

  // En yÃ¼ksek aktif streak'i bul
  const routines = await prisma.routine.findMany({
    where: { userId, isActive: true },
    select: { currentStreak: true, longestStreak: true },
  });
  const maxStreak = routines.reduce(
    (max, r) => Math.max(max, r.currentStreak, r.longestStreak),
    0
  );

  // BugÃ¼n tÃ¼m rutinler tamamlandÄ± mÄ±?
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayLogs = await prisma.routineLog.count({
    where: { userId, completedAt: { gte: todayStart } },
  });
  const allDoneToday = routineCount > 0 && todayLogs >= routineCount;

  // Toplam kazanÄ±lan coin (xp + coins birlikte yaklaÅŸÄ±k = kazanÄ±lan toplam coin)
  // coins alanÄ± harcama sonrasÄ± dÃ¼ÅŸer, bu yÃ¼zden toplam kazanÄ±mÄ± XP'den tÃ¼retiyoruz
  // (10 XP = 10 Coin her tamamlamada kazanÄ±lÄ±yor)
  const totalCoinEarned = user.xp; // XP hiÃ§ harcanmaz, coin'le 1:1

  const newBadges: string[] = [];

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    let earned = false;

    switch (badge.criteriaType) {
      case "STREAK":
        earned = maxStreak >= badge.criteriaValue;
        break;
      case "TOTAL_COMPLETIONS":
        earned = totalCompletions >= badge.criteriaValue;
        break;
      case "COIN_EARNED":
        earned = totalCoinEarned >= badge.criteriaValue;
        break;
      case "FIRST_HABIT":
        earned = routineCount >= badge.criteriaValue;
        break;
      case "ALL_DONE":
        earned = allDoneToday && badge.criteriaValue <= 1;
        break;
      case "TOUR_COMPLETE":
        // Onboarding tamamlandÄ±ÄŸÄ±nda ayrÄ±ca atanÄ±r
        break;
    }

    if (earned) {
      newBadges.push(badge.name);
    }
  }

  // Toplu rozet atamasÄ±
  if (newBadges.length > 0) {
    const badgesToCreate = badges
      .filter((b) => newBadges.includes(b.name))
      .map((b) => ({ userId, badgeId: b.id }));

    await prisma.userBadge.createMany({
      data: badgesToCreate,
      skipDuplicates: true,
    });

    revalidatePath("/", "layout");
  }

  return newBadges;
}

/**
 * Onboarding tamamlandÄ±ÄŸÄ±nda: Explorer rozeti + 50 Coin hediye.
 */
export async function completeTour(): Promise<{ newBadges: string[] }> {
  const userId = await requireUser();

  await prisma.user.update({
    where: { id: userId },
    data: { hasSeenTour: true, coins: { increment: 50 } },
  });

  // TOUR_COMPLETE rozetini ata
  const tourBadge = await prisma.badge.findFirst({
    where: { criteriaType: "TOUR_COMPLETE" },
  });

  const newBadges: string[] = [];

  if (tourBadge) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: tourBadge.id } },
      create: { userId, badgeId: tourBadge.id },
      update: {},
    });
    newBadges.push(tourBadge.name);
  }

  revalidatePath("/", "layout");
  return { newBadges };
}

/**
 * KullanÄ±cÄ±nÄ±n onboarding durumunu kontrol et.
 */
export async function getOnboardingStatus(): Promise<boolean> {
  const userId = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasSeenTour: true },
  });
  return user?.hasSeenTour ?? false;
}
