"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendPushToUserAction } from "@/actions/push.actions";
import { getUserLeague, type UserLeagueTier } from "@/lib/level";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type FriendEntry = {
  id: string;
  friendshipId: string;
  name: string | null;
  image: string | null;
  xp: number;
  currentStreak: number;
  subscriptionTier: string;
};

export type FriendRequest = {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: string;
};

export type UserSearchResult = {
  id: string;
  name: string | null;
  image: string | null;
  xp: number;
  subscriptionTier: string;
  friendshipStatus: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING";
};

export type WeeklyLeagueEntry = {
  userId: string;
  name: string | null;
  image: string | null;
  weeklyXp: number;
  league: UserLeagueTier;
};

function startOfUtcDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekStartUtc(date = new Date()): Date {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay(); // 0 Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function getWeekKey(date = new Date()): string {
  const weekStart = getWeekStartUtc(date);
  return `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}-${String(
    weekStart.getUTCDate()
  ).padStart(2, "0")}`;
}

// â”€â”€â”€ KullanÄ±cÄ± Arama â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function searchUsersAction(
  query: string
): Promise<UserSearchResult[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  if (!query || query.trim().length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      isPublic: true,
      id: { not: userId },
      name: { contains: query.trim(), mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      image: true,
      xp: true,
      subscriptionTier: true,
    },
    take: 10,
    orderBy: { xp: "desc" },
  });

  // Mevcut friendship durumlarÄ±nÄ± kontrol et
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { followerId: userId, followingId: { in: users.map((u) => u.id) } },
        { followingId: userId, followerId: { in: users.map((u) => u.id) } },
      ],
    },
    select: { followerId: true, followingId: true, status: true },
  });

  const friendMap = new Map<string, "PENDING" | "ACCEPTED" | "INCOMING">();
  for (const f of friendships) {
    const otherId = f.followerId === userId ? f.followingId : f.followerId;
    if (f.status === "ACCEPTED") {
      friendMap.set(otherId, "ACCEPTED");
    } else if (f.status === "PENDING") {
      friendMap.set(otherId, f.followerId === userId ? "PENDING" : "INCOMING");
    }
  }

  return users.map((u) => ({
    ...u,
    friendshipStatus: friendMap.get(u.id) ?? "NONE",
  }));
}

// â”€â”€â”€ Takip Et â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function followUserAction(targetId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  if (userId === targetId) throw new Error("Cannot follow yourself");

  // Duplikat kontrolÃ¼
  const existing = await prisma.friendship.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
  });
  if (existing) return { status: existing.status };

  const friendship = await prisma.friendship.create({
    data: { followerId: userId, followingId: targetId },
    include: { follower: { select: { name: true } } },
  });

  // Push bildirim gÃ¶nder
  await sendPushToUserAction(targetId, {
    title: "Yeni TakipÃ§i! ğŸ‘¥",
    body: `${friendship.follower.name ?? "Birisi"} seni takip etmek istiyor.`,
    url: "/leaderboard",
    tag: `follow-${userId}`,
  }).catch(() => {});

  return { status: friendship.status };
}

// â”€â”€â”€ Takip Ä°steÄŸi Onayla â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function acceptFollowAction(friendshipId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const friendship = await prisma.friendship.update({
    where: { id: friendshipId, followingId: userId, status: "PENDING" },
    data: { status: "ACCEPTED" },
    include: { following: { select: { name: true } } },
  });

  // KarÅŸÄ±dakine bildirim
  await sendPushToUserAction(friendship.followerId, {
    title: "Takip OnaylandÄ±! âœ…",
    body: `${friendship.following.name ?? "KullanÄ±cÄ±"} takip isteÄŸini kabul etti.`,
    url: "/leaderboard",
    tag: `accept-${userId}`,
  }).catch(() => {});

  return { success: true };
}

// â”€â”€â”€ Takip Ä°steÄŸi Reddet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function rejectFollowAction(friendshipId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  await prisma.friendship.delete({
    where: { id: friendshipId, followingId: userId, status: "PENDING" },
  });

  return { success: true };
}

// â”€â”€â”€ Takibi BÄ±rak â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function unfollowAction(targetId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { followerId: userId, followingId: targetId },
        { followerId: targetId, followingId: userId },
      ],
    },
  });

  return { success: true };
}

// â”€â”€â”€ ArkadaÅŸ Listesi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getFriendsAction(): Promise<FriendEntry[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ followerId: userId }, { followingId: userId }],
    },
    include: {
      follower: {
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
      },
      following: {
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
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return friendships.map((f) => {
    const friend = f.followerId === userId ? f.following : f.follower;
    return {
      id: friend.id,
      friendshipId: f.id,
      name: friend.name,
      image: friend.image,
      xp: friend.xp,
      currentStreak: friend.routines[0]?.currentStreak ?? 0,
      subscriptionTier: friend.subscriptionTier,
    };
  });
}

// â”€â”€â”€ Bekleyen Takip Ä°stekleri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getPendingRequestsAction(): Promise<FriendRequest[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const pending = await prisma.friendship.findMany({
    where: { followingId: userId, status: "PENDING" },
    include: {
      follower: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pending.map((p) => ({
    id: p.id,
    user: p.follower,
    createdAt: p.createdAt.toISOString(),
  }));
}

// â”€â”€â”€ TakipÃ§ilerim (beni takip edenler) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getFollowersAction(): Promise<FriendEntry[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const friendships = await prisma.friendship.findMany({
    where: { followingId: userId, status: "ACCEPTED" },
    include: {
      follower: {
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
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return friendships.map((f) => ({
    id: f.follower.id,
    friendshipId: f.id,
    name: f.follower.name,
    image: f.follower.image,
    xp: f.follower.xp,
    currentStreak: f.follower.routines[0]?.currentStreak ?? 0,
    subscriptionTier: f.follower.subscriptionTier,
  }));
}

// â”€â”€â”€ Takip Ettiklerim â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getFollowingAction(): Promise<FriendEntry[]> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const friendships = await prisma.friendship.findMany({
    where: { followerId: userId, status: "ACCEPTED" },
    include: {
      following: {
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
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return friendships.map((f) => ({
    id: f.following.id,
    friendshipId: f.id,
    name: f.following.name,
    image: f.following.image,
    xp: f.following.xp,
    currentStreak: f.following.routines[0]?.currentStreak ?? 0,
    subscriptionTier: f.following.subscriptionTier,
  }));
}

// â”€â”€â”€ ArkadaÅŸ Leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getFriendsLeaderboardAction() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const friends = await getFriendsAction();
  const friendIds = friends.map((f) => f.id);

  // Kendini de dahil et
  const allIds = [userId, ...friendIds];

  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
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
    orderBy: { xp: "desc" },
  });

  return {
    topTen: users.slice(0, 10).map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      image: u.image,
      xp: u.xp,
      currentStreak: u.routines[0]?.currentStreak ?? 0,
      isCurrentUser: u.id === userId,
      subscriptionTier: u.subscriptionTier,
    })),
    currentUser: null,
    totalUsers: allIds.length,
  };
}

export async function sendStreakNudgeAction(friendId: string): Promise<{
  success: boolean;
  nudged: boolean;
  reason?: string;
}> {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const senderName = (session.user as any).name as string | null;

  if (friendId === userId) return { success: false, nudged: false, reason: "SELF_NUDGE" };

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { followerId: userId, followingId: friendId },
        { followerId: friendId, followingId: userId },
      ],
    },
    select: { id: true },
  });
  if (!friendship) return { success: false, nudged: false, reason: "NOT_FRIENDS" };

  const todayStart = startOfUtcDay();
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

  const friend = await prisma.user.findUnique({
    where: { id: friendId },
    select: {
      id: true,
      routines: {
        where: {
          isActive: true,
          currentStreak: { gte: 2 },
        },
        select: {
          id: true,
          title: true,
          currentStreak: true,
          lastCompletedAt: true,
          logs: {
            where: { completedAt: { gte: todayStart } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!friend) return { success: false, nudged: false, reason: "FRIEND_NOT_FOUND" };

  const atRiskRoutine = friend.routines.find((routine) => {
    if (routine.logs.length > 0) return false;
    if (!routine.lastCompletedAt) return false;
    return routine.lastCompletedAt >= yesterdayStart;
  });

  if (!atRiskRoutine) {
    return { success: true, nudged: false, reason: "NO_AT_RISK_STREAK" };
  }

  await sendPushToUserAction(friendId, {
    title: "Dürtme zamanı! 🔔",
    body: `${senderName ?? "Bir arkadaşın"} seni dürttü: "${atRiskRoutine.title}" serin kırılmadan tamamla.`,
    url: "/dashboard",
    tag: `streak-nudge-${userId}-${friendId}`,
  }).catch(() => {});

  return { success: true, nudged: true };
}

export async function getWeeklyLeagueLeaderboardAction(limit = 50): Promise<{
  weekKey: string;
  entries: WeeklyLeagueEntry[];
}> {
  const weekStart = getWeekStartUtc();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const weeklyLogs = await prisma.routineLog.groupBy({
    by: ["userId"],
    where: {
      completedAt: { gte: weekStart, lt: weekEnd },
    },
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    take: limit,
  });

  if (weeklyLogs.length === 0) return { weekKey: getWeekKey(), entries: [] };

  const users = await prisma.user.findMany({
    where: { id: { in: weeklyLogs.map((l) => l.userId) }, isPublic: true },
    select: { id: true, name: true, image: true, xp: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const entries: WeeklyLeagueEntry[] = weeklyLogs
    .map((log) => {
      const user = userMap.get(log.userId);
      if (!user) return null;
      return {
        userId: user.id,
        name: user.name,
        image: user.image,
        weeklyXp: log._count._all * 10,
        league: getUserLeague(user.xp).tier,
      };
    })
    .filter((entry): entry is WeeklyLeagueEntry => !!entry);

  return { weekKey: getWeekKey(), entries };
}

/**
 * Weekly reset cron mantığı:
 * Leaderboard puanı haftalık RoutineLog filtresi ile hesaplandığı için,
 * yeni haftada otomatik olarak "0"dan başlar (hard reset gerektirmez).
 * Bu fonksiyon cron endpoint'inden çağrılıp reset penceresini doğrular.
 */
export async function resetWeeklyLeagueRankingCronAction(input?: { force?: boolean }) {
  const now = new Date();
  const weekStart = getWeekStartUtc(now);
  const day = now.getUTCDay();
  const isMonday = day === 1;

  if (!input?.force && !isMonday) {
    return {
      ok: true,
      resetApplied: false,
      reason: "SKIPPED_NOT_MONDAY",
      weekKey: getWeekKey(now),
    };
  }

  const preview = await getWeeklyLeagueLeaderboardAction(10);

  return {
    ok: true,
    resetApplied: true,
    weekKey: getWeekKey(now),
    weekStart: weekStart.toISOString(),
    previewCount: preview.entries.length,
  };
}

export async function nudgeFriend(friendId: string): Promise<{
  success: boolean;
  nudged: boolean;
  reason?: string;
}> {
  return sendStreakNudgeAction(friendId);
}
