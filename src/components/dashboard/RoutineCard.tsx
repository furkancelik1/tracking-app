"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { ICON_MAP } from "@/lib/routine-icons";

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
  const [isPressing, setIsPressing] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const iconColor = routine.color ?? "#3b82f6";
  const Icon = ICON_MAP[routine.icon ?? ""];
  const prevCompletedRef = useRef(completed);

  useEffect(() => {
    if (!prevCompletedRef.current && completed) {
      setShowShimmer(true);
      const timer = window.setTimeout(() => setShowShimmer(false), 750);
      return () => window.clearTimeout(timer);
    }
    prevCompletedRef.current = completed;
  }, [completed]);

  function handleToggle() {
    if (isPending) return;
    if (!completed) {
      setIsPressing(true);
      window.setTimeout(() => setIsPressing(false), 140);
    }
    onToggle(routine.id, completed);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isPressing ? 0.98 : completed ? 1.01 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 20,
      }}
      className={cn(
        "group relative overflow-hidden flex flex-col gap-4 rounded-xl p-5 glass-card dark-surface retro-border theme-surface border border-white/10",
        completed
          ? "border-emerald-300/30 bg-emerald-950/10 dark:bg-emerald-950/20"
          : "hover:border-white/20 hover:shadow-sm",
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      <AnimatePresence>
        {showShimmer && (
          <motion.div
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: "120%", opacity: [0, 0.65, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 z-10 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon bubble */}
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: `${iconColor}22`, color: iconColor }}
          >
            {Icon ? <Icon className="size-5" /> : <Check className="size-5" />}
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
        onClick={handleToggle}
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
    </motion.div>
  );
}
