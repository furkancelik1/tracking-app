"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function addTestCoins(amount = 1000): Promise<{ coins: number }> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Dev-only action");
  }

  const session = await getSession();
  if (!session?.user) throw new Error("Not authenticated");
  const userId = (session.user as any).id as string;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { coins: { increment: amount } },
    select: { coins: true },
  });

  return { coins: updated.coins };
}
