"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { sendPushToUserAction } from "@/actions/push.actions";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { unstable_cache } from "next/cache";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ DÃ¼ello GÃ¶nder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function sendChallengeAction(input: {
  opponentId: string;
  routineTitle: string;
  durationDays: number;
}) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  if (userId === input.opponentId) throw new Error("Cannot challenge yourself");

  // ArkadaÅŸ kontrolÃ¼
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

  // Aktif dÃ¼ello limiti (max 3)
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
    title: "DÃ¼ello Daveti! âš”ï¸",
    body: `${challenge.challenger.name ?? "Birisi"} sana "${input.routineTitle}" Ã¼zerinden ${input.durationDays} gÃ¼nlÃ¼k dÃ¼ello gÃ¶nderdi!`,
    url: "/leaderboard",
    tag: `challenge-${challenge.id}`,
  }).catch(() => {});

  return { id: challenge.id };
}

// â”€â”€â”€ DÃ¼ello Kabul Et â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    title: "DÃ¼ello BaÅŸladÄ±! ğŸ”¥",
    body: `${updated.opponent.name ?? "Rakibin"} dÃ¼ellonu kabul etti! "${challenge.routineTitle}" baÅŸlÄ±yor.`,
    url: "/leaderboard",
    tag: `challenge-start-${challengeId}`,
  }).catch(() => {});

  return { success: true };
}

// â”€â”€â”€ DÃ¼ello Reddet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function declineChallengeAction(challengeId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  await prisma.challenge.update({
    where: { id: challengeId, opponentId: userId, status: "PENDING" },
    data: { status: "DECLINED" },
  });

  return { success: true };
}

// â”€â”€â”€ GÃ¼nlÃ¼k Check-in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // BugÃ¼n zaten check-in yaptÄ± mÄ±?
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

// â”€â”€â”€ Aktif/Bekleyen DÃ¼ellolarÄ± Getir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Tamamlanan DÃ¼ellolarÄ± Getir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Ã–dÃ¼l Sabitleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REWARD_WIN   = { xp: 100, coins: 50 } as const;
const REWARD_DRAW  = { xp: 40,  coins: 20 } as const;
const REWARD_LOSS  = { xp: 10,  coins: 0  } as const;

// â”€â”€â”€ Biten DÃ¼ellolarÄ± Finalize Et & Ã–dÃ¼l DaÄŸÄ±t â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * SÃ¼resi dolmuÅŸ ACTIVE dÃ¼ellolarÄ± bulur, skorlarÄ± karÅŸÄ±laÅŸtÄ±rÄ±r,
 * kazanan/berabere belirler, atomik transaction ile XP/Coin daÄŸÄ±tÄ±r,
 * challenge'Ä± COMPLETED + rewardDistributed olarak iÅŸaretler.
 *
 * KullanÄ±cÄ±nÄ±n kazandÄ±ÄŸÄ± Ã¶dÃ¼lleri ChallengeRewardResult[] olarak dÃ¶ner.
 */
export async function distributeChallengeRewards(
  userId: string
): Promise<ChallengeRewardResult[]> {
  const now = new Date();
  const rewards: ChallengeRewardResult[] = [];

  // 1) SÃ¼resi dolmuÅŸ, henÃ¼z Ã¶dÃ¼l daÄŸÄ±tÄ±lmamÄ±ÅŸ ACTIVE dÃ¼ellolar
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
      // Atomik transaction: durum + Ã¶dÃ¼ller aynÄ± anda
      await prisma.$transaction(async (tx) => {
        // Double-spending korumasÄ±: tekrar kontrol
        const fresh = await tx.challenge.findUnique({
          where: { id: c.id },
          select: { rewardDistributed: true, status: true },
        });
        if (!fresh || fresh.rewardDistributed || fresh.status === "COMPLETED") {
          return; // Zaten Ã¶dÃ¼l daÄŸÄ±tÄ±lmÄ±ÅŸ
        }

        // Challenge'Ä± gÃ¼ncelle
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
          // Kaybeden: 10 XP teselli Ã¶dÃ¼lÃ¼
          await tx.user.update({
            where: { id: loserId! },
            data: { xp: { increment: REWARD_LOSS.xp } },
          });
        }
      });

      // KullanÄ±cÄ± iÃ§in sonuÃ§ belirle
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
            title: "DÃ¼ello Berabere! ğŸ¤",
            body: `"${c.routineTitle}" dÃ¼ellosu berabere bitti. +${REWARD_DRAW.xp} XP, +${REWARD_DRAW.coins} Coin`,
            url: "/social",
            tag: `challenge-draw-${c.id}`,
          }).catch(() => {});
        }
      } else {
        // Kazanana bildirim
        await sendPushToUserAction(winnerId!, {
          title: "DÃ¼ello KazandÄ±n! ğŸ†",
          body: `"${c.routineTitle}" dÃ¼ellosunu kazandÄ±n! +${REWARD_WIN.xp} XP, +${REWARD_WIN.coins} Coin`,
          url: "/social",
          tag: `challenge-win-${c.id}`,
        }).catch(() => {});
        // Kaybedene bildirim
        await sendPushToUserAction(loserId!, {
          title: "DÃ¼ello Bitti âš”ï¸",
          body: `"${c.routineTitle}" dÃ¼ellosunu ${winnerName ?? "Rakip"} kazandÄ±. +${REWARD_LOSS.xp} XP teselli Ã¶dÃ¼lÃ¼`,
          url: "/social",
          tag: `challenge-loss-${c.id}`,
        }).catch(() => {});
      }
    } catch (error) {
      console.error(`[distributeChallengeRewards] Challenge ${c.id} error:`, error);
      // HatalÄ± challenge'Ä± atla, diÄŸerlerine devam et
    }
  }

  // SÃ¼resi dolmuÅŸ PENDING olanlarÄ± expire et (3 gÃ¼n yanÄ±t yok)
  const stale = new Date(now);
  stale.setDate(stale.getDate() - 3);

  await prisma.challenge.updateMany({
    where: { status: "PENDING", createdAt: { lte: stale } },
    data: { status: "EXPIRED" },
  }).catch(() => {});

  return rewards;
}

// â”€â”€â”€ Eski uyumluluk wrapper'Ä± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function finalizeExpiredChallengesAction() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  return distributeChallengeRewards(userId);
}

// â”€â”€â”€ Rutin TamamlandÄ±ÄŸÄ±nda DÃ¼ello Skorunu GÃ¼ncelle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Bir kullanÄ±cÄ± rutin tamamladÄ±ÄŸÄ±nda, eÄŸer aynÄ± rutin baÅŸlÄ±ÄŸÄ±na sahip
 * aktif bir dÃ¼ellosu varsa otomatik olarak check-in yapÄ±lÄ±r.
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
    // BugÃ¼n zaten check-in yaptÄ± mÄ±?
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

    // Rakibe bildirim gÃ¶nder
    const opponentId =
      challenge.challengerId === userId
        ? challenge.opponentId
        : challenge.challengerId;

    await sendPushToUserAction(opponentId, {
      title: "DÃ¼ello GÃ¼ncellemesi âš”ï¸",
      body: `Rakibin "${challenge.routineTitle}" rutinini tamamladÄ±!`,
      url: "/social",
      tag: `challenge-score-${challenge.id}`,
    }).catch(() => {});
  }
}

// â”€â”€â”€ Challenge Leaderboard Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ChallengeLeaderboardEntry = {
  rank: number;
  id: string;
  name: string | null;
  image: string | null;
  xp: number;
  subscriptionTier: string;
  challengeTitle: string | null;
  challengeCategory: string | null;
  challengeProgress: number;
  challengeTarget: number;
  completionRate: number;
  challengeCompleted: boolean;
  isCurrentUser: boolean;
};

export type ChallengeLeaderboardPayload = {
  entries: ChallengeLeaderboardEntry[];
  currentUser: ChallengeLeaderboardEntry | null;
  weekKey: string;
};

// â”€â”€â”€ Challenge Leaderboard Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// â”€â”€â”€ Cached leaderboard data (shared across users, revalidates every hour) â”€â”€

const getCachedLeaderboardData = unstable_cache(
  async (weekKey: string) => {
    const insights = await prisma.weeklyInsight.findMany({
      where: {
        weekKey,
        challengeTarget: { gt: 0 },
        user: { isPublic: true },
      },
      select: {
        userId: true,
        challengeTitle: true,
        challengeCategory: true,
        challengeProgress: true,
        challengeTarget: true,
        challengeCompleted: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            xp: true,
            subscriptionTier: true,
          },
        },
      },
    });

    const sorted = insights
      .map((i) => ({
        ...i,
        createdAtMs: i.createdAt.getTime(),
        completionRate: Math.min(
          100,
          Math.round((i.challengeProgress / i.challengeTarget) * 100)
        ),
      }))
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
        if (b.user.xp !== a.user.xp) return b.user.xp - a.user.xp;
        return a.createdAtMs - b.createdAtMs;
      });

    return sorted.slice(0, 20).map((i, idx) => ({
      rank: idx + 1,
      id: i.user.id,
      name: i.user.name,
      image: i.user.image,
      xp: i.user.xp,
      subscriptionTier: i.user.subscriptionTier,
      challengeTitle: i.challengeTitle,
      challengeCategory: i.challengeCategory,
      challengeProgress: i.challengeProgress,
      challengeTarget: i.challengeTarget,
      completionRate: i.completionRate,
      challengeCompleted: i.challengeCompleted,
    }));
  },
  ["challenge-leaderboard"],
  { revalidate: 3600 } // 1 saat
);

export async function getChallengeLeaderboard(): Promise<ChallengeLeaderboardPayload> {
  const session = await getSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const weekKey = getCurrentWeekKey();

  const cached = await getCachedLeaderboardData(weekKey);

  // KullanÄ±cÄ± bilgilerini ekle
  const entries: ChallengeLeaderboardEntry[] = cached.map((e) => ({
    ...e,
    isCurrentUser: e.id === currentUserId,
  }));

  // KullanÄ±cÄ± listede yoksa ayrÄ± Ã§ek
  let currentUser: ChallengeLeaderboardEntry | null = null;

  if (currentUserId && !entries.some((e) => e.isCurrentUser)) {
    const userInsight = await prisma.weeklyInsight.findUnique({
      where: { userId_weekKey: { userId: currentUserId, weekKey } },
      select: {
        challengeTitle: true,
        challengeCategory: true,
        challengeProgress: true,
        challengeTarget: true,
        challengeCompleted: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            xp: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (userInsight && userInsight.challengeTarget > 0) {
      const userRate = Math.min(
        100,
        Math.round(
          (userInsight.challengeProgress / userInsight.challengeTarget) * 100
        )
      );

      const aboveCount = cached.filter(
        (s) =>
          s.completionRate > userRate ||
          (s.completionRate === userRate && s.xp > userInsight.user.xp)
      ).length;

      currentUser = {
        rank: aboveCount + 1,
        id: userInsight.user.id,
        name: userInsight.user.name,
        image: userInsight.user.image,
        xp: userInsight.user.xp,
        subscriptionTier: userInsight.user.subscriptionTier,
        challengeTitle: userInsight.challengeTitle,
        challengeCategory: userInsight.challengeCategory,
        challengeProgress: userInsight.challengeProgress,
        challengeTarget: userInsight.challengeTarget,
        completionRate: userRate,
        challengeCompleted: userInsight.challengeCompleted,
        isCurrentUser: true,
      };
    }
  }

  return { entries, currentUser, weekKey };
}
