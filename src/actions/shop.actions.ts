"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ShopItemCategory } from "@prisma/client";
import { calculateLevel } from "@/lib/level";

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Oturum bulunamadÄ±.");
  return (session.user as any).id as string;
}

/** DÃ¼kkan Ã¼rÃ¼nlerini getir + kullanÄ±cÄ±nÄ±n coin bakiyesini ve envanterini dÃ¶ndÃ¼r */
export async function getShopData() {
  const userId = await requireUser();

  const [user, items, userItems] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    prisma.item.findMany({ orderBy: { price: "asc" } }),
    prisma.userItem.findMany({
      where: { userId },
      select: { itemId: true, count: true },
    }),
  ]);

  const inventory = new Map(userItems.map((ui) => [ui.itemId, ui.count]));

  return {
    coins: user?.coins ?? 0,
    items: items.map((item) => ({
      ...item,
      owned: inventory.get(item.id) ?? 0,
    })),
  };
}

/** KullanÄ±cÄ±nÄ±n coin bakiyesini dÃ¶ndÃ¼r */
export async function getUserCoins(): Promise<number> {
  const userId = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  return user?.coins ?? 0;
}

/** ÃœrÃ¼n satÄ±n al */
export async function buyItem(itemId: string): Promise<{ success: boolean; message: string; coins: number }> {
  const userId = await requireUser();

  const [user, item] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    prisma.item.findUnique({ where: { id: itemId } }),
  ]);

  if (!item) return { success: false, message: "ITEM_NOT_FOUND", coins: user?.coins ?? 0 };
  if (!user || user.coins < item.price) return { success: false, message: "NOT_ENOUGH_COINS", coins: user?.coins ?? 0 };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { coins: { decrement: item.price } },
    }),
    prisma.userItem.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, count: 1 },
      update: { count: { increment: 1 } },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });

  revalidatePath("/dashboard");
  return { success: true, message: "PURCHASE_SUCCESS", coins: updatedUser?.coins ?? 0 };
}

/** KullanÄ±cÄ±nÄ±n envanterindeki belirtilen tÃ¼rden eÅŸya adedini dÃ¶ndÃ¼r */
export async function getInventoryCount(type: "STREAK_FREEZE"): Promise<number> {
  const userId = await requireUser();

  const items = await prisma.userItem.findMany({
    where: {
      userId,
      item: { type },
      count: { gt: 0 },
    },
    select: { count: true },
  });

  return items.reduce((sum, i) => sum + i.count, 0);
}

/** Streak Freeze kullan â€” bir adet dÃ¼ÅŸ */
export async function useStreakFreeze(userId: string): Promise<boolean> {
  const userItem = await prisma.userItem.findFirst({
    where: {
      userId,
      item: { type: "STREAK_FREEZE" },
      count: { gt: 0 },
    },
    select: { id: true, count: true },
  });

  if (!userItem) return false;

  await prisma.userItem.update({
    where: { id: userItem.id },
    data: { count: { decrement: 1 } },
  });

  return true;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Marketplace â€” Themes, Frames & Boosters
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/** Marketplace Ã¼rÃ¼nlerini getir (kategori bazlÄ± filtreleme + sahiplik durumu) */
export async function getMarketplaceItems(category?: ShopItemCategory) {
  const userId = await requireUser();

  const [user, shopItems, purchases] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, xp: true, equippedTheme: true, equippedFrame: true },
    }),
    prisma.shopItem.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { price: "asc" },
    }),
    prisma.purchase.findMany({
      where: { userId },
      select: { shopItemId: true },
    }),
  ]);

  const ownedIds = new Set(purchases.map((p) => p.shopItemId));
  const userLevel = calculateLevel(user?.xp ?? 0).level;

  return {
    coins: user?.coins ?? 0,
    userLevel,
    equippedTheme: user?.equippedTheme ?? null,
    equippedFrame: user?.equippedFrame ?? null,
    items: shopItems.map((item) => ({
      ...item,
      metadata: item.metadata as Record<string, string> | null,
      owned: ownedIds.has(item.id),
      equipped:
        item.id === user?.equippedTheme || item.id === user?.equippedFrame,
    })),
  };
}

/** Marketplace Ã¼rÃ¼nÃ¼ satÄ±n al */
export async function buyShopItem(
  shopItemId: string
): Promise<{ success: boolean; message: string; coins: number; requiredLevel?: number }> {
  const userId = await requireUser();

  const [user, shopItem, existingPurchase] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true, xp: true } }),
    prisma.shopItem.findUnique({ where: { id: shopItemId } }),
    prisma.purchase.findUnique({
      where: { userId_shopItemId: { userId, shopItemId } },
    }),
  ]);

  if (!shopItem)
    return { success: false, message: "ITEM_NOT_FOUND", coins: user?.coins ?? 0 };
  if (existingPurchase)
    return { success: false, message: "ALREADY_OWNED", coins: user?.coins ?? 0 };
  if (!user || user.coins < shopItem.price)
    return { success: false, message: "NOT_ENOUGH_COINS", coins: user?.coins ?? 0 };
  if (shopItem.minLevel > 0 && calculateLevel(user.xp).level < shopItem.minLevel)
    return { success: false, message: "LEVEL_REQUIRED", coins: user.coins, requiredLevel: shopItem.minLevel };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { coins: { decrement: shopItem.price } },
    }),
    prisma.purchase.create({
      data: { userId, shopItemId },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });

  revalidatePath("/dashboard");
  return { success: true, message: "PURCHASE_SUCCESS", coins: updatedUser?.coins ?? 0 };
}

/** Tema veya Ã§erÃ§eve kuÅŸan */
export async function equipItem(
  shopItemId: string
): Promise<{ success: boolean; message: string }> {
  const userId = await requireUser();

  const purchase = await prisma.purchase.findUnique({
    where: { userId_shopItemId: { userId, shopItemId } },
    include: { shopItem: true },
  });

  if (!purchase)
    return { success: false, message: "NOT_OWNED" };

  const { category } = purchase.shopItem;

  if (category === "THEME") {
    await prisma.user.update({
      where: { id: userId },
      data: { equippedTheme: shopItemId },
    });
  } else if (category === "FRAME") {
    await prisma.user.update({
      where: { id: userId },
      data: { equippedFrame: shopItemId },
    });
  } else {
    return { success: false, message: "NOT_EQUIPPABLE" };
  }

  revalidatePath("/dashboard");
  return { success: true, message: "EQUIPPED" };
}

/** KuÅŸanÄ±lmÄ±ÅŸ temayÄ± veya Ã§erÃ§eveyi Ã§Ä±kar */
export async function unequipItem(
  type: "THEME" | "FRAME"
): Promise<{ success: boolean }> {
  const userId = await requireUser();

  await prisma.user.update({
    where: { id: userId },
    data: type === "THEME" ? { equippedTheme: null } : { equippedFrame: null },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/** KullanÄ±cÄ±nÄ±n kuÅŸanÄ±lmÄ±ÅŸ tema verisini getir (CSS deÄŸiÅŸkenleri iÃ§in) */
export async function getEquippedTheme() {
  const userId = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { equippedTheme: true },
  });

  if (!user?.equippedTheme) return null;

  const item = await prisma.shopItem.findUnique({
    where: { id: user.equippedTheme },
    select: { metadata: true, name: true },
  });

  return item
    ? { name: item.name, metadata: item.metadata as Record<string, string> }
    : null;
}
