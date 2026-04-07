"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { SubscriptionTier } from "@/lib/stripe";

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  subscriptionTier: SubscriptionTier;
};

type UseAuthReturn =
  | { status: "loading"; user: null; isAdmin: false; isPro: false }
  | { status: "unauthenticated"; user: null; isAdmin: false; isPro: false }
  | {
      status: "authenticated";
      user: AuthUser;
      isAdmin: boolean;
      isPro: boolean;
      signOut: () => Promise<void>;
    };

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return { status: "loading", user: null, isAdmin: false, isPro: false };
  }

  if (status === "unauthenticated" || !session?.user) {
    return {
      status: "unauthenticated",
      user: null,
      isAdmin: false,
      isPro: false,
    };
  }

  const user = session.user as AuthUser;

  return {
    status: "authenticated",
    user,
    isAdmin: false,
    isPro: user.subscriptionTier === "PRO",
    signOut: async () => {
      await signOut({ redirect: false });
      router.push("/login");
    },
  };
}
