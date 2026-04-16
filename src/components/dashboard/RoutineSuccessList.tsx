"use client";

import {from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle } from "lucide-react";
import type { RoutineSuccessRate } from "@/lib/analytics";
import { useTranslations } from "next-intl";

type Props = {
  data: RoutineSuccessRate[];
};

export function RoutineSuccessList({ data }: Props) {
  const t = useTranslations("stats.routineSuccess");

  const safeData = data ?? [];
  if (safeData.length === 0) {
    return null;
  }

  // Split into top performers (>=50%) and needs focus (<50%)
  const topPerformers = safeData.filter((r) => r.successRate >= 50).slice(0, 5);
  const needsFocus = safeData
    .filter((r) => r.successRate < 50)
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 5);

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription className="mt-0.5">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Most Disciplined */}
        {topPerformers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("mostDisciplined")}
              </span>
            </div>
            <ul className="space-y-2">
              {topPerformers.map((r) => (
                <RoutineRow key={r.routineId} routine={r} variant="success" />
              ))}
            </ul>
          </div>
        )}

        {/* Needs Focus */}
        {needsFocus.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("needsFocus")}
              </span>
            </div>
            <ul className="space-y-2">
              {needsFocus.map((r) => (
                <RoutineRow key={r.routineId} routine={r} variant="warning" />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoutineRow({
  routine,
  variant,
}: {
  routine: RoutineSuccessRate;
  variant: "success" | "warning";
}) {
  const t = useTranslations("stats.routineSuccess");

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: routine.color }}
        />
        <span className="text-sm truncate">{routine.name}</span>
        <Badge
          variant="outline"
          className="text-[10px] shrink-0 px-1.5 py-0"
        >
          {routine.category}
        </Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              variant === "success" ? "bg-emerald-500" : "bg-orange-400"
            }`}
            style={{ width: `${routine.successRate}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums w-8 text-right">
          %{routine.successRate}
        </span>
      </div>
    </li>
  );
}
