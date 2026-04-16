import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { RoutineList } from "@/components/dashboard/RoutineList";
import { StreakAlert } from "@/components/dashboard/StreakAlert";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { getSubscriptionTier } from "@/lib/stripe";
import { LevelProgressBar } from "@/components/dashboard/LevelProgressBar";
import { AICoachButton } from "@/components/dashboard/AICoachButton";
import { BottomNav } from "@/components/shared/BottomNav";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MottoDisplay } from "@/components/dashboard/MottoDisplay";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";

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
      prisma.routine
        .findMany({
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
        })
        .catch(() => []),
      prisma.user
        .findUnique({ where: { id: userId }, select: { xp: true } })
        .catch(() => null),
    ]);

    const dailyRoutines = (raw ?? []).filter(
      (r) => (r.frequencyType ?? "DAILY") === "DAILY"
    );
    const completedDaily = dailyRoutines.filter((routine) =>
      (routine.logs ?? []).some((log) => {
        const completedAt = log.completedAt;
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

    const routines: RoutineWithMeta[] = (raw ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? "",
      description: r.description ?? null,
      frequency: r.frequency ?? "DAILY",
      frequencyType: r.frequencyType ?? "DAILY",
      weeklyTarget: r.weeklyTarget ?? 1,
      specificDays: r.specificDays ?? [],
      stackParentId: r.stackParentId ?? null,
      isActive: r.isActive ?? true,
      sortOrder: r.sortOrder ?? 0,
      category: r.category ?? "Genel",
      color: r.color ?? "#3b82f6",
      icon: r.icon ?? "Check",
      currentStreak: r.currentStreak ?? 0,
      longestStreak: r.longestStreak ?? 0,
      lastCompletedAt: r.lastCompletedAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
      logs: (r.logs ?? []).map((l) => ({
        id: l.id,
        completedAt: l.completedAt?.toISOString() ?? new Date().toISOString(),
        note: l.note ?? null,
      })),
      _count: r._count ?? { logs: 0 },
    }));

    const isEmpty = (raw?.length ?? 0) === 0;

    // ── Empty state ─────────────────────────────────────────────────────
    if (isEmpty) {
      return (
        <>
          <DashboardNav />
          <main className="mx-auto max-w-3xl px-6 py-12">
            <DashboardEmptyState />
          </main>
        </>
      );
    }

    return (
      <>
        <DashboardNav />
        <main className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12 space-y-10 pb-24 md:pb-12">
          {/* ── Daily motto — whisper at the top ── */}
          <MottoDisplay />

          {/* ── Gauge — hero focus element ── */}
          <DashboardCharts gaugeData={gaugeData} />

          {/* ── Level bar + AI coach button ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <LevelProgressBar xp={userXp} />
            </div>
            <AICoachButton xp={userXp} initialInsight={null} isPro={isPro} />
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
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">{title ?? "Error"}</h2>
          <p className="text-muted-foreground max-w-md">{message}</p>
          <a
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {retry ?? "Retry"}
          </a>
        </div>
      </main>
    </>
  );
}
