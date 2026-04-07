import type { SubscriptionTier } from "@/lib/stripe";

// ─── API Helpers ──────────────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

// ─── Session User ─────────────────────────────────────────────────────────────

/** User shape exposed in NextAuth session (augmented in next-auth.d.ts) */
export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  subscriptionTier: SubscriptionTier;
};
