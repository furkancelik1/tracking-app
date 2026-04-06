import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { basketActionSchema } from "@/lib/validations/basket";
import {
  removeFromBasket,
  activateBasketItem,
  completeBasketItem,
  resetBasketItem,
} from "@/services/basket.service";
import type { ApiResponse, BasketItemWithCard } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/v1/basket/[id] — activate | complete | reset
export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = basketActionSchema.safeParse(body);
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

  const userId = session.user.id;

  try {
    let item: BasketItemWithCard;
    switch (parsed.data.action) {
      case "activate":
        item = await activateBasketItem(userId, id);
        break;
      case "complete":
        item = await completeBasketItem(userId, id);
        break;
      case "reset":
        item = await resetBasketItem(userId, id);
        break;
    }
    return NextResponse.json<ApiResponse<BasketItemWithCard>>({
      success: true,
      data: item,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "NOT_FOUND") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Basket item not found.", code: msg },
        { status: 404 }
      );
    }
    if (msg === "ALREADY_COMPLETED") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Item is already completed.", code: msg },
        { status: 409 }
      );
    }
    throw err;
  }
}

// DELETE /api/v1/basket/[id] — remove from basket
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    await removeFromBasket(session.user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Basket item not found.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
