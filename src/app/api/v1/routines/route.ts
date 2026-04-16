import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionTier } from "@/lib/stripe";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import type { Routine, RoutineFrequency } from "@prisma/client";

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

const createRoutineSchema = z.object({
  title: z.string().min(1, "BaÅŸlÄ±k zorunludur").max(100),
  description: z.string().max(500).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
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

    const routines = await prisma.routine.findMany({
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

    const routine = await prisma.routine.create({
      data: {
        userId,
        ...parsed.data,
        frequency: parsed.data.frequency as RoutineFrequency,
      },
    });

    return NextResponse.json<ApiResponse<Routine>>(
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
