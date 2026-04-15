"use client";

import { useOptimistic, useTransition, useMemo, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
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
import { fireAllDoneConfetti, fireLevelUpConfetti, hapticSuccess } from "@/lib/celebrations";
import { calculateLevel, didLevelUp } from "@/lib/level";
import { fireDuelToast } from "@/lib/duel-notifications";
import { ShareCardModal } from "@/components/dashboard/ShareCardModal";
import type { ShareCardProps } from "@/components/dashboard/ShareCard";
import { BadgeCelebration } from "@/components/dashboard/BadgeCelebration";
import { LevelUpModal } from "@/components/dashboard/LevelUpModal";

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

const ALL = "__all__";

export function RoutineList({ initialRoutines }: Props) {
  const t = useTranslations("dashboard.routineList");
  const tc = useTranslations("common");
  const td = useTranslations("duel");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const allDoneFiredRef = useRef(false);
  const [shareModal, setShareModal] = useState<{ open: boolean; props: ShareCardProps | null }>({
    open: false,
    props: null,
  });
  const [celebrationBadge, setCelebrationBadge] = useState<string | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{
    level: number;
    rank: string;
    rankColor: string;
  } | null>(null);

  // Sunucu verisi (TanStack Query — polling + refetch)
  const { data: serverRoutines = [], isLoading } = useRoutines(initialRoutines);
  // Server Action tamamlandıktan sonra TQ cache'ini temizle
  const { invalidate } = useRoutineQueryClient();

  // ── useOptimistic: serverRoutines baz alınır, dispatch ile anında güncellenir.
  //    Transition bitince serverRoutines'e (sunucu doğrusu) döner.
  const [optimisticRoutines, dispatch] = useOptimistic(serverRoutines, optimisticReducer);

  // Reset allDone flag when server data refreshes (new day / undo)
  useEffect(() => {
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const todayISO = todayUTC.toISOString();
    const allDone = serverRoutines.length > 0 && serverRoutines.every((r) =>
      r.logs.some((l) => l.completedAt >= todayISO)
    );
    if (!allDone) allDoneFiredRef.current = false;
  }, [serverRoutines]);

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

      // ── All Done detection (optimistic) ────────────────────────────
      if (!completed) {
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);
        const todayISO = todayUTC.toISOString();
        const afterToggle = serverRoutines.map((r) => {
          if (r.id !== id) return r;
          return { ...r, logs: [{ id: "_opt", completedAt: todayISO, note: null }, ...r.logs] };
        });
        const allDone = afterToggle.length > 0 && afterToggle.every((r) =>
          r.logs.some((l) => l.completedAt >= todayISO)
        );
        if (allDone && !allDoneFiredRef.current) {
          allDoneFiredRef.current = true;
          hapticSuccess();
          // Küçük gecikme — tek rutin konfetisi bittikten sonra büyük kutlama
          setTimeout(() => {
            fireAllDoneConfetti();
            toast.success(t("allDone"), { duration: 4000 });
          }, 400);
        }
      } else {
        // Geri al durumunda allDone sıfırla
        allDoneFiredRef.current = false;
      }

      try {
        if (completed) {
          await undoRoutineAction(id);
          toast.success(t("undone"));
          window.dispatchEvent(new CustomEvent("coins-updated"));
        } else {
          const result = await completeRoutineAction(id, note);
          toast.success(t("completed"));
          // Navbar coin göstergesini güncelle
          window.dispatchEvent(new CustomEvent("coins-updated"));

          // ── Düello skor bildirimi ──────────────────────────────────
          if (result?.duelScoreUpdated && result.duelOpponentName) {
            fireDuelToast("score", {
              title: td("notifOpponentScored"),
              description: td("notifOpponentScoredDesc", { name: result.duelOpponentName }),
              actionLabel: td("notifViewDuel"),
              onAction: () => window.dispatchEvent(new CustomEvent("navigate-social")),
            });
          }

          // ── Rozet kutlaması ───────────────────────────────────────
          if (result?.newBadges && result.newBadges.length > 0) {
            setTimeout(() => setCelebrationBadge(result.newBadges[0]), 1800);
          }

          // ── Level-up algıla ────────────────────────────────────────
          if (result && didLevelUp(result.totalXp - result.xpGain, result.totalXp)) {
            const { level, rank, rankColor } = calculateLevel(result.totalXp);
            setTimeout(() => {
              fireLevelUpConfetti();
              hapticSuccess();
              setLevelUpModal({ level, rank, rankColor });
            }, 600);
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("actionFailed"));
        allDoneFiredRef.current = false;
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
        toast.success(t("deleted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("deleteFailed"));
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

  // Display label for ALL category
  const getCategoryLabel = (cat: string) => cat === ALL ? t("allCategories") : cat;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={atLimit}
          title={atLimit ? t("limitWarning", { count: 3, max: 3 }) : undefined}
        >
          {t("addRoutine")}
        </Button>
      </div>

      {/* FREE limit uyarısı */}
      {atLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 flex items-center justify-between gap-4 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <span className="font-semibold">3/3</span> — {t("limitWarning", { count: 3, max: 3 })}
          </p>
          <Button size="sm" asChild>
            <a href="/settings">{t("upgradeCta")}</a>
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
                {getCategoryLabel(cat)}
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
            <p>{t("noRoutinesInCategory")}</p>
            <button
              onClick={() => setActiveCategory(ALL)}
              className="mt-2 text-primary hover:underline"
            >
              {t("showAll")}
            </button>
          </div>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <RoutineCard
              key={r.id}
              routine={r}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onShare={(routine) => {
                setShareModal({
                  open: true,
                  props: {
                    variant: "single-routine",
                    userName: auth.status === "authenticated" ? auth.user.name : null,
                    userImage: auth.status === "authenticated" ? auth.user.image : null,
                    xp: 0,
                    routineName: routine.title,
                    routineIcon: routine.icon,
                    routineColor: routine.color,
                    routineStreak: routine.currentStreak,
                  },
                });
              }}
              isPending={pendingId === r.id}
              index={i}
            />
          ))}
        </div>
      )}

      <AddRoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} atLimit={atLimit} />

      {/* Share Card Modal */}
      {shareModal.props && (
        <ShareCardModal
          open={shareModal.open}
          onClose={() => setShareModal({ open: false, props: null })}
          cardProps={shareModal.props}
        />
      )}

      {/* Badge Celebration Overlay */}
      <BadgeCelebration
        badgeName={celebrationBadge}
        onDone={() => setCelebrationBadge(null)}
      />

      {/* Level Up Modal */}
      {levelUpModal && (
        <LevelUpModal
          open={!!levelUpModal}
          level={levelUpModal.level}
          rank={levelUpModal.rank}
          rankColor={levelUpModal.rankColor}
          onClose={() => setLevelUpModal(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("dashboard.routineList");
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-4">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-2xl">
        ✓
      </div>
      <div>
        <p className="font-medium">{t("emptyTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("emptyDescription")}
        </p>
      </div>
      <Button onClick={onAdd}>{t("emptyAdd")}</Button>
    </div>
  );
}
