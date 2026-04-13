"use client";

import dynamic from "next/dynamic";

// ── ssr:false — "use client" wrapper zorunlu, Server Component'te ssr:false yasak ──

const DailyDisciplineGauge = dynamic(
  () =>
    import("@/components/dashboard/DailyDisciplineGauge").then(
      (m) => m.DailyDisciplineGauge
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-[240px] h-[240px] rounded-full border border-zinc-800/50 bg-card animate-pulse" />
    ),
  }
);

type Props = {
  gaugeData: { score: number; completed: number; total: number };
};

export function DashboardCharts({ gaugeData }: Props) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[280px]">
        <DailyDisciplineGauge
          score={gaugeData.score}
          completed={gaugeData.completed}
          total={gaugeData.total}
        />
      </div>
    </div>
  );
}
