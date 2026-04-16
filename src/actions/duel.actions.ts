"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { sendPushToUserAction } from "@/actions/push.actions";
import { randomBytes } from "crypto";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DUEL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 saat
const MIN_STAKE = 10;
const MAX_STAKE = 500;
const MAX_ACTIVE_DUELS = 3;

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type DuelEntry = {
  id: string;
  stake: number;
  status: string;
  startTime: string | null;
  endTime: string | null;
  winnerId: string | null;
  challengerScore: number;
  opponentScore: number;
  challenger: { id: string; name: string | null; image: string | null; xp: number };
  opponent: { id: string; name: string | null; image: string | null; xp: number } | null;
  isChallenger: boolean;
  timeLeftMs: number;
  createdAt: string;
  inviteCode: string | null;
  isPrivate: boolean;
};

export type DuelResult = {
  duelId: string;
  outcome: "win" | "loss" | "draw";
  coinsWon: number;
};

export type DuelMessageEntry = {
  id: string;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  content: string;
  createdAt: string;
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mapDuel(
  d: any,
  currentUserId: string
): DuelEntry {
  const now = Date.now();
  const endMs = d.endTime ? new Date(d.endTime).getTime() : 0;
  return {
    id: d.id,
    stake: d.stake,
    status: d.status,
    startTime: d.startTime?.toISOString() ?? null,
    endTime: d.endTime?.toISOString() ?? null,
    winnerId: d.winnerId,
    challengerScore: d.challengerScore,
    opponentScore: d.opponentScore,
    challenger: {
      id: d.challenger.id,
      name: d.challenger.name,
      image: d.challenger.image,
      xp: d.challenger.xp,
    },
    opponent: d.opponent
      ? {
          id: d.opponent.id,
          name: d.opponent.name,
          image: d.opponent.image,
          xp: d.opponent.xp,
        }
      : null,
    isChallenger: d.challengerId === currentUserId,
    timeLeftMs: endMs > now ? endMs - now : 0,
    createdAt: d.createdAt?.toISOString() ?? new Date().toISOString(),
    inviteCode: d.inviteCode ?? null,
    isPrivate: d.isPrivate ?? false,
  };
}

const DUEL_SELECT = {
  id: true,
  stake: true,
  status: true,
  startTime: true,
  endTime: true,
  winnerId: true,
  challengerScore: true,
  opponentScore: true,
  challengerId: true,
  opponentId: true,
  createdAt: true,
  inviteCode: true,
  isPrivate: true,
  challenger: { select: { id: true, name: true, image: true, xp: true } },
  opponent: { select: { id: true, name: true, image: true, xp: true } },
} as const;

// â”€â”€â”€ 1. DÃ¼ello Teklifi OluÅŸtur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createDuelInvitation(input: {
  opponentId: string;
  stake: number;
}): Promise<{ success: boolean; error?: string; duelId?: string }> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const userName = (session.user as any).name as string | null;

  const { opponentId, stake } = input;

  // Kendine dÃ¼ello yapÄ±lamaz
  if (userId === opponentId) {
    return { success: false, error: "SELF_DUEL" };
  }

  // Stake sÄ±nÄ±r kontrolÃ¼
  if (stake < MIN_STAKE || stake > MAX_STAKE) {
    return { success: false, error: "INVALID_STAKE" };
  }

  // TamsayÄ± kontrolÃ¼
  if (!Number.isInteger(stake)) {
    return { success: false, error: "INVALID_STAKE" };
  }

  // ArkadaÅŸlÄ±k kontrolÃ¼
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { followerId: userId, followingId: opponentId },
        { followerId: opponentId, followingId: userId },
      ],
    },
  });

  if (!friendship) {
    return { success: false, error: "NOT_FRIENDS" };
  }

  // Aktif dÃ¼ello limiti
  const activeDuelCount = await prisma.duel.count({
    where: {
      OR: [{ challengerId: userId }, { opponentId: userId }],
      status: { in: ["PENDING", "ACTIVE"] },
    },
  });

  if (activeDuelCount >= MAX_ACTIVE_DUELS) {
    return { success: false, error: "MAX_DUELS" };
  }

  // Coin bakiyesi kontrolÃ¼ â€” transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user || user.coins < stake) {
      return { success: false as const, error: "INSUFFICIENT_COINS" };
    }

    // AltÄ±nÄ± dondur (dÃ¼ÅŸÃ¼r)
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: stake } },
    });

    // DÃ¼ello oluÅŸtur
    const duel = await tx.duel.create({
      data: {
        challengerId: userId,
        opponentId,
        stake,
        status: "PENDING",
      },
    });

    return { success: true as const, duelId: duel.id };
  });

  if (!result.success) {
    return result;
  }

  // Push bildirim (hata sessizce yutulur)
  await sendPushToUserAction(opponentId, {
    title: "Disiplin DÃ¼ellosu! âš”ï¸",
    body: `${userName ?? "Birisi"} sana ${stake} altÄ±nlÄ±k bir dÃ¼ello teklif etti!`,
    url: "/social",
    tag: `duel-invite-${result.duelId}`,
  }).catch(() => {});

  return result;
}

// â”€â”€â”€ 2. DÃ¼ello Teklifine YanÄ±t Ver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function respondToDuel(input: {
  duelId: string;
  accept: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const userName = (session.user as any).name as string | null;

  const { duelId, accept } = input;

  const result = await prisma.$transaction(async (tx) => {
    const duel = await tx.duel.findUnique({
      where: { id: duelId },
      select: {
        id: true,
        opponentId: true,
        challengerId: true,
        status: true,
        stake: true,
      },
    });

    if (!duel) return { success: false as const, error: "NOT_FOUND" };
    if (duel.opponentId !== userId) return { success: false as const, error: "NOT_OPPONENT" };
    if (duel.status !== "PENDING") return { success: false as const, error: "NOT_PENDING" };

    if (!accept) {
      // Reddetme â€” altÄ±nÄ± challenger'a iade et
      await tx.duel.update({
        where: { id: duelId },
        data: { status: "DECLINED" },
      });

      await tx.user.update({
        where: { id: duel.challengerId },
        data: { coins: { increment: duel.stake } },
      });

      return { success: true as const, challengerId: duel.challengerId };
    }

    // Kabul â€” rakibin coin bakiyesi kontrolÃ¼
    const opponent = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!opponent || opponent.coins < duel.stake) {
      return { success: false as const, error: "INSUFFICIENT_COINS" };
    }

    // Rakibin altÄ±nÄ±nÄ± dondur
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: duel.stake } },
    });

    const now = new Date();
    const endTime = new Date(now.getTime() + DUEL_DURATION_MS);

    await tx.duel.update({
      where: { id: duelId },
      data: {
        status: "ACTIVE",
        startTime: now,
        endTime,
      },
    });

    // Her iki kullanÄ±cÄ±nÄ±n currentDuelId'sini gÃ¼ncelle
    await tx.user.update({ where: { id: userId }, data: { currentDuelId: duelId } });
    await tx.user.update({ where: { id: duel.challengerId }, data: { currentDuelId: duelId } });

    return { success: true as const, challengerId: duel.challengerId };
  });

  if (!result.success) return result;

  // Push bildirim
  const pushTarget = accept ? (result as any).challengerId : (result as any).challengerId;
  const pushBody = accept
    ? `${userName ?? "Rakibin"} dÃ¼ellonu kabul etti! SavaÅŸ baÅŸladÄ±! âš”ï¸`
    : `${userName ?? "Rakibin"} dÃ¼ellonu reddetti.`;

  await sendPushToUserAction(pushTarget, {
    title: accept ? "DÃ¼ello BaÅŸladÄ±! ğŸ”¥" : "DÃ¼ello Reddedildi",
    body: pushBody,
    url: "/social",
    tag: `duel-response-${duelId}`,
  }).catch(() => {});

  return { success: true };
}

// â”€â”€â”€ 3. DÃ¼ello Skoru GÃ¼ncelle (Rutin tamamlandÄ±ÄŸÄ±nda Ã§aÄŸrÄ±lÄ±r) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateDuelScore(
  userId: string
): Promise<{ updated: boolean; opponentName: string | null }> {
  // Aktif dÃ¼ellolarÄ± bul
  const activeDuels = await prisma.duel.findMany({
    where: {
      status: "ACTIVE",
      endTime: { gt: new Date() },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    select: {
      id: true,
      challengerId: true,
      opponentId: true,
      challenger: { select: { name: true } },
      opponent: { select: { name: true } },
    },
  });

  if (activeDuels.length === 0) return { updated: false, opponentName: null };

  let opponentName: string | null = null;

  for (const duel of activeDuels) {
    const field = duel.challengerId === userId ? "challengerScore" : "opponentScore";
    await prisma.duel.update({
      where: { id: duel.id },
      data: { [field]: { increment: 1 } },
    });
    // Ä°lk dÃ¼ellodaki rakip ismini al
    if (!opponentName) {
      opponentName =
        duel.challengerId === userId
          ? duel.opponent?.name ?? null
          : duel.challenger?.name ?? null;
    }
  }

  return { updated: true, opponentName };
}

// â”€â”€â”€ 4. DÃ¼ello Durumu Kontrol & Finalize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function checkAndFinalizeDuels(
  userId: string
): Promise<DuelResult[]> {
  const results: DuelResult[] = [];

  // SÃ¼resi dolmuÅŸ ama henÃ¼z FINISHED olmayan dÃ¼ellolarÄ± bul
  const expiredDuels = await prisma.duel.findMany({
    where: {
      status: "ACTIVE",
      endTime: { lte: new Date() },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });

  for (const duel of expiredDuels) {
    const result = await prisma.$transaction(async (tx) => {
      // Tekrar kontrol (race-condition gÃ¼venliÄŸi)
      const fresh = await tx.duel.findUnique({
        where: { id: duel.id },
      });
      if (!fresh || fresh.status !== "ACTIVE") return null;

      let winnerId: string | null = null;
      let outcome: "win" | "loss" | "draw";
      const totalPot = fresh.stake * 2;

      if (fresh.challengerScore > fresh.opponentScore) {
        winnerId = fresh.challengerId;
      } else if (fresh.opponentScore > fresh.challengerScore) {
        winnerId = fresh.opponentId;
      }
      // EÅŸitlik â†’ draw

      if (winnerId) {
        // Kazanan potu alÄ±r
        await tx.user.update({
          where: { id: winnerId },
          data: { coins: { increment: totalPot } },
        });

        outcome = winnerId === userId ? "win" : "loss";
      } else {
        // Berabere â€” herkes altÄ±nÄ±nÄ± geri alÄ±r
        await tx.user.update({
          where: { id: fresh.challengerId },
          data: { coins: { increment: fresh.stake } },
        });
        await tx.user.update({
          where: { id: fresh.opponentId },
          data: { coins: { increment: fresh.stake } },
        });
        outcome = "draw";
      }

      // DÃ¼elloyu kapat
      await tx.duel.update({
        where: { id: duel.id },
        data: { status: "FINISHED", winnerId },
      });

      // Ephemeral: Sohbet mesajlarÄ±nÄ± temizle
      await tx.duelMessage.deleteMany({ where: { duelId: duel.id } });

      // currentDuelId temizle
      await tx.user.updateMany({
        where: { id: { in: [fresh.challengerId, fresh.opponentId] }, currentDuelId: duel.id },
        data: { currentDuelId: null },
      });

      return {
        duelId: duel.id,
        outcome,
        coinsWon: outcome === "win" ? totalPot : outcome === "draw" ? fresh.stake : 0,
      } satisfies DuelResult;
    });

    if (result) results.push(result);
  }

  // SÃ¼resi dolmuÅŸ PENDING dÃ¼ellolarÄ± expire et (24 saat geÃ§miÅŸ)
  const staleThreshold = new Date(Date.now() - DUEL_DURATION_MS);
  const stalePending = await prisma.duel.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: staleThreshold },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });

  for (const duel of stalePending) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.duel.findUnique({ where: { id: duel.id } });
      if (!fresh || fresh.status !== "PENDING") return;

      await tx.duel.update({
        where: { id: duel.id },
        data: { status: "EXPIRED" },
      });

      // Challenger'a altÄ±nÄ± iade et
      await tx.user.update({
        where: { id: fresh.challengerId },
        data: { coins: { increment: fresh.stake } },
      });
    });
  }

  return results;
}

// â”€â”€â”€ 5. DÃ¼ellolarÄ± Getir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getDuelsAction(): Promise<DuelEntry[]> {
  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return [];

  const duels = await prisma.duel.findMany({
    where: {
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    select: DUEL_SELECT,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return duels.map((d) => mapDuel(d, userId));
}

// â”€â”€â”€ 6. Aktif DÃ¼ello Getir (Arena iÃ§in) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getActiveDuelAction(): Promise<DuelEntry | null> {
  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return null;

  const duel = await prisma.duel.findFirst({
    where: {
      status: "ACTIVE",
      endTime: { gt: new Date() },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    select: DUEL_SELECT,
    orderBy: { startTime: "desc" },
  });

  if (!duel) return null;
  return mapDuel(duel, userId);
}

// â”€â”€â”€ 7. Ã–zel DÃ¼ello OluÅŸtur (Private Duel) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // 8 karakter, Ã¶rn: "A3F1B2C4"
}

export async function createPrivateDuel(input: {
  stake: number;
}): Promise<{ success: boolean; error?: string; inviteCode?: string; duelId?: string }> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const { stake } = input;

  // Stake sÄ±nÄ±r kontrolÃ¼
  if (!Number.isInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    return { success: false, error: "INVALID_STAKE" };
  }

  // Aktif dÃ¼ello limiti
  const activeDuelCount = await prisma.duel.count({
    where: {
      OR: [{ challengerId: userId }, { opponentId: userId }],
      status: { in: ["PENDING", "ACTIVE"] },
    },
  });

  if (activeDuelCount >= MAX_ACTIVE_DUELS) {
    return { success: false, error: "MAX_DUELS" };
  }

  // Benzersiz inviteCode Ã¼ret (collision-safe)
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.duel.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user || user.coins < stake) {
      return { success: false as const, error: "INSUFFICIENT_COINS" };
    }

    // AltÄ±nÄ± dondur
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: stake } },
    });

    // Ã–zel dÃ¼ello oluÅŸtur (opponent yok henÃ¼z)
    const duel = await tx.duel.create({
      data: {
        challengerId: userId,
        stake,
        status: "PENDING",
        isPrivate: true,
        inviteCode,
      },
    });

    return { success: true as const, duelId: duel.id, inviteCode };
  });

  return result;
}

// â”€â”€â”€ 8. Davet Koduyla DÃ¼elloya KatÄ±l â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function joinDuelByCode(input: {
  inviteCode: string;
}): Promise<{ success: boolean; error?: string; duelId?: string }> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const userName = (session.user as any).name as string | null;
  const { inviteCode } = input;

  if (!inviteCode || inviteCode.trim().length === 0) {
    return { success: false, error: "INVALID_CODE" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const duel = await tx.duel.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      select: {
        id: true,
        challengerId: true,
        opponentId: true,
        status: true,
        stake: true,
        isPrivate: true,
      },
    });

    if (!duel || !duel.isPrivate) {
      return { success: false as const, error: "INVALID_CODE" };
    }

    if (duel.status !== "PENDING") {
      return { success: false as const, error: "ALREADY_STARTED" };
    }

    if (duel.opponentId) {
      return { success: false as const, error: "ALREADY_JOINED" };
    }

    // Kendine dÃ¼ello yapÄ±lamaz
    if (duel.challengerId === userId) {
      return { success: false as const, error: "SELF_DUEL" };
    }

    // ArkadaÅŸlÄ±k kontrolÃ¼
    const friendship = await tx.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { followerId: userId, followingId: duel.challengerId },
          { followerId: duel.challengerId, followingId: userId },
        ],
      },
    });

    if (!friendship) {
      return { success: false as const, error: "NOT_FRIENDS" };
    }

    // Aktif dÃ¼ello limiti
    const activeDuelCount = await tx.duel.count({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (activeDuelCount >= MAX_ACTIVE_DUELS) {
      return { success: false as const, error: "MAX_DUELS" };
    }

    // Coin bakiyesi kontrolÃ¼
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user || user.coins < duel.stake) {
      return { success: false as const, error: "INSUFFICIENT_COINS" };
    }

    // Rakibin altÄ±nÄ±nÄ± dondur
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: duel.stake } },
    });

    const now = new Date();
    const endTime = new Date(now.getTime() + DUEL_DURATION_MS);

    // DÃ¼elloyu aktifleÅŸtir
    await tx.duel.update({
      where: { id: duel.id },
      data: {
        opponentId: userId,
        status: "ACTIVE",
        startTime: now,
        endTime,
      },
    });

    // Her iki kullanÄ±cÄ±nÄ±n currentDuelId'sini gÃ¼ncelle
    await tx.user.update({ where: { id: userId }, data: { currentDuelId: duel.id } });
    await tx.user.update({ where: { id: duel.challengerId }, data: { currentDuelId: duel.id } });

    return { success: true as const, duelId: duel.id, challengerId: duel.challengerId };
  });

  if (!result.success) return result;

  // Challenger'a push bildirim
  const challengerId = (result as any).challengerId;
  await sendPushToUserAction(challengerId, {
    title: "DÃ¼ello Kabul Edildi! ğŸ”¥",
    body: `${userName ?? "Birisi"} Ã¶zel dÃ¼ellona katÄ±ldÄ±! SavaÅŸ baÅŸladÄ±! âš”ï¸`,
    url: "/social",
    tag: `duel-joined-${(result as any).duelId}`,
  }).catch(() => {});

  return { success: true, duelId: (result as any).duelId };
}

// â”€â”€â”€ 9. DÃ¼ello KazananÄ±nÄ± Hesapla â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function calculateDuelWinner(
  duelId: string
): Promise<DuelResult | null> {
  const result = await prisma.$transaction(async (tx) => {
    const duel = await tx.duel.findUnique({
      where: { id: duelId },
    });

    if (!duel || duel.status !== "ACTIVE") return null;
    if (!duel.opponentId) return null;

    // SÃ¼re dolmamÄ±ÅŸsa hesaplama yapma
    if (duel.endTime && new Date(duel.endTime).getTime() > Date.now()) {
      return null;
    }

    let winnerId: string | null = null;
    const totalPot = duel.stake * 2;

    if (duel.challengerScore > duel.opponentScore) {
      winnerId = duel.challengerId;
    } else if (duel.opponentScore > duel.challengerScore) {
      winnerId = duel.opponentId;
    }

    if (winnerId) {
      await tx.user.update({
        where: { id: winnerId },
        data: { coins: { increment: totalPot } },
      });
    } else {
      // Berabere â€” altÄ±nlarÄ± iade et
      await tx.user.update({
        where: { id: duel.challengerId },
        data: { coins: { increment: duel.stake } },
      });
      await tx.user.update({
        where: { id: duel.opponentId },
        data: { coins: { increment: duel.stake } },
      });
    }

    await tx.duel.update({
      where: { id: duelId },
      data: { status: "FINISHED", winnerId },
    });

    // Ephemeral: Sohbet mesajlarÄ±nÄ± temizle
    await tx.duelMessage.deleteMany({ where: { duelId } });

    await tx.user.updateMany({
      where: { id: { in: [duel.challengerId, duel.opponentId] }, currentDuelId: duelId },
      data: { currentDuelId: null },
    });

    return {
      duelId: duel.id,
      outcome: winnerId
        ? "win" as const
        : "draw" as const,
      coinsWon: winnerId ? totalPot : duel.stake,
    } satisfies DuelResult;
  });

  return result;
}

// â”€â”€â”€ 10. Bekleyen Ã–zel DÃ¼elloyu Getir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getPendingPrivateDuel(): Promise<DuelEntry | null> {
  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return null;

  const duel = await prisma.duel.findFirst({
    where: {
      challengerId: userId,
      isPrivate: true,
      status: "PENDING",
      opponentId: null,
    },
    select: DUEL_SELECT,
    orderBy: { createdAt: "desc" },
  });

  if (!duel) return null;
  return mapDuel(duel, userId);
}

// â”€â”€â”€ 11. DÃ¼ello MesajlarÄ±nÄ± Getir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MESSAGE_LIMIT = 50;

export async function getDuelMessages(input: {
  duelId: string;
}): Promise<DuelMessageEntry[]> {
  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return [];

  // KullanÄ±cÄ± bu dÃ¼elloda taraf mÄ± kontrol et
  const duel = await prisma.duel.findFirst({
    where: {
      id: input.duelId,
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    select: { id: true },
  });

  if (!duel) return [];

  const messages = await prisma.duelMessage.findMany({
    where: { duelId: input.duelId },
    orderBy: { createdAt: "asc" },
    take: MESSAGE_LIMIT,
    select: {
      id: true,
      senderId: true,
      content: true,
      createdAt: true,
      sender: { select: { name: true, image: true } },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.sender.name,
    senderImage: m.sender.image,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
}

// â”€â”€â”€ 12. DÃ¼ello MesajÄ± GÃ¶nder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MAX_MESSAGE_LENGTH = 200;
const COOLDOWN_SECONDS = 3;
const _lastMessageTime = new Map<string, number>();

export async function sendDuelMessage(input: {
  duelId: string;
  content: string;
}): Promise<{ success: boolean; message?: DuelMessageEntry; error?: string }> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  // Mesaj uzunluk kontrolÃ¼
  const content = input.content.trim();
  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    return { success: false, error: "INVALID_MESSAGE" };
  }

  // Cooldown kontrolÃ¼ (kullanÄ±cÄ± bazlÄ±)
  const cooldownKey = `${userId}:${input.duelId}`;
  const lastSent = _lastMessageTime.get(cooldownKey) ?? 0;
  if (Date.now() - lastSent < COOLDOWN_SECONDS * 1000) {
    return { success: false, error: "COOLDOWN" };
  }

  // DÃ¼ello aktif mi ve kullanÄ±cÄ± taraf mÄ± kontrol et
  const duel = await prisma.duel.findFirst({
    where: {
      id: input.duelId,
      status: "ACTIVE",
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    select: { id: true },
  });

  if (!duel) {
    return { success: false, error: "DUEL_NOT_FOUND" };
  }

  const created = await prisma.duelMessage.create({
    data: {
      duelId: input.duelId,
      senderId: userId,
      content,
    },
    select: {
      id: true,
      senderId: true,
      content: true,
      createdAt: true,
      sender: { select: { name: true, image: true } },
    },
  });

  _lastMessageTime.set(cooldownKey, Date.now());

  return {
    success: true,
    message: {
      id: created.id,
      senderId: created.senderId,
      senderName: created.sender.name,
      senderImage: created.sender.image,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
    },
  };
}
