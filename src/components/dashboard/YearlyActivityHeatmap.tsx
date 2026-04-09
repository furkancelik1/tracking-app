"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type HeatPoint = {
  date: string;
  count: number;
};

type Props = {
  data: HeatPoint[];
  title?: string;
};

const TR_MONTHS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
const TR_DAYS_SHORT = ["Pzt", "Çar", "Cum"];

function intensityClass(count: number) {
  if (count <= 0) return "bg-muted/40 dark:bg-zinc-800/60";
  if (count === 1) return "bg-emerald-400/30 dark:bg-emerald-500/25";
  if (count === 2) return "bg-emerald-400/50 dark:bg-emerald-500/45";
  if (count === 3) return "bg-emerald-400/70 dark:bg-emerald-500/65";
  return "bg-emerald-500 dark:bg-emerald-400";
}

type GridCell = {
  date: string;
  count: number;
  dayOfWeek: number; // 0=Pazar, 6=Cumartesi
  weekIndex: number;
  month: number;
};

function buildGrid(data: HeatPoint[]): {
  cells: GridCell[];
  weeks: number;
  monthLabels: { label: string; weekIndex: number }[];
} {
  // Veriyi map olarak indexle
  const countMap = new Map<string, number>();
  for (const p of data) {
    countMap.set(p.date, p.count);
  }

  // En eski ve en yeni tarihleri bul
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { cells: [], weeks: 0, monthLabels: [] };

  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const startDate = new Date(first.date + "T00:00:00Z");
  const endDate = new Date(last.date + "T00:00:00Z");

  // Haftanın başını (Pazar) bul
  const gridStart = new Date(startDate);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

  const cells: GridCell[] = [];
  const monthStarts: Map<number, number> = new Map(); // weekIndex -> month

  let weekIndex = 0;
  const d = new Date(gridStart);

  while (d <= endDate || d.getUTCDay() !== 0) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getUTCDay();
    const month = d.getUTCMonth();

    if (dayOfWeek === 0) {
      // Haftanın ilk günü — ay başlangıcını işaretle
      if (!monthStarts.has(weekIndex) || d.getUTCDate() <= 7) {
        monthStarts.set(weekIndex, month);
      }
    }

    cells.push({
      date: dateStr,
      count: countMap.get(dateStr) ?? 0,
      dayOfWeek,
      weekIndex,
      month,
    });

    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === 0) weekIndex++;

    // Güvenlik: 400 günden fazla döngü olmasın
    if (cells.length > 400) break;
  }

  // Ay etiketleri — her ay değişiminde bir label koy
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let prevMonth = -1;
  for (const cell of cells) {
    if (cell.dayOfWeek === 0 && cell.month !== prevMonth) {
      monthLabels.push({
        label: TR_MONTHS[cell.month] ?? "",
        weekIndex: cell.weekIndex,
      });
      prevMonth = cell.month;
    }
  }

  return { cells, weeks: weekIndex, monthLabels };
}

export function YearlyActivityHeatmap({
  data,
  title = "Yıllık Aktivite",
}: Props) {
  const { cells, weeks, monthLabels } = useMemo(() => buildGrid(data), [data]);
  const totalDays = data.length;
  const activeDays = data.filter((d) => d.count > 0).length;
  const totalCompletions = data.reduce((s, d) => s + d.count, 0);

  if (cells.length === 0) {
    return (
      <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Henüz aktivite verisi yok
          </p>
        </CardContent>
      </Card>
    );
  }

  // CSS grid: 7 satır (gün), N sütun (hafta)
  const CELL_SIZE = 12;
  const GAP = 3;
  const gridWidth = weeks * (CELL_SIZE + GAP) + 40; // +40 gün labelleri için

  return (
    <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground tabular-nums">
                {totalCompletions}
              </strong>{" "}
              tamamlama
            </span>
            <span>
              <strong className="text-foreground tabular-nums">
                {activeDays}
              </strong>
              /{totalDays} gün aktif
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          {/* Ay etiketleri */}
          <div className="flex pl-[28px]" style={{ gap: 0 }}>
            {monthLabels.map((m, i) => {
              const next = monthLabels[i + 1];
              const nextStart =
                next !== undefined
                  ? next.weekIndex
                  : weeks;
              const span = nextStart - m.weekIndex;
              return (
                <div
                  key={`${m.label}-${m.weekIndex}`}
                  className="text-[10px] text-muted-foreground"
                  style={{
                    width: span * (CELL_SIZE + GAP),
                    minWidth: span * (CELL_SIZE + GAP),
                  }}
                >
                  {span >= 2 ? m.label : ""}
                </div>
              );
            })}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-0 mt-1">
            {/* Gün etiketleri */}
            <div
              className="flex flex-col justify-between pr-1.5 shrink-0"
              style={{ height: 7 * (CELL_SIZE + GAP) - GAP }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
                <span
                  key={dayIdx}
                  className="text-[9px] text-muted-foreground leading-none"
                  style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
                >
                  {dayIdx === 1
                    ? TR_DAYS_SHORT[0]
                    : dayIdx === 3
                      ? TR_DAYS_SHORT[1]
                      : dayIdx === 5
                        ? TR_DAYS_SHORT[2]
                        : ""}
                </span>
              ))}
            </div>

            {/* Hücre grid */}
            <TooltipProvider delayDuration={100}>
              <div
                className="grid"
                style={{
                  gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
                  gridTemplateColumns: `repeat(${weeks}, ${CELL_SIZE}px)`,
                  gap: GAP,
                  gridAutoFlow: "column",
                }}
              >
                {cells.map((cell) => (
                  <Tooltip key={cell.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={`rounded-[2px] ${intensityClass(cell.count)} transition-colors hover:ring-1 hover:ring-foreground/20`}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="text-xs py-1 px-2"
                    >
                      <span className="font-medium">{cell.count}</span>{" "}
                      tamamlama — {cell.date}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Renk lejandı */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="text-[10px] text-muted-foreground">Az</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`rounded-[2px] ${intensityClass(level)}`}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              />
            ))}
            <span className="text-[10px] text-muted-foreground">Çok</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
