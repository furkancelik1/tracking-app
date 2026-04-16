"use client";

import React from "react";

type LogEntry = { id: string; completedAt: string; note: string | null };

type Props = {
  logs: LogEntry[];
  color: string;
  /** KaÃ§ gÃ¼n geriye bakacaÄŸÄ±mÄ±z (default: 30) */
  days?: number;
};

export function HabitHeatmap({ logs, color, days = 30 }: Props) {
  // Son N gÃ¼nÃ¼ oluÅŸtur â€” en eski solda, bugÃ¼n saÄŸda
  const cells = buildCells(logs, days);

  const completed = cells.filter((c) => c.done).length;
  const rate = Math.round((completed / days) * 100);

  return (
    <div className="space-y-1.5">
      {/* BaÅŸlÄ±k satÄ±rÄ± */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Son {days} GÃ¼n
        </span>
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: rate >= 70 ? color : undefined }}
        >
          Bu Ay: %{rate}
        </span>
      </div>

      {/* Kare Ä±zgarasÄ±: 10 sÃ¼tun Ã— 3 satÄ±r = 30 hÃ¼cre */}
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

// â”€â”€â”€ YardÄ±mcÄ± tipler ve fonksiyonlar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // Log'larÄ± YYYY-MM-DD string anahtarÄ±yla set'e al
  const logMap = new Map<string, string | null>();
  for (const l of logs) {
    const d = new Date(l.completedAt);
    const key = toDateStr(d);
    // AynÄ± gÃ¼n birden fazla log olsa da en son notu tut
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
  "Oca", "Åub", "Mar", "Nis", "May", "Haz",
  "Tem", "AÄŸu", "Eyl", "Eki", "Kas", "Ara",
];
const TR_DAYS_SHORT = ["Paz", "Pzt", "Sal", "Ã‡ar", "Per", "Cum", "Cmt"];

function formatLabel(d: Date, isToday: boolean): string {
  const prefix = isToday ? "BugÃ¼n" : `${d.getUTCDate()} ${TR_MONTHS[d.getUTCMonth()]}`;
  const dayName = TR_DAYS_SHORT[d.getUTCDay()];
  return `${prefix}, ${dayName}`;
}

function formatTooltip(cell: Cell): string {
  const status = cell.done ? "âœ“ TamamlandÄ±" : "âœ— TamamlanmadÄ±";
  const note = cell.note ? `\nğŸ“ ${cell.note}` : "";
  return `${cell.label}\n${status}${note}`;
}
