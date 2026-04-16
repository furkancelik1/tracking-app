"use client";

import { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeekdayPerformance } from "@/lib/analytics";
import { useTranslations } from "next-intl";

type Props = {
  data: WeekdayPerformance[];
};

export function ConsistencyRadarChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("stats.radar");

  useEffect(() => setMounted(true), []);

  const safeData = data ?? [];
  const hasData = safeData.some((d) => d.completions > 0);

  // Translate day names
  const localizedData = safeData.map((d) => ({
    ...d,
    day: t(`days.${d.dayIndex}`),
  }));

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription className="mt-0.5">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </div>
        ) : !mounted ? (
          <div style={{ height: "280px", minHeight: "280px", width: "100%" }}>
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : (
          <div style={{ height: "280px", minHeight: "280px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={localizedData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                />
                <PolarAngleAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                />
                <Radar
                  name={t("completions")}
                  dataKey="completions"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                  }}
                  formatter={(value: number) => [value, t("completions")]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
