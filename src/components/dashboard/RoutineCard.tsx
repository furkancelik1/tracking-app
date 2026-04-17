"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Undo2, Trash2, Share2, Flame, MoreVertical, ChevronDown, Clock, Zap } from "lucide-react";
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
import Image from "next/image";

function getTodayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isCompletedToday(logs: RoutineWithMeta["logs"], todayISO: string): boolean {
  return logs.some((l) => l.completedAt >= todayISO);
}

interface RoutineCardProps {
  routine: RoutineWithMeta;
  onToggle: (id: string, completed: boolean, note?: string) => void;
  onDelete: (id: string) => void;
  onShare: (routine: RoutineWithMeta) => void;
  isPending: boolean;
  index: number;
}

export function RoutineCard({
  routine,
  onToggle,
  onDelete,
  onShare,
  isPending,
}: RoutineCardProps) {
  const t = useTranslations("dashboard.routineCard");
  const [todayISO, setTodayISO] = useState<string | null>(null);
  const completed = useMemo(
    () => (todayISO ? isCompletedToday(routine.logs, todayISO) : false),
    [routine.logs, todayISO]
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [showShimmer, setShowShimmer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const iconColor = routine.color ?? "#D6FF00";
  const Icon = ICON_MAP[routine.icon ?? ""];
  const prevCompletedRef = useRef(completed);
  const didInitCompletedRef = useRef(false);

  const intensityKey = routine.intensity?.toLowerCase() as "low" | "medium" | "high";

  useEffect(() => {
    setTodayISO(getTodayISO());
  }, []);

  useEffect(() => {
    if (!didInitCompletedRef.current) {
      prevCompletedRef.current = completed;
      didInitCompletedRef.current = true;
      return;
    }
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

  const hasTip = Boolean(routine.coachTip?.trim());
  const showCoach = hasTip && expanded;

  return (
    <motion.div
      layout
      suppressHydrationWarning
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
        "group relative overflow-hidden flex flex-col gap-4 rounded-2xl p-5 border transition-colors",
        "bg-gradient-to-br from-zinc-950 via-black to-zinc-950",
        "border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.65)]",
        completed
          ? "ring-1 ring-[#D6FF00]/35"
          : "hover:border-[#D6FF00]/25",
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background: `radial-gradient(120% 80% at 10% 0%, ${iconColor}55 0%, transparent 55%)`,
        }}
      />

      <AnimatePresence>
        {showShimmer && (
          <motion.div
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: "120%", opacity: [0, 0.55, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 z-10 w-1/2 bg-gradient-to-r from-transparent via-[#D6FF00]/20 to-transparent"
          />
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-2 relative z-[1]">
        <button
          type="button"
          onClick={() => hasTip && setExpanded((v) => !v)}
          className={cn(
            "flex flex-1 items-start gap-3 min-w-0 text-left rounded-lg -m-1 p-1 transition-colors",
            hasTip && "hover:bg-white/[0.04] cursor-pointer"
          )}
          aria-expanded={hasTip ? expanded : undefined}
        >
          {routine.imageUrl ? (
            <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl ring-2 ring-white/10">
              <Image
                src={routine.imageUrl}
                alt={routine.title}
                fill
                className="object-cover"
                sizes="72px"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-xl ring-2 ring-white/10"
              style={{
                backgroundColor: `${iconColor}18`,
                color: iconColor,
                boxShadow: `0 0 32px ${iconColor}22`,
              }}
            >
              {Icon ? <Icon className="size-9 scale-110" strokeWidth={2.25} /> : <Check className="size-9" />}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate font-extrabold text-base tracking-tight text-white",
                completed && "line-through text-zinc-500"
              )}
            >
              {routine.title}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 mt-1">{routine.category}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5">
                <Zap className="size-3 text-[#D6FF00]" />
                {t(`intensity.${intensityKey}`)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 tabular-nums">
                <Clock className="size-3" />
                {routine.estimatedMinutes} min
              </span>
              {routine.isGuided && (
                <span className="rounded-full border border-[#D6FF00]/30 bg-[#D6FF00]/10 px-2 py-0.5 text-[#D6FF00] font-semibold">
                  {t("guidedBadge")}
                </span>
              )}
            </div>
          </div>
          {hasTip && (
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-zinc-500 mt-1 transition-transform",
                expanded && "rotate-180"
              )}
            />
          )}
        </button>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400"
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

      <AnimatePresence initial={false}>
        {showCoach && routine.coachTip && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-[1] overflow-hidden rounded-xl border border-[#D6FF00]/20 bg-[#D6FF00]/[0.06] px-3 py-2.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D6FF00]/80 mb-1">
              {t("coachTipLabel")}
            </p>
            <p className="text-sm text-zinc-200 leading-snug">{routine.coachTip}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 text-sm text-zinc-500 relative z-[1]">
        <span className="flex items-center gap-1.5">
          <Flame
            className={cn(
              "size-4",
              routine.currentStreak > 0 ? "text-orange-400" : "text-zinc-600"
            )}
          />
          <span className={cn(routine.currentStreak > 0 && "font-semibold text-white")}>
            {routine.currentStreak > 0
              ? t("streak", { count: routine.currentStreak })
              : t("noStreak")}
          </span>
        </span>

        <span className="text-xs uppercase tracking-wide text-zinc-600">
          {t(routine.frequency.toLowerCase() as "daily" | "weekly" | "monthly")}
        </span>

        <span className="ml-auto text-xs tabular-nums text-zinc-500">
          {t("totalCompleted", { count: routine._count.logs })}
        </span>
      </div>

      <Button
        variant={completed ? "outline" : "default"}
        size="sm"
        className={cn(
          "w-full gap-2 font-bold uppercase tracking-wide text-xs relative z-[1]",
          completed
            ? "border-white/15 text-zinc-300 hover:bg-white/5"
            : "bg-[#D6FF00] text-black hover:bg-[#c8f000] border-0"
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
