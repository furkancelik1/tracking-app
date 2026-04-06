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
  sortOrder: z.number().int().min(0).optional(),
});

// PATCH /api/v1/routines/[id] — rutin güncelle
export async function PATCH(
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

  const routine = await prisma.routine.findFirst({
    where: { id: params.id, userId, isActive: true },
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

  const updated = await prisma.routine.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json<ApiResponse<Routine>>({ success: true, data: updated });
}

// DELETE /api/v1/routines/[id] — soft-delete (isActive: false)
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

  const routine = await prisma.routine.findFirst({
    where: { id: params.id, userId, isActive: true },
    select: { id: true },
  });

  if (!routine) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Rutin bulunamadı", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.routine.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json<ApiResponse<null>>(
    { success: true, data: null },
    { status: 200 }
  );
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
