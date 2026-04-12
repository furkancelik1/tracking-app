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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { DisciplineTrendData } from "@/actions/stats.actions";

type Props = {
  data: DisciplineTrendData;
};

export function DisciplineTrendChart({ data }: Props) {
  const t = useTranslations("disciplineTrend");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { points, avgScore, trend, streakDays, biggestDrop, biggestSurge } = data;

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-zinc-400";

  const trendLabel =
    trend === "up"
      ? t("trendUp")
      : trend === "down"
        ? t("trendDown")
        : t("trendStable");

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <CardDescription className="mt-0.5">
              {t("subtitle")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Ortalama skor */}
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                %{avgScore}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("avg")}</p>
            </div>
            {/* Streak */}
            {streakDays > 0 && (
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-amber-400">
                  {streakDays}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("streakDays")}
                </p>
              </div>
            )}
            {/* Trend badge */}
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-[11px] px-2 py-0.5 border-zinc-700",
                trendColor
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trendLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="h-[200px] min-h-0 w-full">
          {!mounted ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="disciplineTrendGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#7c3aed" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#5b21b6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={40}
                />

                <Tooltip
                  cursor={{
                    stroke: "rgba(167,139,250,0.3)",
                    strokeWidth: 1,
                  }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 4px 16px rgba(0,0,0,.25)",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                  formatter={(value: number) => [`${value}%`, t("score")]}
                />

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill="url(#disciplineTrendGradient)"
                  dot={{
                    r: 4,
                    fill: "#7c3aed",
                    stroke: "#4c1d95",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#a78bfa",
                    stroke: "#4c1d95",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Highlight pills */}
        {(biggestDrop || biggestSurge) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {biggestSurge && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 text-[11px]"
              >
                🚀 {biggestSurge.from} → {biggestSurge.to} +{biggestSurge.delta}%
              </Badge>
            )}
            {biggestDrop && (
              <Badge
                variant="outline"
                className="border-red-500/30 text-red-400 bg-red-500/5 text-[11px]"
              >
                ⚠️ {biggestDrop.from} → {biggestDrop.to} {biggestDrop.delta}%
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
