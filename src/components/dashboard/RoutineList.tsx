"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRoutines } from "@/hooks/useRoutines";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { RoutineCard } from "@/components/dashboard/RoutineCard";
import { RoutineProgressBar } from "@/components/dashboard/RoutineProgressBar";
import { AddRoutineDialog } from "@/components/dashboard/AddRoutineDialog";

type Props = {
  initialRoutines: RoutineWithMeta[];
};

export function RoutineList({ initialRoutines }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const auth = useAuth();
  const { data: routines = [], isLoading } = useRoutines(initialRoutines);

  const isPro = auth.status === "authenticated" && auth.isPro;
  const atLimit = !isPro && routines.length >= 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rutinlerim</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Günlük alışkanlıklarını takip et
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={atLimit}
          title={atLimit ? "FREE planda maksimum 5 rutin oluşturabilirsin" : undefined}
        >
          + Rutin Ekle
        </Button>
      </div>

      {/* FREE limit uyarısı */}
      {atLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 flex items-center justify-between gap-4 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <span className="font-semibold">5/5 rutin</span> — Ücretsiz plan
            limitine ulaştın. Sınırsız rutin için PRO&apos;ya geç.
          </p>
          <Button size="sm" asChild>
            <a href="/settings">PRO&apos;ya Geç</a>
          </Button>
        </div>
      )}

      {/* Progress bar */}
      {routines.length > 0 && <RoutineProgressBar routines={routines} />}

      {/* Liste */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((r) => (
            <RoutineCard key={r.id} routine={r} />
          ))}
        </div>
      )}

      <AddRoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-4">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-2xl">
        ✓
      </div>
      <div>
        <p className="font-medium">Henüz rutin yok</p>
        <p className="text-sm text-muted-foreground mt-1">
          İlk rutinini ekleyerek alışkanlık takibine başla.
        </p>
      </div>
      <Button onClick={onAdd}>İlk Rutini Ekle</Button>
    </div>
  );
}
