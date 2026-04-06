import type { DefaultSession } from "next-auth";
import type { Role, SubscriptionTier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      subscriptionTier: SubscriptionTier;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    subscriptionTier: SubscriptionTier;
  }
}
