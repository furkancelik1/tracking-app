"use client";

import { useState } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { ICON_MAP } from "@/lib/routine-icons";
import { HabitHeatmap } from "@/components/dashboard/HabitHeatmap";

const FREQUENCY_LABELS: Record<RoutineWithMeta["frequency"], string> = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
};

type Props = {
  routine: RoutineWithMeta;
  /** RoutineList'ten gelen optimistic-aware callback'ler */
  onToggle: (id: string, completed: boolean, note?: string) => void;
  onDelete: (id: string) => void;
  /** useTransition isPending — tüm kartlar için geçerli değil, sadece bu kart */
  isPending: boolean;
};

export function RoutineCard({ routine, onToggle, onDelete, isPending }: Props) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

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
    onToggle(routine.id, false, noteText.trim() || undefined);
  }

  const Icon = (ICON_MAP[routine.icon] ?? ICON_MAP["CheckCircle"]) as LucideIcon;

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-200",
        isCompleted
          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
          : "hover:shadow-md"
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
            {isCompleted ? "Tamamlandı" : FREQUENCY_LABELS[routine.frequency]}
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
            {routine.currentStreak > 0 ? `${routine.currentStreak} gün` : "—"}
          </span>
          {routine.longestStreak > 0 && (
            <span className="text-xs text-muted-foreground">
              En uzun: {routine.longestStreak}g
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Toplam{" "}
          <span className="font-semibold text-foreground">{routine._count.logs}</span>{" "}
          kez tamamlandı
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
          {isCompleted ? "Geri Al" : "Tamamla"}
        </Button>

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
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Not ekle{" "}
              <span className="text-muted-foreground font-normal">(isteğe bağlı)</span>
            </label>
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirm();
              }}
              placeholder="Bugün nasıl hissettirdi? Ne fark ettiniz?"
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
              <Button variant="ghost" size="sm">İptal</Button>
            </DialogClose>
            <Button
              size="sm"
              style={{ backgroundColor: routine.color, color: "#fff" }}
              onClick={handleConfirm}
            >
              Tamamla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
