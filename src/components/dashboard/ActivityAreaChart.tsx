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

export type DailyPoint = {
  date: string;
  count: number;
  label: string;
};

type Props = {
  data: DailyPoint[];
  rangeDays: number;
};

export function ActivityAreaChart({ data, rangeDays }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const safeData = data ?? [];
  const total = safeData.reduce((s, d) => s + (d.count ?? 0), 0);
  const avg = safeData.length > 0 ? (total / safeData.length).toFixed(1) : "0";
  const best = safeData.reduce(
    (b, d) => ((d.count ?? 0) > b.count ? d : b),
    safeData[0] ?? { label: "-", count: 0 }
  );

  // AralÄ±k bÃ¼yÃ¼kse her N noktada bir etiket gÃ¶ster
  const tickInterval =
    rangeDays <= 7 ? 0 : rangeDays <= 30 ? 3 : rangeDays <= 90 ? 6 : 14;

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Aktivite Trendi</CardTitle>
            <CardDescription className="mt-0.5">
              Son {rangeDays} gÃ¼nlÃ¼k tamamlama grafiÄŸi
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
            {best.count > 0 && (
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {best.count}
                </p>
                <p className="text-[11px] text-muted-foreground">Zirve</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-[300px] w-full min-h-[300px]" style={{ minHeight: "300px", width: "100%", touchAction: "manipulation" }}>
          {!mounted ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
            <AreaChart
              data={safeData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
            <defs>
              <linearGradient id="actGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(val: string) => isMobile && rangeDays <= 7 ? val.charAt(0) : val}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              width={28}
            />

            <Tooltip
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,.15)",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 2 }}
              formatter={(value) => [value ?? 0, "Tamamlanan"]}
            />

            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#actGradient)"
              dot={
                rangeDays <= 14
                  ? { r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }
                  : false
              }
              activeDot={{
                r: 5,
                fill: "hsl(var(--primary))",
                strokeWidth: 0,
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
