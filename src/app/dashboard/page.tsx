import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { RoutineList } from "@/components/dashboard/RoutineList";
import type { RoutineWithMeta } from "@/hooks/useRoutines";

export const metadata = { title: "Rutinlerim" };

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const raw = await prisma.routine.findMany({
    where: { userId, isActive: true },
    include: {
      logs: {
        where: { completedAt: { gte: todayStart } },
        select: { id: true, completedAt: true },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
      _count: { select: { logs: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // Date'leri JSON-serializable string'e dönüştür
  const routines: RoutineWithMeta[] = raw.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    logs: r.logs.map((l) => ({
      id: l.id,
      completedAt: l.completedAt.toISOString(),
    })),
  }));

  return (
    <>
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <RoutineList initialRoutines={routines} />
      </main>
    </>
  );
}
