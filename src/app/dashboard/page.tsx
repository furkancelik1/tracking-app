import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { RoutineList } from "@/components/dashboard/RoutineList";
import { WeeklyStatsChart } from "@/components/dashboard/WeeklyStatsChart";
import { StreakAlert } from "@/components/dashboard/StreakAlert";
import { PushNotificationButton } from "@/components/dashboard/PushNotificationButton";
import { TestEmailButton } from "@/components/dashboard/TestEmailButton";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import type { DayStat } from "@/components/dashboard/WeeklyStatsChart";

export const metadata = { title: "Rutinlerim" };

// Türkçe gün kısaltmaları — Pazar = 0
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const subscriptionTier = (session.user as any).subscriptionTier as "FREE" | "PRO";
  const isPro = subscriptionTier === "PRO";

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Heatmap için 30 gün, haftalık chart için 7 gün
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  // Paralel sorgular
  const [raw, recentLogs] = await Promise.all([
    // Aktif rutinler + son 30 günün logları (heatmap + isCompleted için)
    prisma.routine.findMany({
      where: { userId, isActive: true },
      include: {
        logs: {
          where: { completedAt: { gte: thirtyDaysAgo } },
          select: { id: true, completedAt: true, note: true },
          orderBy: { completedAt: "desc" },
          take: 30,
        },
        _count: { select: { logs: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),

    // Son 7 günün TÜM logları (haftalık grafik için — rutinlere göre gruplanmamış)
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: sevenDaysAgo } },
      select: { completedAt: true },
    }),
  ]);

  // Rutinleri JSON-serializable hale getir
  const routines: RoutineWithMeta[] = raw.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    frequency: r.frequency,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    category: r.category,
    color: r.color,
    icon: r.icon,
    currentStreak: r.currentStreak,
    longestStreak: r.longestStreak,
    lastCompletedAt: r.lastCompletedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    logs: r.logs.map((l) => ({
      id: l.id,
      completedAt: l.completedAt.toISOString(),
      note: l.note,
    })),
    _count: r._count,
  }));

  // Haftalık istatistikleri gün gün hesapla
  const weeklyStats: DayStat[] = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(sevenDaysAgo);
    dayStart.setUTCDate(sevenDaysAgo.getUTCDate() + i);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

    const count = recentLogs.filter(
      (l) => l.completedAt >= dayStart && l.completedAt < dayEnd
    ).length;

    return { name: TR_DAYS[dayStart.getUTCDay()], count };
  });

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <StreakAlert routines={routines} />
        <WeeklyStatsChart data={weeklyStats} isPro={isPro} />
        <PushNotificationButton />
        <TestEmailButton />
        <RoutineList initialRoutines={routines} />
      </main>
    </>
  );
}
