import { Progress } from "@/components/ui/progress";
import type { RoutineWithMeta } from "@/hooks/useRoutines";

type Props = {
  routines: RoutineWithMeta[];
};

/** Bugünün UTC başlangıcı ile karşılaştır — 30 günlük loglardan sadece bugünküleri say */
function isTodayCompleted(routine: RoutineWithMeta): boolean {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  return routine.logs.some((l) => new Date(l.completedAt) >= todayUTC);
}

export function RoutineProgressBar({ routines }: Props) {
  const total = routines.length;
  const completed = routines.filter(isTodayCompleted).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Bugünkü ilerleme</span>
        <span className="font-medium tabular-nums">
          {completed}/{total} tamamlandı
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
