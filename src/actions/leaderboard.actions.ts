"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUserLeague, type UserLeagueTier } from "@/lib/level";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string | null;
  image: string | null;
  xp: number;
  weeklyXp: number;
  league: UserLeagueTier;
  currentStreak: number;
  isCurrentUser: boolean;
  subscriptionTier: string;
};

export type LeaderboardPayload = {
  topTen: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalUsers: number;
};

function getWeekRangeUtc(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

type SelectedUser = {
  id: string;
  name: string | null;
  image: string | null;
  xp: number;
  subscriptionTier: any;
  routines: { currentStreak: number }[];
};

function toEntry(
  user: SelectedUser,
  rank: number,
  currentUserId: string | undefined,
  weeklyXpMap: Map<string, number>
): LeaderboardEntry {
  return {
    rank,
    id: user.id,
    name: user.name,
    image: user.image,
    xp: user.xp,
    weeklyXp: weeklyXpMap.get(user.id) ?? 0,
    league: getUserLeague(user.xp).tier,
    currentStreak: user.routines[0]?.currentStreak ?? 0,
    isCurrentUser: user.id === currentUserId,
    subscriptionTier: user.subscriptionTier,
  };
}

async function getWeeklyXpMap(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const { start, end } = getWeekRangeUtc();
  const grouped = await prisma.routineLog.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, completedAt: { gte: start, lt: end } },
    _count: { userId: true },
  });
  return new Map(grouped.map((g) => [g.userId, g._count.userId * 10]));
}

// â”€â”€â”€ Main Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getLeaderboard(): Promise<LeaderboardPayload> {
  const session = await getSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  // Top 10 â€” sadece public profiller
  const topUsers = await prisma.user.findMany({
    where: { isPublic: true, xp: { gt: 0 } },
    orderBy: { xp: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      image: true,
      xp: true,
      subscriptionTier: true,
      routines: {
        where: { isActive: true },
        select: { currentStreak: true },
        orderBy: { currentStreak: "desc" },
        take: 1,
      },
    },
  });

  const topTenWeeklyMap = await getWeeklyXpMap(topUsers.map((u) => u.id));
  const topTen: LeaderboardEntry[] = topUsers.map((u, i) =>
    toEntry(u, i + 1, currentUserId, topTenWeeklyMap)
  );

  // KullanÄ±cÄ±nÄ±n kendi sÄ±ralamasÄ±
  let currentUser: LeaderboardEntry | null = null;
  const totalUsers = await prisma.user.count({ where: { isPublic: true, xp: { gt: 0 } } });

  if (currentUserId) {
    const isInTopTen = topTen.some((e) => e.isCurrentUser);

    if (!isInTopTen) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true,
          name: true,
          image: true,
          xp: true,
          isPublic: true,
          subscriptionTier: true,
          routines: {
            where: { isActive: true },
            select: { currentStreak: true },
            orderBy: { currentStreak: "desc" },
            take: 1,
          },
        },
      });

      if (user) {
        // Rank hesapla: kaÃ§ kullanÄ±cÄ±nÄ±n XP'si daha yÃ¼ksek?
        const usersAbove = await prisma.user.count({
          where: {
            isPublic: true,
            xp: { gt: user.xp },
          },
        });

        const currentWeeklyMap = await getWeeklyXpMap([user.id]);
        currentUser = toEntry(user, usersAbove + 1, currentUserId, currentWeeklyMap);
      }
    }
  }

  return { topTen, currentUser, totalUsers };
}

export async function getLeagueLeaderboard(): Promise<LeaderboardPayload> {
  const session = await getSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  if (!currentUserId) return { topTen: [], currentUser: null, totalUsers: 0 };

  const me = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { xp: true },
  });
  if (!me) return { topTen: [], currentUser: null, totalUsers: 0 };

  const league = getUserLeague(me.xp);
  const xpFilter =
    league.maxXp === null
      ? { gte: league.minXp }
      : { gte: league.minXp, lte: league.maxXp };

  const topUsers = await prisma.user.findMany({
    where: { isPublic: true, xp: xpFilter },
    orderBy: { xp: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      image: true,
      xp: true,
      subscriptionTier: true,
      routines: {
        where: { isActive: true },
        select: { currentStreak: true },
        orderBy: { currentStreak: "desc" },
        take: 1,
      },
    },
  });

  const weeklyMap = await getWeeklyXpMap(topUsers.map((u) => u.id));
  const topTen = topUsers.map((u, i) => toEntry(u, i + 1, currentUserId, weeklyMap));
  const totalUsers = await prisma.user.count({ where: { isPublic: true, xp: xpFilter } });

  const isInTopTen = topTen.some((e) => e.id === currentUserId);
  let currentUser: LeaderboardEntry | null = null;
  if (!isInTopTen) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        name: true,
        image: true,
        xp: true,
        subscriptionTier: true,
        routines: {
          where: { isActive: true },
          select: { currentStreak: true },
          orderBy: { currentStreak: "desc" },
          take: 1,
        },
      },
    });
    if (user) {
      const usersAbove = await prisma.user.count({
        where: { isPublic: true, xp: { ...xpFilter, gt: user.xp } },
      });
      const userWeeklyMap = await getWeeklyXpMap([user.id]);
      currentUser = toEntry(user, usersAbove + 1, currentUserId, userWeeklyMap);
    }
  }

  return { topTen, currentUser, totalUsers };
}

export async function getWeeklyXpLeaderboard(limit = 10): Promise<LeaderboardPayload> {
  const session = await getSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const { start, end } = getWeekRangeUtc();

  const grouped = await prisma.routineLog.groupBy({
    by: ["userId"],
    where: { completedAt: { gte: start, lt: end } },
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
    take: Math.max(limit, 10),
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isPublic: true },
    select: {
      id: true,
      name: true,
      image: true,
      xp: true,
      subscriptionTier: true,
      routines: {
        where: { isActive: true },
        select: { currentStreak: true },
        orderBy: { currentStreak: "desc" },
        take: 1,
      },
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const weeklyMap = new Map(grouped.map((g) => [g.userId, g._count.userId * 10]));

  const sortedUsers = grouped
    .map((g) => userMap.get(g.userId))
    .filter(Boolean) as SelectedUser[];

  const topTen = sortedUsers.slice(0, 10).map((u, i) => toEntry(u, i + 1, currentUserId, weeklyMap));
  const totalUsers = sortedUsers.length;
  const currentUser = topTen.find((u) => u.id === currentUserId) ?? null;

  return { topTen, currentUser, totalUsers };
}

const GLOBAL_COMMUNITY_WEEK_TARGET = 10_000;

/** Topluluk: bu hafta (UTC) tamamlanan rutin sayısı vs haftalık hedef — XP'yi değiştirmez. */
export async function getGlobalCommunityChallengeAction() {
  const { start, end } = getWeekRangeUtc();
  const weekCompletions = await prisma.routineLog.count({
    where: { completedAt: { gte: start, lt: end } },
  });
  return {
    target: GLOBAL_COMMUNITY_WEEK_TARGET,
    weekCompletions,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
  };
}

export async function resetWeeklyLeagueWindowAction(input?: { force?: boolean }) {
  const now = new Date();
  const { start, end } = getWeekRangeUtc(now);
  const isMonday = now.getUTCDay() === 1;

  if (!input?.force && !isMonday) {
    return {
      ok: true,
      resetApplied: false,
      reason: "SKIPPED_NOT_MONDAY",
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
    };
  }

  // Physical XP reset yok; haftalık pencere otomatik reset davranışı sağlar.
  // Yine de cron gözlemi için bu haftanın anlık snapshot'ını döndürüyoruz.
  const weekly = await getWeeklyXpLeaderboard(10);
  return {
    ok: true,
    resetApplied: true,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    participants: weekly.totalUsers,
  };
}
