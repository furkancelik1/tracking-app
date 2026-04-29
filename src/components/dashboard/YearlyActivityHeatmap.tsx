"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

// Types mirror stats.actions.ts — plain objects, safely serializable across the
// Server→Client boundary. buildHeatmapGrid runs server-side in stats/page.tsx.
type GridCell = {
  date: string;
  count: number;
  dayOfWeek: number;
  weekIndex: number;
  month: number;
};

export type HeatmapGridData = {
  cells: GridCell[];
  weeks: number;
  monthLabels: { label: string; weekIndex: number }[];
  totalCompletions: number;
  activeDays: number;
  totalDays: number;
};

type Props = {
  grid: HeatmapGridData;
  title?: string;
};

const TR_DAYS_SHORT = ["Pzt", "Çar", "Cum"] as const;

const TR_DAY_NAMES = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi",
];
const TR_MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function formatTurkishDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDate();
  const month = TR_MONTH_NAMES[d.getUTCMonth()] ?? "";
  const year = d.getUTCFullYear();
  const dayName = TR_DAY_NAMES[d.getUTCDay()] ?? "";
  return `${day} ${month} ${year}, ${dayName}`;
}

function intensityClass(count: number) {
  if (count <= 0) return "bg-muted/40 dark:bg-zinc-800/60";
  if (count === 1) return "bg-emerald-300/40 dark:bg-emerald-600/30";
  if (count === 2) return "bg-emerald-400/60 dark:bg-emerald-500/50";
  if (count === 3) return "bg-emerald-500/80 dark:bg-emerald-400/70";
  if (count <= 5) return "bg-emerald-600 dark:bg-emerald-400";
  return "bg-emerald-700 dark:bg-emerald-300";
}

function handleCellClick(cell: GridCell) {
  const label = formatTurkishDate(cell.date);
  if (cell.count > 0) {
    toast.success(`${label}: ${cell.count} tamamlama`, {
      description: "Bu güne ait detaylar yakında eklenecek!",
    });
  } else {
    toast(label, { description: "Bu gün henüz tamamlama yok." });
  }
}

const CELL_SIZE = 12;
const GAP = 3;

export function YearlyActivityHeatmap({ grid, title = "Yıllık Aktivite" }: Props) {
  const { cells, weeks, monthLabels, totalCompletions, activeDays, totalDays } = grid;

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
                <strong className="text-foreground tabular-nums">{totalCompletions}</strong>{" "}
                tamamlama
              </span>
              <span>
                <strong className="text-foreground tabular-nums">{activeDays}</strong>
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
                const span = (next?.weekIndex ?? weeks) - m.weekIndex;
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
              {/* Gün etiketleri (Pzt / Çar / Cum) */}
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
                      <TooltipContent side="top" className="text-xs py-1.5 px-2.5">
                        <p className="font-medium">{formatTurkishDate(cell.date)}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {cell.count > 0 ? `${cell.count} tamamlama` : "Tamamlama yok"}
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
