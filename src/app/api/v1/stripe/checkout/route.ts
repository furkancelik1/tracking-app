import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCheckoutSession } from "@/services/stripe.service";
import type { ApiResponse } from "@/types";

// POST /api/v1/stripe/checkout
// Returns a Stripe Checkout URL for PRO subscription
export async function POST() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id: userId, email } = session.user;
  if (!email) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Account has no email.", code: "NO_EMAIL" },
      { status: 400 }
    );
  }

  try {
    const url = await createCheckoutSession(userId, email);
    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "ALREADY_PRO") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "You are already on the Pro plan.", code: msg },
        { status: 409 }
      );
    }
    throw err;
  }
}
