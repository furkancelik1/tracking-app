import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { RoutineList } from "@/components/dashboard/RoutineList";
import { WeeklyProgressChart } from "@/components/dashboard/WeeklyProgressChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StreakAlert } from "@/components/dashboard/StreakAlert";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { PushNotificationButton } from "@/components/dashboard/PushNotificationButton";
import { TestEmailButton } from "@/components/dashboard/TestEmailButton";
import { getSubscriptionTier } from "@/lib/stripe";
import { getDashboardData } from "@/actions/dashboard.actions";
import { getUserAnalytics, type AnalyticsPayload } from "@/lib/analytics";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import {
  CheckCircle2,
  Flame,
  TrendingUp,
  Target,
  AlertTriangle,
} from "lucide-react";

export const metadata = { title: "Rutinlerim" };

/** Sıfır veri için fallback analytics */
function emptyAnalytics(): AnalyticsPayload {
  return {
    rangeDays: 30,
    dailyCompletions: [],
    categoryDistribution: [],
    summary: {
      totalCompletions: 0,
      longestStreak: 0,
      currentStreak: 0,
      completionRate: 0,
      monthlySuccessRate: 0,
      activeRoutines: 0,
      peakDay: { day: "Pazartesi", dayIndex: 1, count: 0 },
      averagePerDay: 0,
    },
  };
}

export default async function DashboardPage() {
  /* ── Auth ──────────────────────────────────────────────────────────────── */
  let session;
  try {
    session = await requireAuth();
  } catch {
    return null;
  }

  const userId = (session.user as any)?.id as string | undefined;
  if (!userId) return <DashboardError message="Oturum bilgisi alınamadı." />;

  const subscriptionTier = getSubscriptionTier(
    (session.user as any)?.subscriptionTier
  );
  const isPro = subscriptionTier === "PRO";

  /* ── Data fetching ────────────────────────────────────────────────────── */
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const [dashboardData, analytics, raw] = await Promise.all([
      getDashboardData(),
      getUserAnalytics(userId, 30).catch(() => emptyAnalytics()),
      prisma.routine
        .findMany({
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
        })
        .catch(() => []),
    ]);

    const routines: RoutineWithMeta[] = (raw ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? "",
      description: r.description ?? null,
      frequency: r.frequency ?? "DAILY",
      isActive: r.isActive ?? true,
      sortOrder: r.sortOrder ?? 0,
      category: r.category ?? "Genel",
      color: r.color ?? "#3b82f6",
      icon: r.icon ?? "Check",
      currentStreak: r.currentStreak ?? 0,
      longestStreak: r.longestStreak ?? 0,
      lastCompletedAt: r.lastCompletedAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
      logs: (r.logs ?? []).map((l) => ({
        id: l.id,
        completedAt: l.completedAt?.toISOString() ?? new Date().toISOString(),
        note: l.note ?? null,
      })),
      _count: r._count ?? { logs: 0 },
    }));

    const { stats, weeklyChart, isEmpty } = dashboardData;

    // ── Empty state ─────────────────────────────────────────────────────
    if (isEmpty) {
      return (
        <>
          <DashboardNav />
          <main className="mx-auto max-w-6xl px-6 py-8">
            <DashboardEmptyState />
          </main>
        </>
      );
    }

    return (
      <>
        <DashboardNav />
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          <StreakAlert routines={routines} />

          {/* ── 4 Stat Cards ─────────────────────────────────────────── */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Bugünün İlerlemesi"
              value={`${stats.todayProgress.completed}/${stats.todayProgress.total}`}
              subtitle={`%${stats.todayProgress.percentage} tamamlandı`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              trend={stats.trends.todayVsYesterday}
            />
            <StatsCard
              title="Aktif Seri"
              value={`${stats.activeStreak} gün`}
              subtitle="Aralıksız tamamlama"
              icon={<Flame className="h-4 w-4" />}
            />
            <StatsCard
              title="Haftalık Verimlilik"
              value={`%${stats.weeklyProductivity}`}
              subtitle="Son 7 gün performansı"
              icon={<TrendingUp className="h-4 w-4" />}
              trend={stats.trends.thisWeekVsLastWeek}
            />
            <StatsCard
              title="Bu Hafta Toplam"
              value={stats.totalCompletions}
              subtitle="Tamamlanan rutin"
              icon={<Target className="h-4 w-4" />}
              trend={stats.trends.thisWeekVsLastWeek}
            />
          </section>

          {/* ── Charts ───────────────────────────────────────────────── */}
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WeeklyProgressChart data={weeklyChart} />
            </div>
            <div className="lg:col-span-1">
              <CategoryPieChart data={analytics.categoryDistribution ?? []} />
            </div>
          </section>

          <PushNotificationButton />
          <TestEmailButton />
          <RoutineList initialRoutines={routines} />
        </main>
      </>
    );
  } catch (error) {
    console.error("[DashboardPage] Beklenmeyen hata:", error);
    return (
      <DashboardError message="Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." />
    );
  }
}

/* ── Error State bileşeni ─────────────────────────────────────────────────── */

function DashboardError({ message }: { message: string }) {
  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Bir şeyler ters gitti</h2>
          <p className="text-muted-foreground max-w-md">{message}</p>
          <a
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Tekrar Dene
          </a>
        </div>
      </main>
    </>
  );
}
