"use client";

import {from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Star,
  AlertCircle,
  Zap,
  Coffee,
} from "lucide-react";
import type { Insight, MonthlyComparison } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type Props = {
  insights: Insight[];
  monthlyComparison: MonthlyComparison;
};

const INSIGHT_ICONS: Record<string, ReactNode> = {
  bestWeekday: <Star className="h-4 w-4" />,
  topRoutine: <TrendingUp className="h-4 w-4" />,
  weakRoutine: <AlertCircle className="h-4 w-4" />,
  monthlyImprovement: <TrendingUp className="h-4 w-4" />,
  monthlyDecline: <TrendingDown className="h-4 w-4" />,
  weekendWarrior: <Coffee className="h-4 w-4" />,
  weekdayWarrior: <Zap className="h-4 w-4" />,
};

const INSIGHT_COLORS: Record<Insight["type"], string> = {
  positive: "text-emerald-500 bg-emerald-500/10",
  warning: "text-orange-400 bg-orange-400/10",
  neutral: "text-blue-400 bg-blue-400/10",
};

export function InsightCards({ insights, monthlyComparison }: Props) {
  const t = useTranslations("stats.insights");

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Monthly comparison card */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-card/50 p-3">
            <div
              className={`rounded-md p-1.5 shrink-0 ${
                monthlyComparison.changePercent >= 0
                  ? INSIGHT_COLORS.positive
                  : INSIGHT_COLORS.warning
              }`}
            >
              {monthlyComparison.changePercent >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("monthlyComparison")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("monthlyComparisonDetail", {
                  thisMonth: monthlyComparison.thisMonth,
                  lastMonth: monthlyComparison.lastMonth,
                  percent: Math.abs(monthlyComparison.changePercent),
                  direction: monthlyComparison.changePercent >= 0 ? "↑" : "↓",
                })}
              </p>
            </div>
          </div>

          {/* Dynamic insight cards */}
          {insights.map((insight) => (
            <div
              key={insight.key}
              className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-card/50 p-3"
            >
              <div
                className={`rounded-md p-1.5 shrink-0 ${INSIGHT_COLORS[insight.type]}`}
              >
                {INSIGHT_ICONS[insight.key] ?? <Lightbulb className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t(`${insight.key}.title`)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(`${insight.key}.description`, insight.params)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
