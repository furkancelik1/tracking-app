import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ApiResponse } from "@/types";
import type { Routine } from "@prisma/client";

const updateRoutineSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  category: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  intensity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  imageUrl: z.union([z.string().url().max(2048), z.literal("")]).nullable().optional(),
  isGuided: z.boolean().optional(),
  coachTip: z.string().max(2000).optional().nullable(),
});

// PATCH /api/v1/routines/[id] — rutin güncelle
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;

    const routine = await prisma.routine.findFirst({
      where: { id, userId, isActive: true },
      select: { id: true },
    });

    if (!routine) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Rutin bulunamadı", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Geçersiz JSON gövdesi", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const parsed = updateRoutineSchema.safeParse(body);
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

    const data = { ...parsed.data } as Record<string, unknown>;
    if (typeof data.imageUrl === "string" && data.imageUrl === "") data.imageUrl = null;

    const updated = await prisma.routine.update({
      where: { id },
      data: data as any,
    });

    return NextResponse.json<ApiResponse<Routine>>({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/routines/[id]] Hata:", err);
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

// DELETE /api/v1/routines/[id] — soft-delete (isActive: false)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string;

    const routine = await prisma.routine.findFirst({
      where: { id, userId, isActive: true },
      select: { id: true },
    });

    if (!routine) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Rutin bulunamadı", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.routine.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json<ApiResponse<null>>({ success: true, data: null });
  } catch (err) {
    console.error("[DELETE /api/v1/routines/[id]] Hata:", err);
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
