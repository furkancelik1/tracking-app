import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

/** Plans */
export const STRIPE_PLANS = {
  PRO: {
    priceId:"price_1TJEZY1TpPEEqgy4bVhnSqhN",
    name: "Pro",
    price: "$9",
    interval: "month",
    features: [
      "Unlimited routines",
      "Weekly stats charts",
      "Email reminders",
      "Priority support",
      "All future features",
    ],
  },
} as const;

/** Routine limit per tier */
export const TIER_LIMITS = {
  FREE: 3,
  PRO: Infinity,
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;

export function getSubscriptionTier(
  value: string | null | undefined
): SubscriptionTier {
  return value === "PRO" ? "PRO" : "FREE";
}

// ─── Subscription Status Helper ───────────────────────────────────────────────

export type SubscriptionStatus = {
  tier: SubscriptionTier;
  isPro: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
  isActive: boolean;
};

/**
 * Kullanıcı objesinden abonelik durumunu türetir.
 * Server Component / Server Action içinde kullanılır.
 */
export function getSubscriptionStatus(user: {
  subscriptionTier: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}): SubscriptionStatus {
  const tier = getSubscriptionTier(user.subscriptionTier);
  const isPro = tier === "PRO";
  const now = new Date();
  const periodEnd = user.stripeCurrentPeriodEnd ?? null;

  return {
    tier,
    isPro,
    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeSubscriptionId: user.stripeSubscriptionId ?? null,
    stripeCurrentPeriodEnd: periodEnd,
    isActive: isPro && (!periodEnd || periodEnd > now),
  };
}
