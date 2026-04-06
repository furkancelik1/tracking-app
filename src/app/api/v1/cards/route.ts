import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cardSchema } from "@/lib/validations/card";
import { revalidateTag } from "next/cache";
import { broadcastCatalogueUpdate } from "@/services/realtime.service";
import type { ApiResponse, PaginatedResponse } from "@/types";
import type { Card } from "@prisma/client";

// GET /api/v1/cards — public catalogue listing with optional filters
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where = {
    ...(activeOnly && { isActive: true }),
    ...(category && { category }),
  };

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        affiliateUrl: true,
        resetType: true,
        duration: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        // Omit `content` (heavy markdown) from list view — fetch on demand
        _count: { select: { basketItems: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.card.count({ where }),
  ]);

  const body: ApiResponse<PaginatedResponse<(typeof cards)[0]>> = {
    success: true,
    data: { data: cards, total, page, pageSize },
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}

// POST /api/v1/cards — admin only
export async function POST(req: Request) {
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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid JSON body", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = cardSchema.safeParse(body);
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
  const card = await prisma.card.create({
    data: {
      ...rest,
      affiliateUrl: affiliateUrl || null,
    },
  });

  await revalidateTag("cards", {});
  void broadcastCatalogueUpdate("created", card.id);

  return NextResponse.json<ApiResponse<Card>>(
    { success: true, data: card },
    { status: 201 }
  );
}

// OPTIONS — CORS preflight (headers already set in next.config.ts)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
