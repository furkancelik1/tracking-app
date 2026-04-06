import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import type { RoutineLog } from "@prisma/client";

const createLogSchema = z.object({
  note: z.string().max(500).optional(),
  completedAt: z.string().datetime().optional(), // ISO string; yoksa now()
});

// POST /api/v1/routines/[id]/logs — rutini tamamla
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id as string;
  const routineId = params.id;

  // Rutin bu kullanıcıya ait mi ve aktif mi?
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId, isActive: true },
    select: { id: true, frequency: true },
  });

  if (!routine) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Rutin bulunamadı", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Aynı periyotta zaten tamamlanmış mı?
  const periodStart = getPeriodStart(routine.frequency);
  const alreadyLogged = await prisma.routineLog.findFirst({
    where: { routineId, userId, completedAt: { gte: periodStart } },
    select: { id: true },
  });

  if (alreadyLogged) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: "Bu rutin bu periyot için zaten tamamlandı",
        code: "ALREADY_COMPLETED",
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const log = await prisma.routineLog.create({
    data: {
      routineId,
      userId,
      note: parsed.data.note ?? null,
      completedAt: parsed.data.completedAt
        ? new Date(parsed.data.completedAt)
        : new Date(),
    },
  });

  return NextResponse.json<ApiResponse<RoutineLog>>(
    { success: true, data: log },
    { status: 201 }
  );
}

// DELETE /api/v1/routines/[id]/logs — tamamlamayı geri al (bugünkü log)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id as string;
  const routineId = params.id;

  const periodStart = await prisma.routine
    .findFirst({ where: { id: routineId, userId }, select: { frequency: true } })
    .then((r) => (r ? getPeriodStart(r.frequency) : null));

  if (!periodStart) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Rutin bulunamadı", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const log = await prisma.routineLog.findFirst({
    where: { routineId, userId, completedAt: { gte: periodStart } },
    select: { id: true },
  });

  if (!log) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Tamamlanma kaydı bulunamadı", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.routineLog.delete({ where: { id: log.id } });

  return NextResponse.json<ApiResponse<null>>({ success: true, data: null });
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// ----------------------------------------------------------------
// Yardımcı: frequency'e göre mevcut periyodun başlangıç zamanını döner
// ----------------------------------------------------------------
function getPeriodStart(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY": {
      // ISO haftasının Pazartesi 00:00 UTC'si
      const day = now.getUTCDay(); // 0 = Pazar
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);
      return monday;
    }
    case "MONTHLY": {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    case "DAILY":
    default: {
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      return start;
    }
  }
}
