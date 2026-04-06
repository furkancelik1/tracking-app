"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToggleRoutine, useDeleteRoutine } from "@/hooks/useRoutines";
import type { RoutineWithMeta } from "@/hooks/useRoutines";

const FREQUENCY_LABELS: Record<RoutineWithMeta["frequency"], string> = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
};

type Props = {
  routine: RoutineWithMeta;
};

export function RoutineCard({ routine }: Props) {
  const isCompleted = routine.logs.length > 0;
  const { mutate: toggle, isPending: toggling } = useToggleRoutine();
  const { mutate: remove, isPending: removing } = useDeleteRoutine();

  const disabled = toggling || removing;

  return (
    <Card
      className={cn(
        "flex flex-col transition-all",
        isCompleted
          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
          : "hover:shadow-md"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className={cn(
              "text-base leading-snug",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {routine.title}
          </CardTitle>
          <Badge
            className={cn(
              "shrink-0 text-xs",
              isCompleted
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {isCompleted ? "Tamamlandı" : FREQUENCY_LABELS[routine.frequency]}
          </Badge>
        </div>

        {routine.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {routine.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-xs text-muted-foreground">
          Toplam{" "}
          <span className="font-semibold text-foreground">
            {routine._count.logs}
          </span>{" "}
          kez tamamlandı
        </p>
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        <Button
          size="sm"
          variant={isCompleted ? "outline" : "default"}
          className="flex-1"
          disabled={disabled}
          onClick={() => toggle({ id: routine.id, completed: isCompleted })}
        >
          {toggling
            ? "…"
            : isCompleted
              ? "Geri Al"
              : "Tamamla"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 shrink-0"
          disabled={disabled}
          onClick={() => remove(routine.id)}
          aria-label="Rutini sil"
        >
          ✕
        </Button>
      </CardFooter>
    </Card>
  );
}
