// Re-export Prisma types — avoids direct @prisma/client imports in components
export type {
  User,
  Card,
  BasketItem,
  ActivityLog,
  Account,
  Session,
} from "@prisma/client";

export {
  Role,
  SubscriptionTier,
  ResetType,
  BasketStatus,
  ActivityAction,
} from "@prisma/client";

// ─── Composite / Extended Types ───────────────────────────────────────────────
import type { BasketItem, Card } from "@prisma/client";
import type { Role, SubscriptionTier, BasketStatus } from "@prisma/client";

/** BasketItem joined with its Card — primary shape used in dashboard */
export type BasketItemWithCard = BasketItem & {
  card: Card;
};

/** User shape exposed in NextAuth session (augmented in next-auth.d.ts) */
export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  subscriptionTier: SubscriptionTier;
};

// ─── Realtime Event Shapes ────────────────────────────────────────────────────

export type BasketUpdateEvent = {
  type: "BASKET_UPDATED";
  payload: {
    basketItemId: string;
    status: BasketStatus;
    nextResetAt: string | null;
  };
};

export type CatalogueUpdateEvent = {
  type: "CATALOGUE_UPDATED";
  payload: { action: "created" | "updated" | "deleted"; cardId: string };
};

export type RealtimeEvent = BasketUpdateEvent | CatalogueUpdateEvent;

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
