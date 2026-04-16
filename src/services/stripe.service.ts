import { stripe, STRIPE_PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

async function resolveUserIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = sub.metadata?.userId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  if (!customerId) return null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  return user?.id ?? null;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// â”€â”€â”€ Checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createCheckoutSession(
  userId: string,
  userEmail: string
): Promise<string> {
  // Reuse existing Stripe customer if available
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, subscriptionTier: true },
  });

  if (user?.subscriptionTier === "PRO") {
    throw new Error("ALREADY_PRO");
  }

  let customerId = user?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: STRIPE_PLANS.PRO.priceId, quantity: 1 }],
    success_url: `${APP_URL}/settings?checkout=success`,
    cancel_url: `${APP_URL}/settings?checkout=cancel`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Failed to create Stripe session URL");
  return session.url;
}

// â”€â”€â”€ Billing Portal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createBillingPortalSession(
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) throw new Error("NO_STRIPE_CUSTOMER");

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/settings`,
  });

  return session.url;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  const ts = (sub as any).current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string | null {
  return typeof customer === "string" ? customer : customer?.id ?? null;
}

// â”€â”€â”€ Webhook Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = session.metadata?.userId;
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!userId || !subId) break;

      // Fetch full subscription to get period end
      const sub = await stripe.subscriptions.retrieve(subId);

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: "PRO",
          stripeSubscriptionId: subId,
          stripeCustomerId: session.customer as string,
          stripeCurrentPeriodEnd: getPeriodEnd(sub),
        },
      });
      break;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceWithSubscription = invoice as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };

      const subId =
        typeof invoiceWithSubscription.subscription === "string"
          ? invoiceWithSubscription.subscription
          : invoiceWithSubscription.subscription?.id;

      if (!subId) break;

      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = await resolveUserIdFromSubscription(sub);
      if (!userId) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: "PRO",
          stripeSubscriptionId: sub.id,
          stripeCustomerId: getCustomerId(sub.customer),
          stripeCurrentPeriodEnd: getPeriodEnd(sub),
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdFromSubscription(sub);
      if (!userId) break;

      const isActive = sub.status === "active" || sub.status === "trialing";

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: isActive ? "PRO" : "FREE",
          stripeSubscriptionId: isActive ? sub.id : null,
          stripeCustomerId: getCustomerId(sub.customer),
          stripeCurrentPeriodEnd: isActive ? getPeriodEnd(sub) : null,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserIdFromSubscription(sub);
      if (!userId) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: "FREE",
          stripeSubscriptionId: null,
          stripeCustomerId: getCustomerId(sub.customer),
          stripeCurrentPeriodEnd: null,
        },
      });
      break;
    }

    // Ignore all other events
    default:
      break;
  }
}
