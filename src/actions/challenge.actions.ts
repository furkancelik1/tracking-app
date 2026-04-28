"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { sendPushToUserAction } from "@/actions/push.actions";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { unstable_cache, revalidateTag } from "next/cache";

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



export async function declineChallengeAction(challengeId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  await prisma.challenge.update({
    where: { id: challengeId, opponentId: userId, status: "PENDING" },
    data: { status: "DECLINED" },
  });

  return { success: true };
}


export async function challengeCheckInAction(challengeId: string, timezoneOffsetMinutes?: number) {
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

  // UTC gün sınırı — timezone-safe ve race-condition-safe.
  // completedAt = todayStart kullanarak mevcut @@unique([challengeId, userId, completedAt])
  // kısıtlamasına güveniriz. İki eş zamanlı istek olursa DB P2002 fırlatır.
  // Compute day boundary. If client provides timezone offset (minutes, as from
  // `new Date().getTimezoneOffset()`), interpret day based on that local timezone.
  // Otherwise fall back to UTC-midnight (server-local canonical day).
  let todayStart: Date;
  if (typeof timezoneOffsetMinutes === "number") {
    const now = new Date();
    const offset = timezoneOffsetMinutes; // as returned by getTimezoneOffset()
    // localNow's UTC fields represent the user's local date/time
    const localNow = new Date(now.getTime() - offset * 60000);
    const y = localNow.getUTCFullYear();
    const m = localNow.getUTCMonth();
    const d = localNow.getUTCDate();
    // local midnight in UTC = Date.UTC(localY,localM,localD) + offset_minutes
    const localMidnightUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) + offset * 60000;
    todayStart = new Date(localMidnightUtcMs);
  } else {
    todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
  }

  try {
    await prisma.challengeLog.create({
      data: { challengeId, userId, completedAt: todayStart },
    });
    // Invalidate leaderboard cache so UIs reflect the new check-in immediately
    try {
      // TypeScript'in 2 parametre beklemesi hatasını bypass etmek için 'as any' kullanıyoruz
      (revalidateTag as any)("challenge-leaderboard");
    } catch (e) {
      console.error("Revalidation error:", e);
    }
    return { alreadyCheckedIn: false };
  } catch (err: unknown) {
    // P2002 = unique constraint violation → zaten check-in yapılmış
    if ((err as any)?.code === "P2002") return { alreadyCheckedIn: true };
    throw err;
  }
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
    let winnerId: string | null = null;
    let loserId: string | null = null;
    let isDraw = false;

    try {
      // Atomik transaction: check-and-claim + recount logs inside the same tx
      await prisma.$transaction(async (tx) => {
        const claim = await tx.challenge.updateMany({
          where: { id: c.id, rewardDistributed: false, status: "ACTIVE" },
          data: { status: "COMPLETED", rewardDistributed: true },
        });
        // count=0 → başka bir transaction önce işledi, çift ödül engellendi
        if (claim.count === 0) return;

        // Re-count logs inside transaction to avoid TOCTOU issues
        const challengerCount = await tx.challengeLog.count({ where: { challengeId: c.id, userId: c.challengerId } });
        const opponentCount = await tx.challengeLog.count({ where: { challengeId: c.id, userId: c.opponentId } });

        isDraw = challengerCount === opponentCount;
        if (!isDraw) {
          winnerId = challengerCount > opponentCount ? c.challengerId : c.opponentId;
          loserId = winnerId === c.challengerId ? c.opponentId : c.challengerId;
          // Update winner + loser
          await tx.user.update({
            where: { id: winnerId! },
            data: { xp: { increment: REWARD_WIN.xp }, coins: { increment: REWARD_WIN.coins } },
          });
          await tx.user.update({
            where: { id: loserId! },
            data: { xp: { increment: REWARD_LOSS.xp } },
          });
        } else {
          // Draw: both get draw rewards
          await tx.user.update({
            where: { id: c.challengerId },
            data: { xp: { increment: REWARD_DRAW.xp }, coins: { increment: REWARD_DRAW.coins } },
          });
          await tx.user.update({
            where: { id: c.opponentId },
            data: { xp: { increment: REWARD_DRAW.xp }, coins: { increment: REWARD_DRAW.coins } },
          });
        }
      });
      // Invalidate leaderboard cache so UIs reflect completed challenges
      try {
        // TypeScript'in 2 parametre beklemesi hatasını bypass etmek için 'as any' kullanıyoruz
        (revalidateTag as any)("challenge-leaderboard");
      } catch (e) {
        console.error("Revalidation error:", e);
      }

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
  routineTitle: string,
  timezoneOffsetMinutes?: number
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

  // UTC gün sınırı — challengeCheckInAction ile aynı strateji:
  // completedAt = todayStart → DB unique kısıtı race condition'ı engeller.
  // Rutin silinirse veya yeniden adlandırılırsa challenge graceful olarak sürer;
  // kullanıcı otomatik check-in alamaz ama manuel check-in yine çalışır.
  // Compute day boundary consistent with challengeCheckInAction
  let todayStart = new Date();
  if (typeof timezoneOffsetMinutes === "number") {
    const now = new Date();
    const offset = timezoneOffsetMinutes;
    const localNow = new Date(now.getTime() - offset * 60000);
    const y = localNow.getUTCFullYear();
    const m = localNow.getUTCMonth();
    const d = localNow.getUTCDate();
    const localMidnightUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) + offset * 60000;
    todayStart = new Date(localMidnightUtcMs);
  } else {
    todayStart.setUTCHours(0, 0, 0, 0);
  }

  for (const challenge of activeChallenges) {
    try {
      await prisma.challengeLog.create({
        data: { challengeId: challenge.id, userId, completedAt: todayStart },
      });
      // update leaderboard cache
      try {
        (revalidateTag as any)("challenge-leaderboard");
      } catch (e) {}
    } catch (err: unknown) {
      // P2002 = bugün zaten check-in yapılmış (manual veya başka rutin completion)
      if ((err as any)?.code === "P2002") continue;
      throw err;
    }

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
  // TTL: 1 saat (pasif kullanıcılar için yeterli)
  // tags: rutin tamamlandığında revalidateTag("challenge-leaderboard") ile anında invalidate
  { revalidate: 3600, tags: ["challenge-leaderboard"] }
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
