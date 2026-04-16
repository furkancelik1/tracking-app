import { requireAuth } from "@/lib/auth";
import { getUserAnalytics, getAdvancedAnalytics } from "@/lib/analytics";
import { StatsRangeTabs } from "@/components/dashboard/StatsRangeTabs";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { YearlyActivityHeatmap } from "@/components/dashboard/YearlyActivityHeatmap";
import {
  ActivityAreaChart,
  CategoryPieChart,
  ConsistencyRadarChart,
} from "@/components/dashboard/StatsChartsLazy";
import { StatsShareButton } from "@/components/dashboard/StatsShareButton";
import { RoutineSuccessList } from "@/components/dashboard/RoutineSuccessList";
import { InsightCards } from "@/components/dashboard/InsightCards";
import { prisma } from "@/lib/prisma";
import {
  CheckCircle2,
  Flame,
  TrendingUp,
  Activity,
  CalendarDays,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stats.metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stats");
  const session = await requireAuth();
  const userId = session.user.id as string;

  const searchParamsResolved = await searchParams;
  const rangeParam = (searchParamsResolved.range || "30d") as "7d" | "30d" | "all";
  const days = rangeParam === "7d" ? 7 : rangeParam === "30d" ? 30 : 365;

  const analytics = await getUserAnalytics(userId, days);
  const advanced = await getAdvancedAnalytics(userId, days);

  // Kullanıcı XP + ad bilgisi (share card için)
  const userInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, name: true, image: true },
  });

  // Yıllık heatmap verisi (her zaman 365 gün)
  const yearlyAnalytics =
    days === 365 ? analytics : await getUserAnalytics(userId, 365);

  const yearlyData = yearlyAnalytics.dailyCompletions.map((d) => ({
    date: d.date,
    count: d.count,
  }));

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <StatsShareButton
          cardProps={{
            variant: "weekly-summary",
            userName: userInfo?.name ?? null,
            userImage: userInfo?.image ?? null,
            xp: userInfo?.xp ?? 0,
            weeklyRate: analytics.summary.monthlySuccessRate,
            currentStreak: analytics.summary.currentStreak,
            totalCompletions: analytics.summary.totalCompletions,
          }}
        />
      </div>

      {/* ── Summary Cards (4 kart) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t("totalCompletions")}
          value={analytics.summary.totalCompletions.toLocaleString()}
          subtitle={t("lastDays", { days })}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatsCard
          title={t("currentStreak")}
          value={t("days", { count: analytics.summary.currentStreak })}
          subtitle={t("longestStreak", { count: analytics.summary.longestStreak })}
          icon={<Flame className="h-4 w-4" />}
        />
        <StatsCard
          title={t("monthlySuccess")}
          value={`%${analytics.summary.monthlySuccessRate}`}
          subtitle={t("monthlySuccessSubtitle")}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          title={t("activeRoutines")}
          value={analytics.summary.activeRoutines.toString()}
          subtitle={t("avgPerDay", { count: analytics.summary.averagePerDay })}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* ── Range Tabs ────────────────────────────────────────────────────── */}
      <StatsRangeTabs value={rangeParam} />

      {/* ── Charts Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Trend chart — geniş alan */}
        <div className="lg:col-span-3">
          <ActivityAreaChart
            data={analytics.dailyCompletions}
            rangeDays={days}
          />
        </div>

        {/* Kategori pie — dar alan */}
        <div className="lg:col-span-2">
          <CategoryPieChart
            data={analytics.categoryDistribution}
            rangeDays={days}
          />
        </div>
      </div>

      {/* ── Insight Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tamamlanma Oranı */}
        <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("completionRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              %{analytics.summary.completionRate}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("completionRateSubtitle", { days })}
            </p>
          </CardContent>
        </Card>

        {/* Zirve Gün */}
        <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <CalendarDays className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("peakDay")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analytics.summary.peakDay.day}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("peakDaySubtitle", { count: analytics.summary.peakDay.count })}
            </p>
          </CardContent>
        </Card>

        {/* Günlük Ortalama */}
        <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dailyAverage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {analytics.summary.averagePerDay}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dailyAverageSubtitle")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Heatmap (tam genişlik) ────────────────────────────────────────── */}
      <YearlyActivityHeatmap data={yearlyData} />

      {/* ── Advanced Analytics ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Radar chart — weekday consistency */}
        <div className="lg:col-span-2">
          <ConsistencyRadarChart data={advanced.weekdayPerformance} />
        </div>

        {/* Routine success list */}
        <div className="lg:col-span-3">
          <RoutineSuccessList data={advanced.routineSuccessRates} />
        </div>
      </div>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      <InsightCards
        insights={advanced.insights}
        monthlyComparison={advanced.monthlyComparison}
      />
    </div>
  );
}
