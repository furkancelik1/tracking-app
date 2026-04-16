"use client";

import React from "react";

type LogEntry = { id: string; completedAt: string; note: string | null };

type Props = {
  logs: LogEntry[];
  color: string;
  /** Kaç gün geriye bakacağımız (default: 30) */
  days?: number;
};

export function HabitHeatmap({ logs, color, days = 30 }: Props) {
  // Son N günü oluştur — en eski solda, bugün sağda
  const cells = buildCells(logs, days);

  const completed = cells.filter((c) => c.done).length;
  const rate = Math.round((completed / days) * 100);

  return (
    <div className="space-y-1.5">
      {/* Başlık satırı */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Son {days} Gün
        </span>
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: rate >= 70 ? color : undefined }}
        >
          Bu Ay: %{rate}
        </span>
      </div>

      {/* Kare ızgarası: 10 sütun × 3 satır = 30 hücre */}
      <div className="grid grid-cols-10 gap-[3px]">
        {cells.map((cell) => (
          <div
            key={cell.dateStr}
            title={formatTooltip(cell)}
            className="aspect-square rounded-[2px] transition-opacity hover:opacity-80 cursor-default"
            style={{
              backgroundColor: cell.done ? color : "hsl(var(--muted))",
              opacity: cell.done ? (cell.isToday ? 1 : 0.75) : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Yardımcı tipler ve fonksiyonlar ─────────────────────────────────────────

type Cell = {
  dateStr: string; // "2025-04-01"
  label: string;   // "1 Nis 2025, Sal"
  done: boolean;
  note: string | null;
  isToday: boolean;
};

function buildCells(logs: LogEntry[], days: number): Cell[] {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // Log'ları YYYY-MM-DD string anahtarıyla set'e al
  const logMap = new Map<string, string | null>();
  for (const l of logs) {
    const d = new Date(l.completedAt);
    const key = toDateStr(d);
    // Aynı gün birden fazla log olsa da en son notu tut
    if (!logMap.has(key)) logMap.set(key, l.note);
  }

  const cells: Cell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayUTC);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = toDateStr(d);
    const isToday = i === 0;

    cells.push({
      dateStr,
      label: formatLabel(d, isToday),
      done: logMap.has(dateStr),
      note: logMap.get(dateStr) ?? null,
      isToday,
    });
  }
  return cells;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

const TR_MONTHS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];
const TR_DAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function formatLabel(d: Date, isToday: boolean): string {
  const prefix = isToday ? "Bugün" : `${d.getUTCDate()} ${TR_MONTHS[d.getUTCMonth()]}`;
  const dayName = TR_DAYS_SHORT[d.getUTCDay()];
  return `${prefix}, ${dayName}`;
}

function formatTooltip(cell: Cell): string {
  const status = cell.done ? "✓ Tamamlandı" : "✗ Tamamlanmadı";
  const note = cell.note ? `\n📝 ${cell.note}` : "";
  return `${cell.label}\n${status}${note}`;
}
