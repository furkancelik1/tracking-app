import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBillingPortalSession } from "@/services/stripe.service";
import type { ApiResponse } from "@/types";

// POST /api/v1/stripe/portal
// Returns a Stripe Billing Portal URL to manage subscription
export async function POST() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const url = await createBillingPortalSession(session.user.id);
    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "NO_STRIPE_CUSTOMER") {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: "No billing account found. Subscribe first.",
          code: msg,
        },
        { status: 404 }
      );
    }
    throw err;
  }
}
