"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string | null;
  image: string | null;
  xp: number;
  currentStreak: number;
  isCurrentUser: boolean;
  subscriptionTier: string;
};

export type LeaderboardPayload = {
  topTen: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalUsers: number;
};

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<LeaderboardPayload> {
  const session = await getSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  // Top 10 — sadece public profiller
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

  const topTen: LeaderboardEntry[] = topUsers.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.name,
    image: u.image,
    xp: u.xp,
    currentStreak: u.routines[0]?.currentStreak ?? 0,
    isCurrentUser: u.id === currentUserId,
    subscriptionTier: u.subscriptionTier,
  }));

  // Kullanıcının kendi sıralaması
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
        // Rank hesapla: kaç kullanıcının XP'si daha yüksek?
        const usersAbove = await prisma.user.count({
          where: {
            isPublic: true,
            xp: { gt: user.xp },
          },
        });

        currentUser = {
          rank: usersAbove + 1,
          id: user.id,
          name: user.name,
          image: user.image,
          xp: user.xp,
          currentStreak: user.routines[0]?.currentStreak ?? 0,
          isCurrentUser: true,
          subscriptionTier: user.subscriptionTier,
        };
      }
    }
  }

  return { topTen, currentUser, totalUsers };
}
