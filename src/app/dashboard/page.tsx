import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { RoutineList } from "@/components/dashboard/RoutineList";
import { WeeklyStatsChart } from "@/components/dashboard/WeeklyStatsChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StreakAlert } from "@/components/dashboard/StreakAlert";
import { PushNotificationButton } from "@/components/dashboard/PushNotificationButton";
import { TestEmailButton } from "@/components/dashboard/TestEmailButton";
import { getSubscriptionTier } from "@/lib/stripe";
import { getUserAnalytics } from "@/lib/analytics";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import type { DayStat } from "@/components/dashboard/WeeklyStatsChart";

export const metadata = { title: "Rutinlerim" };

// Türkçe gün kısaltmaları — Pazar = 0
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;
  const subscriptionTier = getSubscriptionTier(
    (session.user as any).subscriptionTier
  );
  const isPro = subscriptionTier === "PRO";

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Heatmap için 30 gün, haftalık chart için 7 gün
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  // Paralel sorgular
  const [raw, recentLogs, analytics] = await Promise.all([
    // Aktif rutinler + son 30 günün logları
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

    // Son 7 günün tüm logları (haftalık grafik için)
    prisma.routineLog.findMany({
      where: { userId, completedAt: { gte: sevenDaysAgo } },
      select: { completedAt: true },
    }),
    getUserAnalytics(userId, 30),
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

    return { name: TR_DAYS[dayStart.getUTCDay()] ?? "", count };
  });

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <StreakAlert routines={routines} />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Toplam Tamamlama"
            value={analytics.summary.totalCompletions}
            description="Son 30 gün"
          />
          <StatsCard
            title="En Uzun Seri"
            value={analytics.summary.longestStreak}
            description="Tüm aktif rutinler"
          />
          <StatsCard
            title="Aktif Kategori"
            value={analytics.categoryDistribution.length}
            description="Veri üreten kategori sayısı"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WeeklyStatsChart data={weeklyStats} isPro={isPro} />
          </div>
          <div className="lg:col-span-1">
            <CategoryPieChart data={analytics.categoryDistribution} />
          </div>
        </section>

        <PushNotificationButton />
        <TestEmailButton />
        <RoutineList initialRoutines={routines} />
      </main>
    </>
  );
}
