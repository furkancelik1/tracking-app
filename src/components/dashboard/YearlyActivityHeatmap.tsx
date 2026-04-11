"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

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

// ── Türkçe gün adları (0=Pazar … 6=Cumartesi) ──────────────────────────────
const TR_DAY_NAMES = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi",
];
const TR_MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** Tarih string'ini zengin Türkçe formata çevir: "12 Nisan 2026, Pazar" */
function formatTurkishDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDate();
  const month = TR_MONTH_NAMES[d.getUTCMonth()] ?? "";
  const year = d.getUTCFullYear();
  const dayName = TR_DAY_NAMES[d.getUTCDay()] ?? "";
  return `${day} ${month} ${year}, ${dayName}`;
}

// ── Geliştirilmiş renk skalası: daha belirgin emerald tonları ───────────────

function intensityClass(count: number) {
  if (count <= 0) return "bg-muted/40 dark:bg-zinc-800/60";
  if (count === 1) return "bg-emerald-300/40 dark:bg-emerald-600/30";
  if (count === 2) return "bg-emerald-400/60 dark:bg-emerald-500/50";
  if (count === 3) return "bg-emerald-500/80 dark:bg-emerald-400/70";
  if (count <= 5) return "bg-emerald-600 dark:bg-emerald-400";
  return "bg-emerald-700 dark:bg-emerald-300"; // 6+ — en yoğun
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
  const countMap = new Map<string, number>();
  for (const p of data) {
    countMap.set(p.date, p.count);
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { cells: [], weeks: 0, monthLabels: [] };

  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const startDate = new Date(first.date + "T00:00:00Z");
  const endDate = new Date(last.date + "T00:00:00Z");

  const gridStart = new Date(startDate);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

  const cells: GridCell[] = [];

  let weekIndex = 0;
  const d = new Date(gridStart);

  while (d <= endDate || d.getUTCDay() !== 0) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getUTCDay();
    const month = d.getUTCMonth();

    cells.push({
      date: dateStr,
      count: countMap.get(dateStr) ?? 0,
      dayOfWeek,
      weekIndex,
      month,
    });

    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === 0) weekIndex++;

    if (cells.length > 400) break;
  }

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

function handleCellClick(cell: GridCell) {
  const label = formatTurkishDate(cell.date);
  if (cell.count > 0) {
    toast.success(`${label}: ${cell.count} tamamlama`, {
      description: "Bu güne ait detaylar yakında eklenecek!",
    });
  } else {
    toast(`${label}`, {
      description: "Bu gün henüz tamamlama yok.",
    });
  }
}

export function YearlyActivityHeatmap({
  data,
  title = "Yıllık Aktivite",
}: Props) {
  const { cells, weeks, monthLabels } = useMemo(() => buildGrid(data), [data]);
  const totalDays = data.length;
  const activeDays = data.filter((d) => d.count > 0).length;
  const totalCompletions = data.reduce((s, d) => s + d.count, 0);

  // ── Boş / yeni kullanıcı state ──────────────────────────────────────────
  if (cells.length === 0 || totalCompletions === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">
                Henüz çok başındasın, ilk kareyi boyamaya ne dersin?
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Rutinlerini tamamladıkça bu harita yeşillenecek. Her gün bir kare, her kare bir adım!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const CELL_SIZE = 12;
  const GAP = 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="border-zinc-800/50 bg-card/70 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
                        <button
                          type="button"
                          className={`rounded-[2px] ${intensityClass(cell.count)} transition-colors hover:ring-1 hover:ring-foreground/30 hover:brightness-110 cursor-pointer`}
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                          onClick={() => handleCellClick(cell)}
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="text-xs py-1.5 px-2.5"
                      >
                        <p className="font-medium">{formatTurkishDate(cell.date)}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {cell.count > 0
                            ? `${cell.count} tamamlama`
                            : "Tamamlama yok"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </div>

            {/* Renk lejandı */}
            <div className="flex items-center gap-1.5 mt-3 justify-end">
              <span className="text-[10px] text-muted-foreground">Az</span>
              {[0, 1, 2, 3, 4, 6].map((level) => (
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
    </motion.div>
  );
}
