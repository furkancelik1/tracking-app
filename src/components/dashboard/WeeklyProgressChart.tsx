"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyChartPoint } from "@/actions/dashboard.actions";

type Props = {
  data: WeeklyChartPoint[];
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function WeeklyProgressChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => setMounted(true), []);

  const safeData = data ?? [];
  const total = safeData.reduce((s, d) => s + (d.completed ?? 0), 0);
  const bestDay = safeData.reduce(
    (best, d) => ((d.completed ?? 0) > best.completed ? d : best),
    safeData[0] ?? { name: "", completed: 0 }
  );
  const avg = safeData.length > 0 ? (total / safeData.length).toFixed(1) : "0";

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">HaftalÄ±k Ä°lerleme</CardTitle>
            <CardDescription className="mt-0.5">
              Son 7 gÃ¼nde tamamlanan rutinler
            </CardDescription>
          </div>
          <div className="flex gap-5 text-right shrink-0">
            <div>
              <p className="text-lg font-semibold tabular-nums">{total}</p>
              <p className="text-[11px] text-muted-foreground">Toplam</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{avg}</p>
              <p className="text-[11px] text-muted-foreground">Ort/gÃ¼n</p>
            </div>
            {bestDay.completed > 0 && (
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {bestDay.completed}
                </p>
                <p className="text-[11px] text-muted-foreground">Zirve</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        <div style={{ height: "300px", minHeight: "300px", width: "100%", touchAction: "manipulation" }}>
          {!mounted ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <AreaChart
                data={safeData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="weeklyProgressGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(val: string) => isMobile ? val.charAt(0) : val}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  width={32}
                />

                <Tooltip
                  cursor={{ stroke: "rgba(129,140,248,0.3)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 4px 16px rgba(0,0,0,.2)",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                  formatter={(value) => [Number(value ?? 0), "Tamamlanan"]}
                />

                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fill="url(#weeklyProgressGradient)"
                  dot={{
                    r: 4,
                    fill: "#6366f1",
                    stroke: "#312e81",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#818cf8",
                    stroke: "#312e81",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
