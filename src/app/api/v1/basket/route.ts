import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addToBasketSchema } from "@/lib/validations/basket";
import {
  getUserBasket,
  addCardToBasket,
  expireTimers,
} from "@/services/basket.service";
import type { ApiResponse } from "@/types";
import type { BasketItemWithCard } from "@/types";

// GET /api/v1/basket — authenticated user's basket
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // Auto-expire stale timers on every fetch
  await expireTimers(userId);

  const items = await getUserBasket(userId);

  return NextResponse.json<ApiResponse<BasketItemWithCard[]>>({
    success: true,
    data: items,
  });
}

// POST /api/v1/basket — add card to basket
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid JSON body", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = addToBasketSchema.safeParse(body);
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

  try {
    const item = await addCardToBasket(session.user.id, parsed.data.cardId);
    return NextResponse.json<ApiResponse<BasketItemWithCard>>(
      { success: true, data: item },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "ALREADY_IN_BASKET") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Card is already in your basket.", code: msg },
        { status: 409 }
      );
    }
    if (msg === "CARD_NOT_FOUND") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Card not found or inactive.", code: msg },
        { status: 404 }
      );
    }
    if (msg === "BASKET_LIMIT_REACHED") {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: "Free plan limit reached. Upgrade to Pro for unlimited items.",
          code: msg,
        },
        { status: 403 }
      );
    }
    throw err;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
