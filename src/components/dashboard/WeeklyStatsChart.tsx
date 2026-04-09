"use client";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DayStat = { name: string; count: number };

type Props = {
  data: DayStat[];
  isPro: boolean;
};

export function WeeklyStatsChart({ data, isPro }: Props) {
  const totalThisWeek = data.reduce((sum, d) => sum + d.count, 0);
  const bestDay = data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    data[0] ?? { name: "", count: 0 }
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Haftalık İstatistikler</CardTitle>
            <CardDescription className="mt-0.5">
              Son 7 günde tamamlanan rutinler
            </CardDescription>
          </div>

          {/* Özet sayılar — sadece PRO */}
          {isPro && totalThisWeek > 0 && (
            <div className="flex gap-5 text-right shrink-0">
              <div>
                <p className="text-lg font-semibold tabular-nums">{totalThisWeek}</p>
                <p className="text-xs text-muted-foreground">Bu hafta</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums">{bestDay.count}</p>
                <p className="text-xs text-muted-foreground">En iyi gün</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-6 relative">
        {/* Grafik — FREE'de blur */}
        <div
          className={cn(
            "transition-[filter]",
            !isPro && "blur-sm select-none pointer-events-none"
          )}
        >
          <div className="h-[200px] min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="routineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.25}
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
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={32}
              />

              <Tooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                  boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                formatter={(value) => [value ?? 0, "Tamamlanan rutin"]}
              />

              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#routineGradient)"
                dot={{
                  r: 3,
                  fill: "hsl(var(--primary))",
                  strokeWidth: 0,
                }}
                activeDot={{
                  r: 5,
                  fill: "hsl(var(--primary))",
                  strokeWidth: 0,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* FREE paywall overlay */}
        {!isPro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="rounded-xl border bg-card/90 backdrop-blur-sm px-6 py-4 text-center shadow-sm space-y-3">
              <p className="text-sm font-medium">
                Gelişmiş istatistikler PRO&apos;ya özeldir
              </p>
              <Button size="sm" asChild>
                <a href="/settings">PRO&apos;ya Geç</a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
