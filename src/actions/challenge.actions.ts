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
  rewardDistributed?: boolean;
};

export type ChallengeRewardResult = {
  challengeId: string;
  routineTitle: string;
  outcome: "win" | "loss" | "draw";
  xp: number;
  coins: number;
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

// ─── Tamamlanan Düelloları Getir ─────────────────────────────────────────────

export async function getCompletedChallengesAction(): Promise<ChallengeEntry[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const challenges = await prisma.challenge.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    include: {
      challenger: { select: { id: true, name: true, image: true } },
      opponent: { select: { id: true, name: true, image: true } },
      logs: { select: { userId: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return challenges.map((c) => {
    const challengerCount = c.logs.filter((l) => l.userId === c.challengerId).length;
    const opponentCount = c.logs.filter((l) => l.userId === c.opponentId).length;

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
      daysLeft: 0,
    };
  });
}

// ─── Ödül Sabitleri ──────────────────────────────────────────────────────────

const REWARD_WIN   = { xp: 100, coins: 50 } as const;
const REWARD_DRAW  = { xp: 40,  coins: 20 } as const;
const REWARD_LOSS  = { xp: 10,  coins: 0  } as const;

// ─── Biten Düelloları Finalize Et & Ödül Dağıt ──────────────────────────────

/**
 * Süresi dolmuş ACTIVE düelloları bulur, skorları karşılaştırır,
 * kazanan/berabere belirler, atomik transaction ile XP/Coin dağıtır,
 * challenge'ı COMPLETED + rewardDistributed olarak işaretler.
 *
 * Kullanıcının kazandığı ödülleri ChallengeRewardResult[] olarak döner.
 */
export async function distributeChallengeRewards(
  userId: string
): Promise<ChallengeRewardResult[]> {
  const now = new Date();
  const rewards: ChallengeRewardResult[] = [];

  // 1) Süresi dolmuş, henüz ödül dağıtılmamış ACTIVE düellolar
  const expired = await prisma.challenge.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lte: now },
      rewardDistributed: false,
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    include: {
      logs: { select: { userId: true } },
      challenger: { select: { id: true, name: true } },
      opponent: { select: { id: true, name: true } },
    },
  });

  for (const c of expired) {
    const challengerCount = c.logs.filter((l) => l.userId === c.challengerId).length;
    const opponentCount = c.logs.filter((l) => l.userId === c.opponentId).length;

    let winnerId: string | null = null;
    let loserId: string | null = null;
    const isDraw = challengerCount === opponentCount;

    if (!isDraw) {
      winnerId = challengerCount > opponentCount ? c.challengerId : c.opponentId;
      loserId = winnerId === c.challengerId ? c.opponentId : c.challengerId;
    }

    try {
      // Atomik transaction: durum + ödüller aynı anda
      await prisma.$transaction(async (tx) => {
        // Double-spending koruması: tekrar kontrol
        const fresh = await tx.challenge.findUnique({
          where: { id: c.id },
          select: { rewardDistributed: true, status: true },
        });
        if (!fresh || fresh.rewardDistributed || fresh.status === "COMPLETED") {
          return; // Zaten ödül dağıtılmış
        }

        // Challenge'ı güncelle
        await tx.challenge.update({
          where: { id: c.id },
          data: {
            status: "COMPLETED",
            winnerId,
            rewardDistributed: true,
          },
        });

        if (isDraw) {
          // Berabere: her iki taraf 40 XP + 20 Coin
          await tx.user.update({
            where: { id: c.challengerId },
            data: { xp: { increment: REWARD_DRAW.xp }, coins: { increment: REWARD_DRAW.coins } },
          });
          await tx.user.update({
            where: { id: c.opponentId },
            data: { xp: { increment: REWARD_DRAW.xp }, coins: { increment: REWARD_DRAW.coins } },
          });
        } else {
          // Kazanan: 100 XP + 50 Coin
          await tx.user.update({
            where: { id: winnerId! },
            data: { xp: { increment: REWARD_WIN.xp }, coins: { increment: REWARD_WIN.coins } },
          });
          // Kaybeden: 10 XP teselli ödülü
          await tx.user.update({
            where: { id: loserId! },
            data: { xp: { increment: REWARD_LOSS.xp } },
          });
        }
      });

      // Kullanıcı için sonuç belirle
      const isUserChallenger = c.challengerId === userId;
      const userWon = winnerId === userId;
      const outcome: "win" | "loss" | "draw" = isDraw
        ? "draw"
        : userWon
          ? "win"
          : "loss";

      const rewardForUser = isDraw
        ? REWARD_DRAW
        : userWon
          ? REWARD_WIN
          : REWARD_LOSS;

      rewards.push({
        challengeId: c.id,
        routineTitle: c.routineTitle,
        outcome,
        xp: rewardForUser.xp,
        coins: rewardForUser.coins,
      });

      // Push bildirimler (fire & forget)
      const winnerName = winnerId === c.challengerId
        ? c.challenger.name
        : c.opponent.name;

      if (isDraw) {
        // Berabere bildirim her iki tarafa
        for (const uid of [c.challengerId, c.opponentId]) {
          await sendPushToUserAction(uid, {
            title: "Düello Berabere! 🤝",
            body: `"${c.routineTitle}" düellosu berabere bitti. +${REWARD_DRAW.xp} XP, +${REWARD_DRAW.coins} Coin`,
            url: "/social",
            tag: `challenge-draw-${c.id}`,
          }).catch(() => {});
        }
      } else {
        // Kazanana bildirim
        await sendPushToUserAction(winnerId!, {
          title: "Düello Kazandın! 🏆",
          body: `"${c.routineTitle}" düellosunu kazandın! +${REWARD_WIN.xp} XP, +${REWARD_WIN.coins} Coin`,
          url: "/social",
          tag: `challenge-win-${c.id}`,
        }).catch(() => {});
        // Kaybedene bildirim
        await sendPushToUserAction(loserId!, {
          title: "Düello Bitti ⚔️",
          body: `"${c.routineTitle}" düellosunu ${winnerName ?? "Rakip"} kazandı. +${REWARD_LOSS.xp} XP teselli ödülü`,
          url: "/social",
          tag: `challenge-loss-${c.id}`,
        }).catch(() => {});
      }
    } catch (error) {
      console.error(`[distributeChallengeRewards] Challenge ${c.id} error:`, error);
      // Hatalı challenge'ı atla, diğerlerine devam et
    }
  }

  // Süresi dolmuş PENDING olanları expire et (3 gün yanıt yok)
  const stale = new Date(now);
  stale.setDate(stale.getDate() - 3);

  await prisma.challenge.updateMany({
    where: { status: "PENDING", createdAt: { lte: stale } },
    data: { status: "EXPIRED" },
  }).catch(() => {});

  return rewards;
}

// ─── Eski uyumluluk wrapper'ı ────────────────────────────────────────────────

export async function finalizeExpiredChallengesAction() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  return distributeChallengeRewards(userId);
}

// ─── Rutin Tamamlandığında Düello Skorunu Güncelle ───────────────────────────

/**
 * Bir kullanıcı rutin tamamladığında, eğer aynı rutin başlığına sahip
 * aktif bir düellosu varsa otomatik olarak check-in yapılır.
 */
export async function updateChallengeScoresFromLog(
  userId: string,
  routineTitle: string
) {
  const activeChallenges = await prisma.challenge.findMany({
    where: {
      status: "ACTIVE",
      routineTitle: { equals: routineTitle, mode: "insensitive" },
      endDate: { gt: new Date() },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    select: { id: true, challengerId: true, opponentId: true, routineTitle: true },
  });

  if (activeChallenges.length === 0) return;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  for (const challenge of activeChallenges) {
    // Bugün zaten check-in yaptı mı?
    const existing = await prisma.challengeLog.findFirst({
      where: {
        challengeId: challenge.id,
        userId,
        completedAt: { gte: todayStart, lt: todayEnd },
      },
    });
    if (existing) continue;

    await prisma.challengeLog.create({
      data: { challengeId: challenge.id, userId },
    });

    // Rakibe bildirim gönder
    const opponentId =
      challenge.challengerId === userId
        ? challenge.opponentId
        : challenge.challengerId;

    await sendPushToUserAction(opponentId, {
      title: "Düello Güncellemesi ⚔️",
      body: `Rakibin "${challenge.routineTitle}" rutinini tamamladı!`,
      url: "/social",
      tag: `challenge-score-${challenge.id}`,
    }).catch(() => {});
  }
}
