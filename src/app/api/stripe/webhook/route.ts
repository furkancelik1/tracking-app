import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { handleStripeWebhook } from "@/services/stripe.service";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/**
 * POST /api/stripe/webhook
 *
 * Stripe sends events here. Must:
 *  - Read the RAW body (not parsed JSON) to verify the signature
 *  - Verify with stripe.webhooks.constructEvent()
 *  - Respond 200 quickly — heavy work runs synchronously but should be fast
 *
 * This route is intentionally OUTSIDE /api/v1 (no auth middleware,
 * no CORS headers — Stripe uses its own signature verification).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    console.error(`Stripe webhook signature error: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    await handleStripeWebhook(event);
  } catch (err) {
    // Log but still return 200 so Stripe doesn't retry indefinitely
    console.error(`Stripe webhook handler error for ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
