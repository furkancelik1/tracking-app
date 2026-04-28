"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import type { DisciplineTrendData } from "@/actions/stats.actions";
import { DayDetailModal } from "./DayDetailModal";

type Props = {
  data: DisciplineTrendData;
  chartAnalysis?: string | null;
};

type DotPayload = { date?: string; status?: string };

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: DotPayload;
  onClick?: (p: DotPayload) => void;
};

const STATUS_COLORS: Record<string, string> = {
  fire: "#22d3ee",
  good: "#a78bfa",
  low: "#fbbf24",
  miss: "#f87171",
};

function NeonDot({ cx, cy, payload, onClick }: DotProps) {
  if (cx == null || cy == null || !payload) return null;
  const color = STATUS_COLORS[payload.status ?? ""] ?? "#a78bfa";
  return (
    <g onClick={() => onClick?.(payload)} style={{ cursor: "pointer" }}>
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.3} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#0f172a" strokeWidth={1.5} />
    </g>
  );
}

function NeonActiveDot({ cx, cy, payload, onClick }: DotProps) {
  if (cx == null || cy == null || !payload) return null;
  const color = STATUS_COLORS[payload.status ?? ""] ?? "#a78bfa";
  return (
    <g onClick={() => onClick?.(payload)} style={{ cursor: "pointer" }}>
      <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.12} />
      <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.25} />
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#0f172a" strokeWidth={2} />
    </g>
  );
}

function DisciplineTrendChartImpl({ data, chartAnalysis }: Props) {
  const t = useTranslations("disciplineTrend");
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleDotClick = useCallback((payload: DotPayload) => {
    setSelectedDate(payload?.date ?? null);
  }, []);

  const closeModal = useCallback(() => setSelectedDate(null), []);

  const { points, avgScore, trend, streakDays, biggestDrop, biggestSurge } = data;

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor = useMemo(
    () =>
      trend === "up"
        ? "text-emerald-400"
        : trend === "down"
        ? "text-red-400"
        : "text-muted-foreground",
    [trend]
  );

  if (!isMounted) return null;

  return (
    <>
      <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{t("subtitle")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", trendColor)}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {avgScore}%
              </Badge>
              {streakDays > 0 && (
                <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30">
                  {streakDays} {t("streak")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 relative">
          <div
            className="w-full h-[300px] min-h-[300px] overflow-hidden relative touch-manipulation"
            style={{
              position: "relative",
              filter:
                "drop-shadow(0 0 8px rgba(34,211,238,0.15)) drop-shadow(0 0 16px rgba(167,139,250,0.1))",
            }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300} debounce={100}>
              <AreaChart data={points} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="neonTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="35%" stopColor="#a78bfa" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.3}
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(val: string) => (isMobile ? val.charAt(0) : val)}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: number) => `${v}%`}
                  width={40}
                />

                <Tooltip
                  cursor={{ stroke: "rgba(34,211,238,0.25)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 0 20px rgba(34,211,238,0.1), 0 4px 16px rgba(0,0,0,.25)",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                  formatter={(value) => [`${Number(value)}%`, t("score")]}
                />

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  fill="url(#neonTrendGradient)"
                  dot={<NeonDot onClick={handleDotClick} />}
                  activeDot={<NeonActiveDot onClick={handleDotClick} />}
                  style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.4))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

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
                  📉 {biggestDrop.from} → {biggestDrop.to} {biggestDrop.delta}%
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <DayDetailModal date={selectedDate} onClose={closeModal} />
    </>
  );
}

export const DisciplineTrendChart = memo(DisciplineTrendChartImpl);