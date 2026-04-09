"use client";

import { useOptimistic, useTransition, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRoutines, useRoutineQueryClient } from "@/hooks/useRoutines";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { RoutineCard } from "@/components/dashboard/RoutineCard";
import { RoutineProgressBar } from "@/components/dashboard/RoutineProgressBar";
import { AddRoutineDialog } from "@/components/dashboard/AddRoutineDialog";
import {
  completeRoutineAction,
  undoRoutineAction,
  deleteRoutineAction,
} from "@/actions/routine.actions";

// ─── Optimistic reducer ───────────────────────────────────────────────────────

type OptimisticAction =
  | { type: "toggle"; id: string; completed: boolean; note?: string }
  | { type: "delete"; id: string };

function optimisticReducer(
  state: RoutineWithMeta[],
  action: OptimisticAction
): RoutineWithMeta[] {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const todayISO = todayUTC.toISOString();

  switch (action.type) {
    case "toggle":
      return state.map((r) => {
        if (r.id !== action.id) return r;
        if (action.completed) {
          // Geri al: bugünkü log kaldır, streak azalt
          return {
            ...r,
            logs: r.logs.filter((l) => l.completedAt < todayISO),
            currentStreak: Math.max(0, r.currentStreak - 1),
          };
        }
        // Tamamla: log ekle, streak artır
        return {
          ...r,
          logs: [{ id: "_opt", completedAt: todayISO, note: action.note ?? null }, ...r.logs],
          currentStreak: r.currentStreak + 1,
          _count: { logs: r._count.logs + 1 },
        };
      });

    case "delete":
      return state.filter((r) => r.id !== action.id);

    default:
      return state;
  }
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

type Props = { initialRoutines: RoutineWithMeta[] };

const ALL = "Tümü";

export function RoutineList({ initialRoutines }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Sunucu verisi (TanStack Query — polling + refetch)
  const { data: serverRoutines = [], isLoading } = useRoutines(initialRoutines);
  // Server Action tamamlandıktan sonra TQ cache'ini temizle
  const { invalidate } = useRoutineQueryClient();

  // ── useOptimistic: serverRoutines baz alınır, dispatch ile anında güncellenir.
  //    Transition bitince serverRoutines'e (sunucu doğrusu) döner.
  const [optimisticRoutines, dispatch] = useOptimistic(serverRoutines, optimisticReducer);

  // ── useTransition: async Server Action'ı sarar (isPending kullanılmıyor —
  //    görsel durum pendingId üzerinden yönetilir)
  const [, startToggle] = useTransition();
  const [, startDelete] = useTransition();

  const auth = useAuth();
  const isPro = auth.status === "authenticated" && auth.isPro;
  const atLimit = !isPro && serverRoutines.length >= 3;

  // ── Handler'lar ────────────────────────────────────────────────────────────

  /**
   * Tamamla / Geri Al
   *
   * Akış:
   *  1. dispatch → useOptimistic anında UI günceller (0 ms)
   *  2. Server Action → Prisma + revalidatePath (ağ gecikmesi)
   *  3. invalidate → TQ cache temizlenir → refetch başlar
   *  4. Hata → useOptimistic otomatik eski state'e döner + toast
   */
  function handleToggle(id: string, completed: boolean, note?: string) {
    setPendingId(id);
    startToggle(async () => {
      dispatch({ type: "toggle", id, completed, note });
      try {
        await (completed ? undoRoutineAction(id) : completeRoutineAction(id, note));
        toast.success(completed ? "Tamamlama geri alındı." : "Rutin tamamlandı! 🔥");
      } catch (err) {
        // useOptimistic transition bittiğinde otomatik geri alır
        toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
      } finally {
        setPendingId(null);
        invalidate();
      }
    });
  }

  function handleDelete(id: string) {
    setPendingId(id);
    startDelete(async () => {
      dispatch({ type: "delete", id });
      try {
        await deleteRoutineAction(id);
        toast.success("Rutin silindi.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Silinemedi.");
      } finally {
        setPendingId(null);
        invalidate();
      }
    });
  }

  // ── Türev veriler (optimistic veriden beslenir) ────────────────────────────

  const categories = useMemo(() => {
    const cats = Array.from(new Set(optimisticRoutines.map((r) => r.category))).sort();
    return [ALL, ...cats];
  }, [optimisticRoutines]);

  const filtered = useMemo(
    () =>
      activeCategory === ALL
        ? optimisticRoutines
        : optimisticRoutines.filter((r) => r.category === activeCategory),
    [optimisticRoutines, activeCategory]
  );

  // ── Render ────────────────────────────────────────────────────────────────

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
          title={atLimit ? "FREE planda maksimum 3 rutin oluşturabilirsin" : undefined}
        >
          + Rutin Ekle
        </Button>
      </div>

      {/* FREE limit uyarısı */}
      {atLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 flex items-center justify-between gap-4 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <span className="font-semibold">3/3 rutin</span> — Ücretsiz plan
            limitine ulaştın. Sınırsız rutin için PRO&apos;ya geç.
          </p>
          <Button size="sm" asChild>
            <a href="/settings">PRO&apos;ya Geç</a>
          </Button>
        </div>
      )}

      {/* Progress bar — optimistic veriden beslenir → anında güncellenir */}
      {optimisticRoutines.length > 0 && (
        <RoutineProgressBar routines={optimisticRoutines} />
      )}

      {/* Kategori filtre tabs — optimistic veriden beslenir */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => {
            const count =
              cat === ALL
                ? optimisticRoutines.length
                : optimisticRoutines.filter((r) => r.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {cat}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    activeCategory === cat
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Rutin listesi */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        optimisticRoutines.length === 0 ? (
          <EmptyState onAdd={() => setDialogOpen(true)} />
        ) : (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <p>Bu kategoride rutin yok.</p>
            <button
              onClick={() => setActiveCategory(ALL)}
              className="mt-2 text-primary hover:underline"
            >
              Tümünü göster
            </button>
          </div>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              onToggle={handleToggle}
              onDelete={handleDelete}
              isPending={pendingId === r.id}
            />
          ))}
        </div>
      )}

      <AddRoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} atLimit={atLimit} />
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
