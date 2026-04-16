"use client";

import * as React from "react";
import { useState } from "react";
import { Check, Undo2, Trash2, Share2, Flame, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import type { RoutineWithMeta } from "@/hooks/useRoutines";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getTodayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isCompletedToday(logs: RoutineWithMeta["logs"]): boolean {
  const todayISO = getTodayISO();
  return logs.some((l) => l.completedAt >= todayISO);
}

// â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RoutineCardProps {
  routine: RoutineWithMeta;
  onToggle: (id: string, completed: boolean, note?: string) => void;
  onDelete: (id: string) => void;
  onShare: (routine: RoutineWithMeta) => void;
  isPending: boolean;
  index: number;
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function RoutineCard({
  routine,
  onToggle,
  onDelete,
  onShare,
  isPending,
}: RoutineCardProps) {
  const t = useTranslations("dashboard.routineCard");
  const completed = isCompletedToday(routine.logs);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all duration-200",
        completed
          ? "border-emerald-500/40 bg-emerald-950/10 dark:bg-emerald-950/20"
          : "border-border hover:border-border/80 hover:shadow-sm",
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon bubble */}
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: `${routine.color}22`, color: routine.color }}
          >
            {routine.icon}
          </div>

          {/* Title + category */}
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-medium leading-tight",
                completed && "line-through text-muted-foreground"
              )}
            >
              {routine.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{routine.category}</p>
          </div>
        </div>

        {/* Menu */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { onShare(routine); setMenuOpen(false); }}>
              <Share2 className="mr-2 size-4" />
              {t("shareRoutine")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { onDelete(routine.id); setMenuOpen(false); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {t("confirmDelete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Flame
            className={cn(
              "size-4",
              routine.currentStreak > 0 ? "text-orange-400" : "text-muted-foreground/40"
            )}
          />
          <span className={cn(routine.currentStreak > 0 && "font-medium text-foreground")}>
            {routine.currentStreak > 0
              ? t("streak", { count: routine.currentStreak })
              : t("noStreak")}
          </span>
        </span>

        <span className="text-xs">{t(routine.frequency.toLowerCase() as "daily" | "weekly" | "monthly")}</span>

        <span className="ml-auto text-xs tabular-nums">
          {t("totalCompleted", { count: routine._count.logs })}
        </span>
      </div>

      {/* Toggle button */}
      <Button
        variant={completed ? "outline" : "default"}
        size="sm"
        className={cn(
          "w-full gap-2 font-medium transition-all",
          completed
            ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            : ""
        )}
        onClick={() => onToggle(routine.id, completed)}
        disabled={isPending}
      >
        {completed ? (
          <>
            <Undo2 className="size-4" />
            {t("undo")}
          </>
        ) : (
          <>
            <Check className="size-4" />
            {t("confirmComplete")}
          </>
        )}
      </Button>
    </div>
  );
}
