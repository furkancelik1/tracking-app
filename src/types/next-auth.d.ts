import type { SubscriptionTier } from "@/lib/stripe";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionTier: SubscriptionTier;
      level: number;
      xp: number;
      coins: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionTier: SubscriptionTier;
  }
}
