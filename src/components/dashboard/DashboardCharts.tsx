"use client";

import dynamic from "next/dynamic";
import type { DisciplineTrendData } from "@/actions/stats.actions";

// ── ssr:false — "use client" wrapper zorunlu, Server Component'te ssr:false yasak ──

const DailyDisciplineGauge = dynamic(
  () =>
    import("@/components/dashboard/DailyDisciplineGauge").then(
      (m) => m.DailyDisciplineGauge
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[200px] rounded-xl border border-zinc-800/50 bg-card animate-pulse" />
    ),
  }
);

const DisciplineTrendChart = dynamic(
  () =>
    import("@/components/dashboard/DisciplineTrendChart").then(
      (m) => m.DisciplineTrendChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[300px] rounded-xl border border-zinc-800/50 bg-card animate-pulse" />
    ),
  }
);

type Props = {
  gaugeData: { score: number; completed: number; total: number };
  disciplineTrend: DisciplineTrendData | null;
  chartAnalysis?: string | null;
};

export function DashboardCharts({ gaugeData, disciplineTrend, chartAnalysis }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Hız Göstergesi — mobilde ortala, masaüstünde 1/3 */}
      <div className="md:col-span-1 flex justify-center">
        <div className="w-full max-w-[260px] md:max-w-none min-h-[200px]">
          <DailyDisciplineGauge
            score={gaugeData.score}
            completed={gaugeData.completed}
            total={gaugeData.total}
          />
        </div>
      </div>

      {/* Haftalık Trend Grafiği — 2/3 */}
      <div className="md:col-span-2 w-full min-h-[300px]">
        {disciplineTrend ? (
          <DisciplineTrendChart
            data={disciplineTrend}
            chartAnalysis={chartAnalysis}
          />
        ) : (
          <div className="w-full min-h-[300px] rounded-xl border border-zinc-800/50 bg-card/50 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Henüz veri yok</span>
          </div>
        )}
      </div>
    </div>
  );
}
