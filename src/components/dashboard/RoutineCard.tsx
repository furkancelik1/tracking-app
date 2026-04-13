"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { ICON_MAP } from "@/lib/routine-icons";
import { HabitHeatmap } from "@/components/dashboard/HabitHeatmap";
import { fireConfetti, hapticTap } from "@/lib/celebrations";
import { useSoundEffect } from "@/hooks/useSoundEffect";

type Props = {
  routine: RoutineWithMeta;
  /** RoutineList'ten gelen optimistic-aware callback'ler */
  onToggle: (id: string, completed: boolean, note?: string) => void;
  onDelete: (id: string) => void;
  onShare?: (routine: RoutineWithMeta) => void;
  /** useTransition isPending — tüm kartlar için geçerli değil, sadece bu kart */
  isPending: boolean;
  /** Stagger animasyonu için kart indeksi */
  index?: number;
};

// ── Framer Motion variants ───────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export function RoutineCard({ routine, onToggle, onDelete, onShare, isPending, index = 0 }: Props) {
  const t = useTranslations("dashboard.routineCard");
  const { playComplete } = useSoundEffect();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const isCompleted = routine.logs.some(
    (l) => new Date(l.completedAt) >= todayUTC
  );

  function handleCompleteClick() {
    if (isCompleted) {
      // Geri al — direkt çağır, dialog yok
      onToggle(routine.id, true);
    } else {
      setNoteText("");
      setNoteDialogOpen(true);
    }
  }

  function handleConfirm() {
    setNoteDialogOpen(false);
    hapticTap();
    playComplete();
    // Optimistic: anında konfeti + animasyon başlat
    setJustCompleted(true);
    fireConfetti();
    onToggle(routine.id, false, noteText.trim() || undefined);
    // Glow efektini kaldır
    setTimeout(() => setJustCompleted(false), 800);
  }

  const Icon = (ICON_MAP[routine.icon] ?? ICON_MAP["CheckCircle"]) as LucideIcon;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        animate={
          justCompleted
            ? {
                scale: [1, 0.95, 1.02, 1],
                boxShadow: [
                  "0 0 0 0 rgba(99,102,241,0)",
                  "0 0 20px 4px rgba(99,102,241,0.3)",
                  "0 0 30px 6px rgba(168,85,247,0.2)",
                  "0 0 0 0 rgba(99,102,241,0)",
                ],
              }
            : { scale: 1, boxShadow: "0 0 0 0 rgba(99,102,241,0)" }
        }
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="rounded-xl"
      >
        <Card
          className={cn(
            "flex flex-col transition-all duration-200",
            isCompleted
              ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
              : "hover:shadow-lg hover:shadow-primary/5 hover:border-zinc-300 dark:hover:border-zinc-600"
          )}
        >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200"
              style={{
                backgroundColor: routine.color + "22",
                color: isCompleted ? "#22c55e" : routine.color,
              }}
            >
              <Icon size={16} />
            </span>
            <CardTitle
              className={cn(
                "text-base leading-snug truncate transition-colors duration-200",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {routine.title}
            </CardTitle>
          </div>

          <Badge
            className={cn(
              "shrink-0 text-xs transition-colors duration-200",
              isCompleted
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {isCompleted ? t("completed") : t(routine.frequency === "DAILY" ? "daily" : routine.frequency === "WEEKLY" ? "weekly" : "monthly")}
          </Badge>
        </div>

        {routine.category && routine.category !== "Genel" && (
          <span
            className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full w-fit mt-1"
            style={{ backgroundColor: routine.color + "18", color: routine.color }}
          >
            {routine.category}
          </span>
        )}

        {routine.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {routine.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-semibold transition-colors duration-200",
              routine.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground/40"
            )}
          >
            🔥{" "}
            {routine.currentStreak > 0 ? t("streak", { count: routine.currentStreak }) : t("noStreak")}
          </span>
          {routine.longestStreak > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("longestStreak", { count: routine.longestStreak })}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t("totalCompleted", { count: routine._count.logs })}
        </p>

        <HabitHeatmap logs={routine.logs} color={routine.color} />
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        <Button
          size="sm"
          variant={isCompleted ? "outline" : "default"}
          className="flex-1 transition-all duration-150"
          style={
            !isCompleted
              ? { backgroundColor: routine.color, borderColor: routine.color, color: "#fff" }
              : undefined
          }
          disabled={isPending}
          onClick={handleCompleteClick}
        >
          {isCompleted ? t("completed") : t("confirmComplete").replace(" ✓", "")}
        </Button>

        {onShare && (
          <Button
            size="sm"
            variant="ghost"
            className="px-2 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            disabled={isPending}
            onClick={() => onShare(routine)}
            aria-label={t("shareRoutine")}
          >
            <Share2 className="size-3.5" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 shrink-0"
          disabled={isPending}
          onClick={() => onDelete(routine.id)}
          aria-label="Rutini sil"
        >
          ✕
        </Button>
      </CardFooter>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="size-6 rounded flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: routine.color }}
              >
                ✓
              </span>
              {routine.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Bu rutini tamamlamak için not ekleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("notePlaceholder")}
            </label>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirm();
              }}
              placeholder={t("notePlaceholder")}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {noteText.length > 0 && (
              <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                {noteText.length}/500
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">{t("cancelComplete")}</Button>
            </DialogClose>
            <Button
              size="sm"
              style={{ backgroundColor: routine.color, color: "#fff" }}
              onClick={handleConfirm}
            >
              {t("confirmComplete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
      </motion.div>
    </motion.div>
  );
}
