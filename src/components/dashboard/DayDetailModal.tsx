"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Flame, ThumbsUp, AlertTriangle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { getDayDetail, type DayDetailData, type DisciplineTrendStatus } from "@/actions/stats.actions";
import { motion } from "framer-motion";

type Props = {
  date: string | null;
  onClose: () => void;
};

const STATUS_CONFIG: Record<DisciplineTrendStatus, {
  icon: typeof Flame;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  fire: {
    icon: Flame,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.15)]",
  },
  good: {
    icon: ThumbsUp,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_12px_rgba(167,139,250,0.15)]",
  },
  low: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.15)]",
  },
  miss: {
    icon: Ban,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "shadow-[0_0_12px_rgba(248,113,113,0.15)]",
  },
};

export function DayDetailModal({ date, onClose }: Props) {
  const t = useTranslations("disciplineTrend");
  const [data, setData] = useState<DayDetailData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!date) {
      setData(null);
      return;
    }
    startTransition(async () => {
      try {
        const result = await getDayDetail(date);
        setData(result);
      } catch {
        setData(null);
      }
    });
  }, [date]);

  const isOpen = date !== null;
  const config = data ? STATUS_CONFIG[data.status] : null;
  const StatusIcon = config?.icon ?? Flame;

  const completedCount = data?.routines.filter((r) => r.completed).length ?? 0;
  const totalCount = data?.routines.length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-zinc-800/60 bg-card/95 backdrop-blur-md">
        {isPending || !data ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    config?.bg,
                    config?.border,
                    "border",
                    config?.glow
                  )}
                >
                  <StatusIcon className={cn("h-5 w-5", config?.color)} />
                </div>
                <div>
                  <DialogTitle className="text-base">
                    {data.day} — {data.date}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <span className={cn("font-semibold tabular-nums", config?.color)}>
                      %{data.score}
                    </span>
                    <span>·</span>
                    <span>
                      {completedCount}/{totalCount} {t("completed")}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-2 space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {data.routines.map((routine, idx) => (
                <motion.div
                  key={routine.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    routine.completed
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-zinc-800/40 bg-zinc-900/30"
                  )}
                >
                  <span className="text-lg shrink-0">{routine.emoji}</span>
                  <span className="flex-1 text-sm truncate">{routine.title}</span>
                  {routine.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-zinc-600 shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Status badge */}
            <div className="flex justify-center pt-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs gap-1.5 px-3 py-1",
                  config?.border,
                  config?.color,
                  config?.bg
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {t(`status_${data.status}`)}
              </Badge>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
