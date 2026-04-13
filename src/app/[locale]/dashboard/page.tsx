import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { RoutineList } from "@/components/dashboard/RoutineList";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StreakAlert } from "@/components/dashboard/StreakAlert";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { PushNotificationButton } from "@/components/dashboard/PushNotificationButton";
import { TestEmailButton } from "@/components/dashboard/TestEmailButton";
import { WeeklyInsightCard } from "@/components/dashboard/WeeklyInsightCard";
import { AICoachBriefing } from "@/components/dashboard/AICoachBriefing";
import { ChallengeTracker } from "@/components/dashboard/ChallengeTracker";
import { ChallengeLeaderboard } from "@/components/dashboard/ChallengeLeaderboard";
import { getSubscriptionTier } from "@/lib/stripe";
import { getDashboardData } from "@/actions/dashboard.actions";
import { getYearlyActivityData } from "@/actions/dashboard.actions";
import { getWeeklyInsightAction } from "@/actions/ai.actions";
import { getDisciplineTrend, getTodayDisciplineScoreAction } from "@/actions/stats.actions";
import { getChallengeLeaderboard } from "@/actions/challenge.actions";
import { getUserAnalytics, type AnalyticsPayload } from "@/lib/analytics";
import { LevelProgressBar } from "@/components/dashboard/LevelProgressBar";
import { BottomNav } from "@/components/shared/BottomNav";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CheckCircle2,
  Flame,
  TrendingUp,
  Target,
  AlertTriangle,
} from "lucide-react";

/* ── Dynamic imports for heavy chart components (recharts code-splitting) ── */
const WeeklyProgressChart = dynamic(
  () => import("@/components/dashboard/WeeklyProgressChart").then((m) => m.WeeklyProgressChart),
  {
    loading: () => (
      <div className="h-[350px] rounded-xl border bg-card animate-pulse" />
    ),
  }
);

const CategoryPieChart = dynamic(
  () => import("@/components/dashboard/CategoryPieChart").then((m) => m.CategoryPieChart),
  {
    loading: () => (
      <div className="h-[350px] rounded-xl border bg-card animate-pulse" />
    ),
  }
);

const YearlyActivityHeatmap = dynamic(
  () => import("@/components/dashboard/YearlyActivityHeatmap").then((m) => m.YearlyActivityHeatmap),
  {
    loading: () => (
      <div className="h-[180px] rounded-xl border bg-card animate-pulse" />
    ),
  }
);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.metadata" });
  return { title: t("title"), description: t("description") };
}

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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");

  /* ── Auth ── */
  let session;
  try {
    session = await requireAuth();
  } catch {
    return null;
  }

  const userId = (session.user as any)?.id as string | undefined;
  if (!userId) return <DashboardError title={t("errorTitle")} message={t("sessionError")} retry={tc("retry")} />;

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

    const [dashboardData, analytics, raw, userXpData, yearlyData, gaugeData] = await Promise.all([
      getDashboardData().catch(() => ({
        stats: {
          todayProgress: { completed: 0, total: 0, percentage: 0 },
          activeStreak: 0,
          weeklyProductivity: 0,
          totalCompletions: 0,
          trends: { todayVsYesterday: 0, thisWeekVsLastWeek: 0, streakChange: 0 },
        },
        weeklyChart: [],
        isEmpty: true,
      } as import("@/actions/dashboard.actions").DashboardPayload)),
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
      prisma.user
        .findUnique({ where: { id: userId }, select: { xp: true } })
        .catch(() => null),
      getYearlyActivityData().catch(() => []),
      getTodayDisciplineScoreAction().catch(() => ({ completed: 0, total: 0, score: 0 })),
    ]);

    // AI insight (PRO kullanıcılar için — hata yutulur)
    const weeklyInsight = isPro
      ? await getWeeklyInsightAction({ locale }).catch(() => null)
      : null;

    // Discipline trend (chart verisi — hata yutulur)
    const disciplineTrend = await getDisciplineTrend(locale).catch(() => null);

    // Challenge Leaderboard (1 saatlik cache — hata yutulur)
    const challengeLeaderboard = await getChallengeLeaderboard().catch(() => ({
      entries: [],
      currentUser: null,
      weekKey: "",
    }));

    const userXp = userXpData?.xp ?? 0;

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
        <main className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-8">
          {/* ── Gauge + Trend Chart (Client Wrapper — ssr:false) ── */}
          <DashboardCharts
            gaugeData={gaugeData}
            disciplineTrend={disciplineTrend}
            chartAnalysis={weeklyInsight?.chartAnalysis}
          />

          {/* ── Level + AI Briefing ── */}
          <div className="space-y-4">
            <LevelProgressBar xp={userXp} />
            <AICoachBriefing xp={userXp} initialInsight={weeklyInsight} isPro={isPro} />
          </div>

          <StreakAlert routines={routines} />

          {/* ── 4 Stat Cards ─────────────────────────────────────────── */}
          <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t("stats.todayProgress")}
              value={`${stats.todayProgress.completed}/${stats.todayProgress.total}`}
              subtitle={t("stats.completedPct", { percentage: stats.todayProgress.percentage })}
              icon={<CheckCircle2 className="h-4 w-4" />}
              trend={stats.trends.todayVsYesterday}
            />
            <StatsCard
              title={t("stats.activeStreak")}
              value={t("stats.days", { count: stats.activeStreak })}
              subtitle={t("stats.streakSubtitle")}
              icon={<Flame className="h-4 w-4" />}
            />
            <StatsCard
              title={t("stats.weeklyEfficiency")}
              value={`%${stats.weeklyProductivity}`}
              subtitle={t("stats.weeklySubtitle")}
              icon={<TrendingUp className="h-4 w-4" />}
              trend={stats.trends.thisWeekVsLastWeek}
            />
            <StatsCard
              title={t("stats.weeklyTotal")}
              value={stats.totalCompletions}
              subtitle={t("stats.weeklyTotalSubtitle")}
              icon={<Target className="h-4 w-4" />}
              trend={stats.trends.thisWeekVsLastWeek}
            />
          </section>

          {/* ── Challenge Tracker ────────────────────────────────── */}
          <ChallengeTracker initialData={weeklyInsight} isPro={isPro} />

          {/* ── Challenge Leaderboard ───────────────────────────── */}
          <ChallengeLeaderboard data={challengeLeaderboard} />

          {/* ── Charts (mobile: stacked, desktop: 2/3 + 1/3) ──────── */}
          <Suspense
            fallback={
              <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-2 h-[250px] md:h-[350px] rounded-xl border bg-card animate-pulse" />
                <div className="md:col-span-1 h-[280px] md:h-[350px] rounded-xl border bg-card animate-pulse" />
              </section>
            }
          >
            <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2">
                <WeeklyProgressChart data={weeklyChart} />
              </div>
              <div className="md:col-span-1">
                <CategoryPieChart data={analytics.categoryDistribution ?? []} />
              </div>
            </section>
          </Suspense>

          {/* ── AI Weekly Insight ─────────────────────────────────── */}
          <WeeklyInsightCard initialData={weeklyInsight} isPro={isPro} />

          <PushNotificationButton />
          <TestEmailButton />
          <RoutineList initialRoutines={routines} />

          {/* ── Yearly Activity Heatmap ──────────────────────────────── */}
          <Suspense
            fallback={
              <div className="h-[180px] rounded-xl border bg-card animate-pulse" />
            }
          >
            <YearlyActivityHeatmap data={yearlyData} />
          </Suspense>
        </main>
        <BottomNav />
      </>
    );
  } catch (error) {
    console.error("[DashboardPage] Beklenmeyen hata:", error);
    return (
      <DashboardError
        title={t("errorTitle")}
        message={t("errorMessage")}
        retry={tc("retry")}
      />
    );
  }
}

/* ── Error State bileşeni ─────────────────────────────────────────────────── */

function DashboardError({ title, message, retry }: { title?: string; message: string; retry?: string }) {
  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">{title ?? "Error"}</h2>
          <p className="text-muted-foreground max-w-md">{message}</p>
          <a
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {retry ?? "Retry"}
          </a>
        </div>
      </main>
    </>
  );
}
