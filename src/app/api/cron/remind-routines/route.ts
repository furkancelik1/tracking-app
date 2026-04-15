import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    CRON_SECRET &&
    authHeader !== `Bearer ${CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayUTC = new Date(now);
  todayUTC.setUTCHours(0, 0, 0, 0);

  // Find all users who have active routines not yet completed today
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  let notified = 0;

  for (const user of users) {
    const activeRoutines = await prisma.routine.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        logs: {
          where: { completedAt: { gte: todayUTC } },
          select: { id: true },
          take: 1,
        },
      },
    });

    const incomplete = activeRoutines.filter((r) => r.logs.length === 0);
    if (incomplete.length === 0) continue;

    // Push notification sending can be wired here when ready
    notified++;
  }

  return NextResponse.json({ ok: true, notified, at: now.toISOString() });
}
