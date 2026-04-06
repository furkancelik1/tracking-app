import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { RoutineLog } from "@prisma/client";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import { prisma } from "@/lib/prisma";

const createLogSchema = z.object({
  note: z.string().max(500).optional(),
  completedAt: z.string().datetime().optional(),
});

// POST /api/v1/routines/[id]/logs — rutini tamamla + streak güncelle
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routineId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;

    // Rutin bu kullanıcıya ait mi ve aktif mi?
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId, isActive: true },
      select: { id: true, frequency: true, currentStreak: true, longestStreak: true, lastCompletedAt: true },
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

    // Body parse — note opsiyonel
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

    // completedAt: periyodun başına sabitliyoruz → tekil log garantisi
    const completedAt = parsed.data.completedAt
      ? new Date(parsed.data.completedAt)
      : periodStart;

    // ── Streak hesaplama ──────────────────────────────────────────────────────
    const newStreak = calcNewStreak(
      routine.frequency,
      routine.currentStreak,
      routine.lastCompletedAt
    );
    const newLongest = Math.max(newStreak, routine.longestStreak);

    // Log oluştur + Routine streak'ini atomik güncelle
    const [log] = await prisma.$transaction([
      prisma.routineLog.create({
        data: { routineId, userId, note: parsed.data.note ?? null, completedAt },
      }),
      prisma.routine.update({
        where: { id: routineId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastCompletedAt: completedAt,
        },
      }),
    ]);

    return NextResponse.json<ApiResponse<RoutineLog>>(
      { success: true, data: log },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/v1/routines/[id]/logs] Hata:", err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: err instanceof Error ? err.message : "Sunucu hatası",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/routines/[id]/logs — tamamlamayı geri al + streak sıfırla
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routineId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;

    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
      select: { frequency: true, currentStreak: true },
    });

    if (!routine) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Rutin bulunamadı", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const periodStart = getPeriodStart(routine.frequency);

    const log = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: periodStart } },
      select: { id: true },
    });

    if (!log) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: "Bu periyotta tamamlanma kaydı bulunamadı",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Önceki periyottaki log varsa streak'i 1 geri al, yoksa 0'a düşür
    const prevPeriodStart = getPrevPeriodStart(routine.frequency);
    const prevLog = await prisma.routineLog.findFirst({
      where: { routineId, userId, completedAt: { gte: prevPeriodStart, lt: periodStart } },
      select: { id: true },
    });

    const restoredStreak = prevLog
      ? Math.max(0, routine.currentStreak - 1)
      : 0;

    await prisma.$transaction([
      prisma.routineLog.delete({ where: { id: log.id } }),
      prisma.routine.update({
        where: { id: routineId },
        data: {
          currentStreak: restoredStreak,
          lastCompletedAt: prevLog ? prevPeriodStart : null,
        },
      }),
    ]);

    return NextResponse.json<ApiResponse<null>>({ success: true, data: null });
  } catch (err) {
    console.error("[DELETE /api/v1/routines/[id]/logs] Hata:", err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: err instanceof Error ? err.message : "Sunucu hatası",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// ────────────────────────────────────────────────────────────────────────────
// Streak hesaplama
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mevcut periyodun başını döner (UTC).
 */
function getPeriodStart(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);
      return monday;
    }
    case "MONTHLY":
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    case "DAILY":
    default: {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
  }
}

/**
 * Bir önceki periyodun başını döner.
 * DELETE sırasında streak'i geri almak için kullanılır.
 */
function getPrevPeriodStart(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY": {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diff - 7);
      monday.setUTCHours(0, 0, 0, 0);
      return monday;
    }
    case "MONTHLY": {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - 1);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
    case "DAILY":
    default: {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - 1);
      return d;
    }
  }
}

/**
 * Yeni streak değerini hesaplar.
 *
 * - lastCompletedAt yoksa (ilk tamamlama) → 1
 * - lastCompletedAt bir önceki periyotta ise → streak + 1 (seri devam ediyor)
 * - lastCompletedAt daha eski ise → 1 (seri kırıldı, yeniden başlıyor)
 */
function calcNewStreak(
  frequency: string,
  currentStreak: number,
  lastCompletedAt: Date | null
): number {
  if (!lastCompletedAt) return 1;

  const prevStart = getPrevPeriodStart(frequency);
  const currentStart = getPeriodStart(frequency);

  const last = new Date(lastCompletedAt);

  // Önceki periyot aralığında mı? [prevStart, currentStart)
  if (last >= prevStart && last < currentStart) {
    return currentStreak + 1;
  }

  // Daha eski → seri kırıldı
  return 1;
}
