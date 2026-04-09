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
import { getUserAnalytics, type AnalyticsPayload } from "@/lib/analytics";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import type { DayStat } from "@/components/dashboard/WeeklyStatsChart";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Rutinlerim" };

// Türkçe gün kısaltmaları — Pazar = 0
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;

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

/** Varsayılan haftalık istatistik dizisi */
function defaultWeeklyStats(sevenDaysAgo: Date): DayStat[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(sevenDaysAgo.getUTCDate() + i);
    return { name: TR_DAYS[d.getUTCDay()] ?? "", count: 0 };
  });
}

export default async function DashboardPage() {
  /* ── Auth ──────────────────────────────────────────────────────────────── */
  let session;
  try {
    session = await requireAuth();
  } catch {
    // requireAuth zaten redirect eder, buraya düşmemeli ama garanti edelim
    return null;
  }

  const userId = (session.user as any)?.id as string | undefined;
  if (!userId) return <DashboardError message="Oturum bilgisi alınamadı." />;

  const subscriptionTier = getSubscriptionTier(
    (session.user as any)?.subscriptionTier
  );
  const isPro = subscriptionTier === "PRO";

  /* ── Data fetching — tamamı try-catch içinde ──────────────────────────── */
  let routines: RoutineWithMeta[] = [];
  let weeklyStats: DayStat[];
  let analytics: AnalyticsPayload;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  // Defaults
  weeklyStats = defaultWeeklyStats(sevenDaysAgo);
  analytics = emptyAnalytics();

  try {
    // Analytics'i de try-catch içinde çek
    const [analyticsResult, raw, recentLogs] = await Promise.all([
      getUserAnalytics(userId, 30).catch((err) => {
        console.error("[DashboardPage] getUserAnalytics hatası:", err);
        return emptyAnalytics();
      }),
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
        .catch((err) => {
          console.error("[DashboardPage] routine.findMany hatası:", err);
          return [];
        }),
      prisma.routineLog
        .findMany({
          where: { userId, completedAt: { gte: sevenDaysAgo } },
          select: { completedAt: true },
        })
        .catch((err) => {
          console.error("[DashboardPage] routineLog.findMany hatası:", err);
          return [];
        }),
    ]);

    analytics = analyticsResult;

    // Rutinleri JSON-serializable hale getir
    routines = (raw ?? []).map((r) => ({
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

    // Haftalık istatistikleri gün gün hesapla
    if (recentLogs.length > 0) {
      weeklyStats = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(sevenDaysAgo);
        dayStart.setUTCDate(sevenDaysAgo.getUTCDate() + i);

        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

        const count = recentLogs.filter(
          (l) => l.completedAt >= dayStart && l.completedAt < dayEnd
        ).length;

        return { name: TR_DAYS[dayStart.getUTCDay()] ?? "", count };
      });
    }
  } catch (error) {
    console.error("[DashboardPage] Beklenmeyen hata:", error);
    return <DashboardError message="Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin." />;
  }

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
            value={analytics.categoryDistribution?.length ?? 0}
            description="Veri üreten kategori sayısı"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WeeklyStatsChart data={weeklyStats} isPro={isPro} />
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
