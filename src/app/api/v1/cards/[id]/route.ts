import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cardUpdateSchema } from "@/lib/validations/card";
import { revalidateTag } from "next/cache";
import { broadcastCatalogueUpdate } from "@/services/realtime.service";
import type { ApiResponse } from "@/types";
import type { Card } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/v1/cards/[id] — full card including content
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Card not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResponse<Card>>({ success: true, data: card });
}

// PUT /api/v1/cards/[id] — admin only, partial update
export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Card not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid JSON body", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = cardUpdateSchema.safeParse(body);
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

  const { affiliateUrl, ...rest } = parsed.data;
  const updated = await prisma.card.update({
    where: { id },
    data: {
      ...rest,
      ...(affiliateUrl !== undefined && { affiliateUrl: affiliateUrl || null }),
    },
  });

  await revalidateTag("cards", {});
  void broadcastCatalogueUpdate("updated", id);

  return NextResponse.json<ApiResponse<Card>>({ success: true, data: updated });
}

// DELETE /api/v1/cards/[id] — admin only
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Card not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.card.delete({ where: { id } });
  await revalidateTag("cards", {});
  void broadcastCatalogueUpdate("deleted", id);

  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
