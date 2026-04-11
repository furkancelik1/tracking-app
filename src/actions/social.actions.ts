"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendPushToUserAction } from "@/actions/push.actions";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Kullanıcı Arama ────────────────────────────────────────────────────────

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

  // Mevcut friendship durumlarını kontrol et
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

// ─── Takip Et ────────────────────────────────────────────────────────────────

export async function followUserAction(targetId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  if (userId === targetId) throw new Error("Cannot follow yourself");

  // Duplikat kontrolü
  const existing = await prisma.friendship.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
  });
  if (existing) return { status: existing.status };

  const friendship = await prisma.friendship.create({
    data: { followerId: userId, followingId: targetId },
    include: { follower: { select: { name: true } } },
  });

  // Push bildirim gönder
  await sendPushToUserAction(targetId, {
    title: "Yeni Takipçi! 👥",
    body: `${friendship.follower.name ?? "Birisi"} seni takip etmek istiyor.`,
    url: "/leaderboard",
    tag: `follow-${userId}`,
  }).catch(() => {});

  return { status: friendship.status };
}

// ─── Takip İsteği Onayla ─────────────────────────────────────────────────────

export async function acceptFollowAction(friendshipId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const friendship = await prisma.friendship.update({
    where: { id: friendshipId, followingId: userId, status: "PENDING" },
    data: { status: "ACCEPTED" },
    include: { following: { select: { name: true } } },
  });

  // Karşıdakine bildirim
  await sendPushToUserAction(friendship.followerId, {
    title: "Takip Onaylandı! ✅",
    body: `${friendship.following.name ?? "Kullanıcı"} takip isteğini kabul etti.`,
    url: "/leaderboard",
    tag: `accept-${userId}`,
  }).catch(() => {});

  return { success: true };
}

// ─── Takip İsteği Reddet ────────────────────────────────────────────────────

export async function rejectFollowAction(friendshipId: string) {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  await prisma.friendship.delete({
    where: { id: friendshipId, followingId: userId, status: "PENDING" },
  });

  return { success: true };
}

// ─── Takibi Bırak ───────────────────────────────────────────────────────────

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

// ─── Arkadaş Listesi ─────────────────────────────────────────────────────────

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

// ─── Bekleyen Takip İstekleri ────────────────────────────────────────────────

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

// ─── Takipçilerim (beni takip edenler) ───────────────────────────────────────

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

// ─── Takip Ettiklerim ────────────────────────────────────────────────────────

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

// ─── Arkadaş Leaderboard ────────────────────────────────────────────────────

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
