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
      "Unlimited basket items",
      "Priority support",
      "Advanced analytics",
      "Chrome Extension access",
    ],
  },
} as const;

/** Basket item limit per tier */
export const TIER_LIMITS = {
  FREE: 5,
  PRO: Infinity,
} as const;
