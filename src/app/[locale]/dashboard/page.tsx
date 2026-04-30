import React from "react";
import dynamic from "next/dynamic";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakAlert } from "@/components/dashboard/StreakAlert";
import { getSubscriptionTier } from "@/lib/stripe";
import { LevelProgressBar } from "@/components/dashboard/LevelProgressBar";
import { AICoachButton } from "@/components/dashboard/AICoachButton";
import { BottomNav } from "@/components/shared/BottomNav";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MottoDisplay } from "@/components/dashboard/MottoDisplay";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";

const RoutineList = dynamic(
  () =>
    import("@/components/dashboard/RoutineList").then((mod) => mod.RoutineList),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    ),
  }
);

function isMissingColumnError(err: unknown): boolean {
  return err instanceof Error && /column .* does not exist/i.test(err.message);
}

function toIsoOrNow(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");

  /* ── Auth ── */
  let session;
  try {
    session = await requireAuth();
  } catch {
    return null;
  }

  const userId = (session.user as any)?.id as string | undefined;
  if (!userId) return <DashboardError title={t("errorTitle")} message={t("sessionError")} retry={tc("retry")} />;

  const subscriptionTier = getSubscriptionTier(
    (session.user as any)?.subscriptionTier
  );
  const isPro = subscriptionTier === "PRO";

  /* ── Data fetching ────────────────────────────────────────────────────── */
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const [raw, userXpData] = await Promise.all([
      (async () => {
        try {
          return await prisma.routine.findMany({
            where: { userId, isActive: true },
            include: {
              logs: {
                where: { completedAt: { gte: thirtyDaysAgo } },
                select: { id: true, completedAt: true, note: true },
                orderBy: { completedAt: "desc" },
                take: 30,
              },
              _count: { select: { logs: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          });
        } catch (err) {
          if (!isMissingColumnError(err)) {
            console.error("[DashboardPage] routine query failed:", err);
            return [];
          }

          // Legacy fallback: production DB migration'ı henüz uygulanmadıysa.
          const legacy = await prisma.routine.findMany({
            where: { userId, isActive: true },
            select: {
              id: true,
              title: true,
              description: true,
              frequency: true,
              isActive: true,
              sortOrder: true,
              category: true,
              color: true,
              icon: true,
              currentStreak: true,
              longestStreak: true,
              createdAt: true,
              updatedAt: true,
              logs: {
                where: { completedAt: { gte: thirtyDaysAgo } },
                select: { id: true, completedAt: true, note: true },
                orderBy: { completedAt: "desc" },
                take: 30,
              },
              _count: { select: { logs: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          });

          return legacy.map((routine) => ({
            ...routine,
            frequencyType: routine.frequency === "DAILY" ? "DAILY" : "WEEKLY",
            weeklyTarget: routine.frequency === "DAILY" ? 1 : 3,
            daysOfWeek: [],
            stackParentId: null,
            lastCompletedAt: null,
            intensity: "MEDIUM" as const,
            estimatedMinutes: 30,
            imageUrl: null,
            isGuided: false,
            coachTip: null,
          }));
        }
      })(),
      prisma.user
        .findUnique({ where: { id: userId }, select: { xp: true } })
        .catch(() => null),
    ]);

    const normalizedRaw = (raw ?? []) as Array<any>;

    const dailyRoutines = normalizedRaw.filter(
      (r) => (r.frequencyType ?? "DAILY") === "DAILY"
    );
    const completedDaily = dailyRoutines.filter((routine) =>
      (routine.logs ?? []).some((log: { completedAt?: Date | string | null }) => {
        const rawCompletedAt = log.completedAt;
        if (!rawCompletedAt) return false;
        const completedAt =
          rawCompletedAt instanceof Date ? rawCompletedAt : new Date(rawCompletedAt);
        if (Number.isNaN(completedAt.getTime())) return false;
        return completedAt >= todayStart && completedAt < tomorrowStart;
      })
    ).length;
    const gaugeData = {
      completed: completedDaily,
      total: dailyRoutines.length,
      score:
        dailyRoutines.length > 0
          ? Math.round((completedDaily / dailyRoutines.length) * 100)
          : 0,
    };

    const userXp = userXpData?.xp ?? 0;

    const routines: RoutineWithMeta[] = normalizedRaw.map((r) => {
      try {
        const rec = r as any;
        const intensity: "LOW" | "MEDIUM" | "HIGH" =
          rec.intensity === "LOW" ||
          rec.intensity === "HIGH" ||
          rec.intensity === "MEDIUM"
            ? (rec.intensity as "LOW" | "MEDIUM" | "HIGH")
            : "MEDIUM";

        const rawMinutes = rec.estimatedMinutes as number | null | undefined;
        const estimatedMinutes =
          typeof rawMinutes === "number" && Number.isFinite(rawMinutes) && rawMinutes > 0
            ? Math.min(480, Math.max(1, Math.round(rawMinutes)))
            : 30;

        return {
          id: rec.id,
          title: rec.title ?? "",
          description: rec.description ?? null,
          frequency: rec.frequency ?? "DAILY",
          frequencyType:
            rec.frequencyType === "SPECIFIC_DAYS"
              ? "SPECIFIC_DAYS"
              : rec.frequencyType === "WEEKLY"
                ? "WEEKLY"
                : "DAILY",
          weeklyTarget: rec.weeklyTarget ?? 1,
          daysOfWeek: Array.isArray(rec.daysOfWeek) ? rec.daysOfWeek : [],
          stackParentId: rec.stackParentId ?? null,
          intensity,
          estimatedMinutes,
          imageUrl: rec.imageUrl || null,
          isGuided: rec.isGuided ?? false,
          coachTip: rec.coachTip ?? null,
          isActive: rec.isActive ?? true,
          sortOrder: rec.sortOrder ?? 0,
          category: rec.category ?? "Genel",
          color: rec.color ?? "#3b82f6",
          icon: rec.icon ?? "Check",
          currentStreak: rec.currentStreak ?? 0,
          longestStreak: rec.longestStreak ?? 0,
          lastCompletedAt: toIsoOrNull(rec.lastCompletedAt),
          createdAt: toIsoOrNow(rec.createdAt),
          updatedAt: toIsoOrNow(rec.updatedAt),
          logs: (rec.logs ?? []).map((l: any) => ({
            id: l.id,
            completedAt: toIsoOrNow(l.completedAt),
            note: l.note ?? null,
          })),
          _count: {
            logs:
              typeof rec._count?.logs === "number" && Number.isFinite(rec._count.logs)
                ? rec._count.logs
                : 0,
          },
        };
      } catch (mapError) {
        console.error("[DashboardPage] routine normalize failed", {
          userId,
          routineId: (r as { id?: string })?.id,
          routine: r,
          mapError,
        });
        return {
          id: (r as { id?: string })?.id ?? `fallback-${Math.random().toString(36).slice(2)}`,
          title: (r as { title?: string | null })?.title ?? "",
          description: null,
          frequency: "DAILY",
          frequencyType: "DAILY",
          weeklyTarget: 1,
          daysOfWeek: [],
          stackParentId: null,
          intensity: "MEDIUM",
          estimatedMinutes: 30,
          imageUrl: null,
          isGuided: false,
          coachTip: null,
          isActive: true,
          sortOrder: 0,
          category: "Genel",
          color: "#3b82f6",
          icon: "Check",
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          logs: [],
          _count: { logs: 0 },
        };
      }
    });

    return (
      <>
        <DashboardNav />
        <main className="mx-auto max-w-3xl space-y-8 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-6 sm:space-y-10 sm:px-6 md:px-8 md:pb-12 md:pt-8 lg:py-12">
          {/* ── Daily motto — whisper at the top ── */}
          <MottoDisplay />

          {/* ── Gauge — hero focus element ── */}
          <DashboardCharts gaugeData={gaugeData} />

          {/* ── Level bar + AI coach button ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <LevelProgressBar xp={userXp} />
            </div>
            <div className="flex shrink-0 justify-end sm:justify-start">
              <AICoachButton xp={userXp} initialInsight={null} isPro={isPro} />
            </div>
          </div>

          {/* ── Streak alert (subtle, only shows when at risk) ── */}
          <StreakAlert routines={routines} />

          {/* ── Routines ── */}
          <RoutineList initialRoutines={routines} />
        </main>
        <BottomNav />
      </>
    );
  } catch (error) {
    console.error("[DashboardPage] Beklenmeyen hata:", error);
    return (
      <DashboardError
        title={t("errorTitle")}
        message={t("errorMessage")}
        retry={tc("retry")}
      />
    );
  }
}

/* ── Error State bileşeni ─────────────────────────────────────────────────── */

function DashboardError({ title, message, retry }: { title?: string; message: string; retry?: string }) {
  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 md:pb-8">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center sm:min-h-[60vh]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">{title ?? "Error"}</h2>
          <p className="max-w-md text-muted-foreground">{message}</p>
          <a
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {retry ?? "Retry"}
          </a>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
