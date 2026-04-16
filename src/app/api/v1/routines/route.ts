import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionTier } from "@/lib/stripe";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import type { RoutineFrequency } from "@prisma/client";

const FREE_ROUTINE_LIMIT = 3;
const isProd = process.env.NODE_ENV === "production";

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause,
    };
  }
  return { value: err };
}

function isMissingColumnError(err: unknown): boolean {
  return err instanceof Error && /column .* does not exist/i.test(err.message);
}

function toFrequencyType(frequency: RoutineFrequency): "DAILY" | "WEEKLY" {
  return frequency === "DAILY" ? "DAILY" : "WEEKLY";
}

const createRoutineSchema = z.object({
  title: z.string().min(1, "BaÅŸlÄ±k zorunludur").max(100),
  description: z.string().max(500).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  frequencyType: z.enum(["DAILY", "WEEKLY", "SPECIFIC_DAYS"]).optional(),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  stackParentId: z.string().cuid().nullable().optional(),
  category: z.string().max(50).default("Genel"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "GeÃ§ersiz renk").default("#3b82f6"),
  icon: z.string().max(50).default("CheckCircle"),
  sortOrder: z.number().int().min(0).default(0),
});

// GET /api/v1/routines â€” kullanÄ±cÄ±nÄ±n rutinlerini listele
export async function GET() {
  let userId: string | null = null;
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    userId = session.user.id;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    let routines: Array<any>;

    try {
      routines = await prisma.routine.findMany({
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
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;

      // Fallback for environments where latest migration is not applied yet.
      const legacyRoutines = await prisma.routine.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          userId: true,
          title: true,
          description: true,
          icon: true,
          category: true,
          color: true,
          frequency: true,
          isActive: true,
          sortOrder: true,
          currentStreak: true,
          longestStreak: true,
          createdAt: true,
          updatedAt: true,
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

      routines = legacyRoutines.map((routine: any) => ({
        ...routine,
        frequencyType: toFrequencyType(routine.frequency),
        weeklyTarget: routine.frequency === "DAILY" ? 1 : 3,
        daysOfWeek: [],
        stackParentId: null,
      }));
    }

    return NextResponse.json<ApiResponse<typeof routines>>({
      success: true,
      data: routines,
    });
  } catch (err) {
    console.error("[GET /api/v1/routines] Internal error", {
      route: "/api/v1/routines",
      method: "GET",
      userId,
      error: serializeError(err),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: isProd ? "Sunucu hatası" : err instanceof Error ? err.message : "Sunucu hatası",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/routines â€” yeni rutin oluÅŸtur
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const subscriptionTier = getSubscriptionTier(session.user.subscriptionTier);

    // FREE tier limiti kontrolÃ¼
    if (subscriptionTier === "FREE") {
      const count = await prisma.routine.count({
        where: { userId, isActive: true },
      });
      if (count >= FREE_ROUTINE_LIMIT) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: `Ãœcretsiz planda en fazla ${FREE_ROUTINE_LIMIT} rutin oluÅŸturabilirsiniz. PRO'ya geÃ§erek sÄ±nÄ±rsÄ±z rutin ekleyin.`,
            code: "PLAN_LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "GeÃ§ersiz JSON gÃ¶vdesi", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const parsed = createRoutineSchema.safeParse(body);
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

    const resolvedFrequencyType =
      parsed.data.frequencyType ??
      (parsed.data.frequency === "WEEKLY" || parsed.data.frequency === "MONTHLY"
        ? "WEEKLY"
        : "DAILY");
    const resolvedFrequency =
      parsed.data.frequency ??
      (resolvedFrequencyType === "DAILY" ? "DAILY" : "WEEKLY");
    const resolvedDaysOfWeek = Array.from(new Set(parsed.data.daysOfWeek ?? [])).sort();
    const resolvedWeeklyTarget =
      resolvedFrequencyType === "WEEKLY" ? parsed.data.weeklyTarget ?? 3 : 1;

    if (resolvedFrequencyType === "SPECIFIC_DAYS" && resolvedDaysOfWeek.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: "Belirli günler seçimi için en az bir gün belirtmelisiniz.",
          code: "VALIDATION_ERROR",
        },
        { status: 422 }
      );
    }

    if (parsed.data.stackParentId) {
      const parent = await prisma.routine.findFirst({
        where: {
          id: parsed.data.stackParentId,
          userId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: "BaÄŸlanmak istenen ana alÄ±ÅŸkanlÄ±k bulunamadÄ±.",
            code: "VALIDATION_ERROR",
          },
          { status: 422 }
        );
      }
    }

    let routine: any;
    try {
      routine = await prisma.routine.create({
        data: {
          userId,
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          color: parsed.data.color,
          icon: parsed.data.icon,
          sortOrder: parsed.data.sortOrder,
          frequency: resolvedFrequency as RoutineFrequency,
          frequencyType: resolvedFrequencyType,
          weeklyTarget: resolvedWeeklyTarget,
          daysOfWeek: resolvedFrequencyType === "SPECIFIC_DAYS" ? resolvedDaysOfWeek : [],
          stackParentId: parsed.data.stackParentId ?? null,
        } as any,
      });
    } catch (err) {
      if (!isMissingColumnError(err)) throw err;

      const legacyRoutine = await prisma.routine.create({
        data: {
          userId,
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          color: parsed.data.color,
          icon: parsed.data.icon,
          sortOrder: parsed.data.sortOrder,
          frequency: resolvedFrequency as RoutineFrequency,
        },
      });

      routine = {
        ...legacyRoutine,
        frequencyType: toFrequencyType(legacyRoutine.frequency),
        weeklyTarget: legacyRoutine.frequency === "DAILY" ? 1 : 3,
        daysOfWeek: [],
        stackParentId: null,
      };
    }

    return NextResponse.json<ApiResponse<typeof routine>>(
      { success: true, data: routine },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/v1/routines] Hata:", err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: err instanceof Error ? err.message : "Sunucu hatasÄ±",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// OPTIONS â€” CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
