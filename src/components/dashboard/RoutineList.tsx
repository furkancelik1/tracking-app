"use client";

import {
  useOptimistic,
  useTransition,
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
import {
  XP_PER_COMPLETION,
  XP_ALL_DONE_BONUS,
  COINS_PER_COMPLETION,
  COINS_ALL_DONE_BONUS,
} from "@/constants/rewards";
import {
  fireAllDoneConfetti,
  fireLevelUpConfetti,
  hapticSuccess,
} from "@/lib/celebrations";
import { calculateLevel, didLevelUp } from "@/lib/level";
import { fireDuelToast } from "@/lib/duel-notifications";
import { ShareCardModal } from "@/components/dashboard/ShareCardModal";
import type { ShareCardProps } from "@/components/dashboard/ShareCard";
import { BadgeCelebration } from "@/components/dashboard/BadgeCelebration";
import { LevelUpModal } from "@/components/dashboard/LevelUpModal";
import {
  enqueuePendingRoutineLog,
  removePendingByRoutineId,
} from "@/lib/offline/pending-routine-logs-idb";
import {
  flushPendingRoutineLogs,
  subscribeRoutineSync,
} from "@/lib/offline/routine-sync-manager";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { RoutineCompletionFlash } from "@/components/dashboard/RoutineCompletionFlash";

const ALL = "__all__";
const FREE_ROUTINE_LIMIT = 3;

type OptimisticAction =
  | { type: "toggle"; id: string; completed: boolean; note?: string }
  | { type: "delete"; id: string };

function todayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isCompletedToday(r: RoutineWithMeta, isoToday: string): boolean {
  return r.logs.some((l) => l.completedAt >= isoToday);
}

function optimisticReducer(
  state: RoutineWithMeta[],
  action: OptimisticAction
): RoutineWithMeta[] {
  const isoToday = todayISO();

  switch (action.type) {
    case "toggle":
      return state.map((r) => {
        if (r.id !== action.id) return r;
        if (action.completed) {
          return {
            ...r,
            logs: r.logs.filter((l) => l.completedAt < isoToday),
            currentStreak: Math.max(0, r.currentStreak - 1),
          };
        }
        return {
          ...r,
          logs: [
            { id: "_opt", completedAt: isoToday, note: action.note ?? null },
            ...r.logs,
          ],
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

type LevelUpInfo = { level: number; rank: string; rankColor: string };
type ShareModalState = { open: boolean; props: ShareCardProps | null };

type Props = { initialRoutines: RoutineWithMeta[] };

export function RoutineList({ initialRoutines }: Props) {
  const t = useTranslations("dashboard.routineList");
  const tc = useTranslations("common");
  const td = useTranslations("duel");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState<ShareModalState>({
    open: false,
    props: null,
  });
  const [celebrationBadge, setCelebrationBadge] = useState<string | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<LevelUpInfo | null>(null);
  const [flashLabel, setFlashLabel] = useState<string | null>(null);

  const allDoneFiredRef = useRef(false);
  const { playComplete } = useSoundEffect();

  const { data: serverRoutines = [], isLoading } = useRoutines(initialRoutines);
  const { invalidate } = useRoutineQueryClient();

  const [optimisticRoutines, dispatch] = useOptimistic(
    serverRoutines,
    optimisticReducer
  );

  const auth = useAuth();
  const isPro = auth.status === "authenticated" && auth.isPro;

  const [, startTransition] = useTransition();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(optimisticRoutines.map((r) => r.category))
    ).sort();
    return [ALL, ...cats];
  }, [optimisticRoutines]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set(ALL, optimisticRoutines.length);
    for (const r of optimisticRoutines) {
      map.set(r.category, (map.get(r.category) ?? 0) + 1);
    }
    return map;
  }, [optimisticRoutines]);

  const filtered = useMemo(
    () =>
      activeCategory === ALL
        ? optimisticRoutines
        : optimisticRoutines.filter((r) => r.category === activeCategory),
    [optimisticRoutines, activeCategory]
  );

  // Sync offline queue on mount and when connectivity returns
  useEffect(() => {
    const run = async () => {
      if (typeof navigator === "undefined" || !navigator.onLine) return;
      const res = await flushPendingRoutineLogs();
      if (res.synced > 0 || res.skipped > 0) {
        invalidate();
        if (res.synced > 0) {
          toast.success(
            tc("syncedOfflineCompletions", { count: res.synced }),
            { duration: 3500 }
          );
        }
      }
    };
    void run();
    return subscribeRoutineSync(run);
  }, [invalidate, tc]);

  // Auto-clear flash label
  useEffect(() => {
    if (!flashLabel) return;
    const id = window.setTimeout(() => setFlashLabel(null), 1100);
    return () => window.clearTimeout(id);
  }, [flashLabel]);

  // Reset all-done celebration flag when server data no longer reflects it
  // (e.g. cross-device undo, day rollover). Writes to ref only — no re-render.
  useEffect(() => {
    const isoToday = todayISO();
    const allDone =
      serverRoutines.length > 0 &&
      serverRoutines.every((r) => isCompletedToday(r, isoToday));
    if (!allDone) allDoneFiredRef.current = false;
  }, [serverRoutines]);

  const handleToggle = useCallback(
    (id: string, completed: boolean, note?: string) => {
      setPendingId(id);
      startTransition(async () => {
        dispatch({ type: "toggle", id, completed, note });

        if (!completed) {
          const isoToday = todayISO();
          const willAllBeDone =
            serverRoutines.length > 0 &&
            serverRoutines.every((r) =>
              r.id === id ? true : isCompletedToday(r, isoToday)
            );

          const optimisticXp =
            XP_PER_COMPLETION + (willAllBeDone ? XP_ALL_DONE_BONUS : 0);
          const optimisticCoins =
            COINS_PER_COMPLETION + (willAllBeDone ? COINS_ALL_DONE_BONUS : 0);
          window.dispatchEvent(
            new CustomEvent("coins-optimistic", {
              detail: {
                xpGain: optimisticXp,
                coinGain: optimisticCoins,
                routineId: id,
              },
            })
          );

          if (willAllBeDone && !allDoneFiredRef.current) {
            allDoneFiredRef.current = true;
            hapticSuccess();
            window.setTimeout(() => {
              fireAllDoneConfetti();
              toast.success(t("allDone"), { duration: 4000 });
            }, 400);
          }
          window.dispatchEvent(new CustomEvent("coins-updated"));
        } else {
          allDoneFiredRef.current = false;
        }

        try {
          if (completed) {
            const removedFromQueue = await removePendingByRoutineId(id);
            if (!removedFromQueue) await undoRoutineAction(id);
            toast.success(t("undone"));
            window.dispatchEvent(new CustomEvent("coins-updated"));
            return;
          }

          const offline =
            typeof navigator !== "undefined" && !navigator.onLine;
          if (offline) {
            await enqueuePendingRoutineLog({ routineId: id, note });
            playComplete();
            setFlashLabel("DONE");
            toast.success(tc("queuedOfflineCompletion"), { duration: 4000 });
            window.dispatchEvent(new CustomEvent("coins-updated"));
            return;
          }

          const result = await completeRoutineAction(id, note);
          playComplete();
          const leveled =
            !!result && didLevelUp(result.totalXp - result.xpGain, result.totalXp);

          setFlashLabel(leveled ? "CHAMPION" : "DONE");
          toast.success(t("completed"));
          window.dispatchEvent(new CustomEvent("coins-updated"));

          if (result?.duelScoreUpdated && result.duelOpponentName) {
            fireDuelToast("score", {
              title: td("notifOpponentScored"),
              description: td("notifOpponentScoredDesc", {
                name: result.duelOpponentName,
              }),
              actionLabel: td("notifViewDuel"),
              onAction: () =>
                window.dispatchEvent(new CustomEvent("navigate-social")),
            });
          }

          const firstBadge = result?.newBadges?.[0];
          if (firstBadge) {
            window.setTimeout(() => setCelebrationBadge(firstBadge), 1800);
          }

          if (leveled && result) {
            const { level, rank, rankColor } = calculateLevel(result.totalXp);
            window.setTimeout(() => {
              fireLevelUpConfetti();
              hapticSuccess();
              setLevelUpModal({ level, rank, rankColor });
            }, 600);
          }
        } catch (err) {
          window.dispatchEvent(
            new CustomEvent("coins-rollback", { detail: { routineId: id } })
          );
          toast.error(err instanceof Error ? err.message : t("actionFailed"));
          allDoneFiredRef.current = false;
        } finally {
          setPendingId(null);
          invalidate();
        }
      });
    },
    [dispatch, invalidate, playComplete, serverRoutines, t, tc, td]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
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
    },
    [dispatch, invalidate, t]
  );

  const handleShare = useCallback(
    (routine: RoutineWithMeta) => {
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
    },
    [auth]
  );

  const closeShareModal = useCallback(
    () => setShareModal({ open: false, props: null }),
    []
  );

  const openAddDialog = useCallback(() => setDialogOpen(true), []);

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="h-6 w-48 bg-muted rounded-md" />
            <div className="mt-1 h-4 w-64 bg-muted rounded-md" />
          </div>
          <div className="w-full sm:w-auto">
            <div className="h-10 w-32 bg-muted rounded-md ml-auto" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const atLimit = !isPro && serverRoutines.length >= FREE_ROUTINE_LIMIT;
  const getCategoryLabel = (cat: string) =>
    cat === ALL ? t("allCategories") : cat;

  return (
    <div className="space-y-6">
      <RoutineCompletionFlash label={flashLabel} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          className="w-full shrink-0 sm:w-auto"
          onClick={openAddDialog}
          disabled={atLimit}
          title={
            atLimit
              ? t("limitWarning", {
                  count: FREE_ROUTINE_LIMIT,
                  max: FREE_ROUTINE_LIMIT,
                })
              : undefined
          }
        >
          {t("addRoutine")}
        </Button>
      </div>

      {atLimit && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#D6FF00]/25 bg-[#D6FF00]/8 px-4 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(214,255,0,0.06)]">
          <p className="text-zinc-200">
            <span className="font-black text-[#D6FF00]">
              {FREE_ROUTINE_LIMIT}/{FREE_ROUTINE_LIMIT}
            </span>{" "}
            —{" "}
            {t("limitWarning", {
              count: FREE_ROUTINE_LIMIT,
              max: FREE_ROUTINE_LIMIT,
            })}
          </p>
          <Button
            size="sm"
            className="bg-[#D6FF00] font-semibold text-black hover:bg-[#c8f000]"
            asChild
          >
            <a href="/settings">{t("upgradeCta")}</a>
          </Button>
        </div>
      )}

      {optimisticRoutines.length > 0 && (
        <RoutineProgressBar routines={optimisticRoutines} />
      )}

      {categories.length > 2 && (
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {getCategoryLabel(cat)}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    isActive
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {categoryCounts.get(cat) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        optimisticRoutines.length === 0 ? (
          <EmptyState onAdd={openAddDialog} />
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
              onShare={handleShare}
              isPending={pendingId === r.id}
              index={i}
            />
          ))}
        </div>
      )}

      <AddRoutineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        atLimit={atLimit}
        routines={optimisticRoutines}
      />

      {shareModal.props && (
        <ShareCardModal
          open={shareModal.open}
          onClose={closeShareModal}
          cardProps={shareModal.props}
        />
      )}

      <BadgeCelebration
        badgeName={celebrationBadge}
        onDone={() => setCelebrationBadge(null)}
      />

      {levelUpModal && (
        <LevelUpModal
          open
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
