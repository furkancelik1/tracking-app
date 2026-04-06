import { prisma } from "@/lib/prisma";
import { computeNextResetAt } from "@/lib/utils";
import { createAdminSupabaseClient, REALTIME_CHANNELS } from "@/lib/supabase";
import { TIER_LIMITS } from "@/lib/stripe";
import type { BasketItemWithCard, RealtimeEvent } from "@/types";
import type { BasketStatus } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getUserBasket(userId: string): Promise<BasketItemWithCard[]> {
  return prisma.basketItem.findMany({
    where: { userId },
    include: {
      card: {
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          category: true,
          affiliateUrl: true,
          resetType: true,
          duration: true,
          isActive: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function addCardToBasket(
  userId: string,
  cardId: string
): Promise<BasketItemWithCard> {
  // Verify the card exists and is active
  const card = await prisma.card.findUnique({
    where: { id: cardId, isActive: true },
  });
  if (!card) throw new Error("CARD_NOT_FOUND");

  // Enforce unique constraint gracefully
  const existing = await prisma.basketItem.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });
  if (existing) throw new Error("ALREADY_IN_BASKET");

  // Enforce FREE tier basket limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, _count: { select: { basketItems: true } } },
  });
  const limit = TIER_LIMITS[user?.subscriptionTier ?? "FREE"];
  if (user && user._count.basketItems >= limit) {
    throw new Error("BASKET_LIMIT_REACHED");
  }

  return prisma.basketItem.create({
    data: { userId, cardId },
    include: { card: true },
  });
}

export async function removeFromBasket(
  userId: string,
  basketItemId: string
): Promise<void> {
  const item = await prisma.basketItem.findUnique({
    where: { id: basketItemId },
  });
  if (!item || item.userId !== userId) throw new Error("NOT_FOUND");

  await prisma.basketItem.delete({ where: { id: basketItemId } });
}

// ─── Timer Actions ────────────────────────────────────────────────────────────

export async function activateBasketItem(
  userId: string,
  basketItemId: string
): Promise<BasketItemWithCard> {
  const item = await prisma.basketItem.findUnique({
    where: { id: basketItemId },
    include: { card: true },
  });
  if (!item || item.userId !== userId) throw new Error("NOT_FOUND");
  if (item.status === "COMPLETED") throw new Error("ALREADY_COMPLETED");

  const nextResetAt = computeNextResetAt(item.card.resetType, item.card.duration);

  const updated = await prisma.basketItem.update({
    where: { id: basketItemId },
    data: {
      status: "ACTIVE",
      lastActivatedAt: new Date(),
      nextResetAt,
    },
    include: { card: true },
  });

  await logActivity(userId, item.cardId, "ACTIVATED");
  await broadcastBasketUpdate(userId, updated.id, "ACTIVE", nextResetAt);

  return updated;
}

export async function completeBasketItem(
  userId: string,
  basketItemId: string
): Promise<BasketItemWithCard> {
  const item = await prisma.basketItem.findUnique({
    where: { id: basketItemId },
    include: { card: true },
  });
  if (!item || item.userId !== userId) throw new Error("NOT_FOUND");

  const updated = await prisma.basketItem.update({
    where: { id: basketItemId },
    data: { status: "COMPLETED" },
    include: { card: true },
  });

  await logActivity(userId, item.cardId, "COMPLETED");
  await broadcastBasketUpdate(userId, updated.id, "COMPLETED", null);

  return updated;
}

export async function resetBasketItem(
  userId: string,
  basketItemId: string
): Promise<BasketItemWithCard> {
  const item = await prisma.basketItem.findUnique({
    where: { id: basketItemId },
    include: { card: true },
  });
  if (!item || item.userId !== userId) throw new Error("NOT_FOUND");

  const updated = await prisma.basketItem.update({
    where: { id: basketItemId },
    data: { status: "PENDING", nextResetAt: null, lastActivatedAt: null },
    include: { card: true },
  });

  await logActivity(userId, item.cardId, "RESET");
  await broadcastBasketUpdate(userId, updated.id, "PENDING", null);

  return updated;
}

// ─── Auto-reset expired timers (called by a cron or on basket fetch) ──────────

export async function expireTimers(userId: string): Promise<number> {
  const result = await prisma.basketItem.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      nextResetAt: { lt: new Date() },
    },
    data: { status: "PENDING", nextResetAt: null },
  });
  return result.count;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function logActivity(
  userId: string,
  cardId: string,
  action: "ACTIVATED" | "COMPLETED" | "RESET"
) {
  // Fire-and-forget — don't block the response
  prisma.activityLog
    .create({ data: { userId, cardId, action } })
    .catch(() => {/* non-critical */});
}

async function broadcastBasketUpdate(
  userId: string,
  basketItemId: string,
  status: BasketStatus,
  nextResetAt: Date | null
) {
  try {
    const admin = createAdminSupabaseClient();
    const event: RealtimeEvent = {
      type: "BASKET_UPDATED",
      payload: {
        basketItemId,
        status,
        nextResetAt: nextResetAt?.toISOString() ?? null,
      },
    };
    await admin
      .channel(REALTIME_CHANNELS.userBasket(userId))
      .send({ type: "broadcast", event: "BASKET_UPDATED", payload: event });
  } catch {
    // Supabase broadcast failure must never break the main response
  }
}
