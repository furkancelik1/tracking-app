import { requireAuth } from "@/lib/auth";
import { getUserAnalytics } from "@/lib/analytics";
import { StatsRangeTabs } from "@/components/dashboard/StatsRangeTabs";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { YearlyActivityHeatmap } from "@/components/dashboard/YearlyActivityHeatmap";
import { ActivityAreaChart } from "@/components/dashboard/ActivityAreaChart";
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

export const metadata = {
  title: "İstatistiklerim",
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const params = await searchParams;
  const rangeParam = (params.range || "30d") as "7d" | "30d" | "all";
  const days = rangeParam === "7d" ? 7 : rangeParam === "30d" ? 30 : 365;

  const analytics = await getUserAnalytics(userId, days);

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
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">İstatistiklerim</h1>
        <p className="text-muted-foreground">
          Alışkanlık verilerini analiz et ve ilerlemeni görselleştir.
        </p>
      </div>

      {/* ── Summary Cards (4 kart) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam Tamamlama"
          value={analytics.summary.totalCompletions.toLocaleString("tr-TR")}
          subtitle={`Son ${days} gün`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatsCard
          title="Mevcut Seri"
          value={`${analytics.summary.currentStreak} gün`}
          subtitle={`En uzun: ${analytics.summary.longestStreak} gün`}
          icon={<Flame className="h-4 w-4" />}
        />
        <StatsCard
          title="Aylık Başarı Oranı"
          value={`%${analytics.summary.monthlySuccessRate}`}
          subtitle="Son 30 günde aktif gün oranı"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          title="Aktif Rutinler"
          value={analytics.summary.activeRoutines.toString()}
          subtitle={`Ort. ${analytics.summary.averagePerDay}/gün`}
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
              Tamamlanma Oranı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              %{analytics.summary.completionRate}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Son {days} günde en az 1 tamamlama yapılan gün oranı
            </p>
          </CardContent>
        </Card>

        {/* Zirve Gün */}
        <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <CalendarDays className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zirve Günü
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analytics.summary.peakDay.day}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.summary.peakDay.count} tamamlama ile en aktif gün
            </p>
          </CardContent>
        </Card>

        {/* Günlük Ortalama */}
        <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Günlük Ortalama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {analytics.summary.averagePerDay}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Günde ortalama tamamlanan rutin sayısı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Heatmap (tam genişlik) ────────────────────────────────────────── */}
      <YearlyActivityHeatmap data={yearlyData} />
    </div>
  );
}
