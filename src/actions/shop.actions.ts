"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Oturum bulunamadı.");
  return (session.user as any).id as string;
}

/** Dükkan ürünlerini getir + kullanıcının coin bakiyesini ve envanterini döndür */
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

/** Kullanıcının coin bakiyesini döndür */
export async function getUserCoins(): Promise<number> {
  const userId = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  return user?.coins ?? 0;
}

/** Ürün satın al */
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

/** Kullanıcının envanterindeki belirtilen türden eşya adedini döndür */
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

/** Streak Freeze kullan — bir adet düş */
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
