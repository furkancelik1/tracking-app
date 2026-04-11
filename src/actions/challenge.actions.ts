"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendPushToUserAction } from "@/actions/push.actions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChallengeEntry = {
  id: string;
  routineTitle: string;
  durationDays: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  winnerId: string | null;
  challenger: { id: string; name: string | null; image: string | null };
  opponent: { id: string; name: string | null; image: string | null };
  challengerCount: number;
  opponentCount: number;
  isChallenger: boolean;
  daysLeft: number;
};

// ─── Düello Gönder ──────────────────────────────────────────────────────────

export async function sendChallengeAction(input: {
  opponentId: string;
  routineTitle: string;
  durationDays: number;
}) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  if (userId === input.opponentId) throw new Error("Cannot challenge yourself");

  // Arkadaş kontrolü
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { followerId: userId, followingId: input.opponentId },
        { followerId: input.opponentId, followingId: userId },
      ],
    },
  });
  if (!friendship) throw new Error("You can only challenge friends");

  // Aktif düello limiti (max 3)
  const activeCount = await prisma.challenge.count({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });
  if (activeCount >= 3) throw new Error("Maximum 3 active challenges");

  const challenge = await prisma.challenge.create({
    data: {
      challengerId: userId,
      opponentId: input.opponentId,
      routineTitle: input.routineTitle,
      durationDays: input.durationDays,
    },
    include: { challenger: { select: { name: true } } },
  });

  // Push bildirim
  await sendPushToUserAction(input.opponentId, {
    title: "Düello Daveti! ⚔️",
    body: `${challenge.challenger.name ?? "Birisi"} sana "${input.routineTitle}" üzerinden ${input.durationDays} günlük düello gönderdi!`,
    url: "/leaderboard",
    tag: `challenge-${challenge.id}`,
  }).catch(() => {});

  return { id: challenge.id };
}

// ─── Düello Kabul Et ────────────────────────────────────────────────────────

export async function acceptChallengeAction(challengeId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, opponentId: userId, status: "PENDING" },
  });
  if (!challenge) throw new Error("Challenge not found");

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + challenge.durationDays);

  const updated = await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: "ACTIVE", startDate: now, endDate },
    include: { opponent: { select: { name: true } } },
  });

  // Push bildirim challengera
  await sendPushToUserAction(challenge.challengerId, {
    title: "Düello Başladı! 🔥",
    body: `${updated.opponent.name ?? "Rakibin"} düellonu kabul etti! "${challenge.routineTitle}" başlıyor.`,
    url: "/leaderboard",
    tag: `challenge-start-${challengeId}`,
  }).catch(() => {});

  return { success: true };
}

// ─── Düello Reddet ──────────────────────────────────────────────────────────

export async function declineChallengeAction(challengeId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  await prisma.challenge.update({
    where: { id: challengeId, opponentId: userId, status: "PENDING" },
    data: { status: "DECLINED" },
  });

  return { success: true };
}

// ─── Günlük Check-in ────────────────────────────────────────────────────────

export async function challengeCheckInAction(challengeId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const challenge = await prisma.challenge.findFirst({
    where: {
      id: challengeId,
      status: "ACTIVE",
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });
  if (!challenge) throw new Error("Active challenge not found");
  if (!challenge.endDate || new Date() > challenge.endDate) {
    throw new Error("Challenge has ended");
  }

  // Bugün zaten check-in yaptı mı?
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const existing = await prisma.challengeLog.findFirst({
    where: {
      challengeId,
      userId,
      completedAt: { gte: todayStart, lt: todayEnd },
    },
  });
  if (existing) return { alreadyCheckedIn: true };

  await prisma.challengeLog.create({
    data: { challengeId, userId },
  });

  return { alreadyCheckedIn: false };
}

// ─── Aktif/Bekleyen Düelloları Getir ─────────────────────────────────────────

export async function getChallengesAction(): Promise<ChallengeEntry[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const challenges = await prisma.challenge.findMany({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    include: {
      challenger: { select: { id: true, name: true, image: true } },
      opponent: { select: { id: true, name: true, image: true } },
      logs: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return challenges.map((c) => {
    const challengerCount = c.logs.filter((l) => l.userId === c.challengerId).length;
    const opponentCount = c.logs.filter((l) => l.userId === c.opponentId).length;
    const daysLeft = c.endDate
      ? Math.max(0, Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : c.durationDays;

    return {
      id: c.id,
      routineTitle: c.routineTitle,
      durationDays: c.durationDays,
      status: c.status,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      winnerId: c.winnerId,
      challenger: c.challenger,
      opponent: c.opponent,
      challengerCount,
      opponentCount,
      isChallenger: c.challengerId === userId,
      daysLeft,
    };
  });
}

// ─── Biten Düelloları Finalize Et ────────────────────────────────────────────

export async function finalizeExpiredChallengesAction() {
  const now = new Date();

  const expired = await prisma.challenge.findMany({
    where: { status: "ACTIVE", endDate: { lte: now } },
    include: { logs: { select: { userId: true } } },
  });

  for (const c of expired) {
    const challengerCount = c.logs.filter((l) => l.userId === c.challengerId).length;
    const opponentCount = c.logs.filter((l) => l.userId === c.opponentId).length;

    let winnerId: string | null = null;
    if (challengerCount > opponentCount) winnerId = c.challengerId;
    else if (opponentCount > challengerCount) winnerId = c.opponentId;
    // Berabere → winnerId null

    await prisma.challenge.update({
      where: { id: c.id },
      data: { status: "COMPLETED", winnerId },
    });

    // Kazanana XP ödülü
    if (winnerId) {
      await prisma.user.update({
        where: { id: winnerId },
        data: { xp: { increment: 50 }, coins: { increment: 25 } },
      });

      await sendPushToUserAction(winnerId, {
        title: "Düello Kazandın! 🏆",
        body: `"${c.routineTitle}" düellosunu kazandın! +50 XP, +25 Coin`,
        url: "/leaderboard",
        tag: `challenge-win-${c.id}`,
      }).catch(() => {});
    }
  }

  // Süresi dolmuş PENDING olanları expire et
  const stale = new Date(now);
  stale.setDate(stale.getDate() - 3); // 3 gün cevap vermezse expire

  await prisma.challenge.updateMany({
    where: { status: "PENDING", createdAt: { lte: stale } },
    data: { status: "EXPIRED" },
  });
}
