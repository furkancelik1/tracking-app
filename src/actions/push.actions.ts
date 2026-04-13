"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/web-push";
import { revalidatePath } from "next/cache";
import {
  buildPushPayload,
  buildTestPayload,
  type NotificationSlot,
} from "@/constants/notifications";

// ─── Push Aboneliğini Kaydet ─────────────────────────────────────────────────

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function subscribePushAction(subscription: PushSubscriptionData) {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ─── Push Aboneliğini Sil ────────────────────────────────────────────────────

export async function unsubscribePushAction(endpoint: string) {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ─── Tek Kullanıcıya Push Bildirim Gönder ────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUserAction(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return { sent: 0 };

  const data = JSON.stringify(payload);
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        data
      );
      sent++;
    } catch (error: any) {
      // 410 Gone veya 404 — abonelik artık geçersiz, sil
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }

  return { sent };
}

// ─── Test Push Bildirim Gönder (kendine) ─────────────────────────────────────

export async function sendTestPushAction() {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { language: true },
  });

  const locale = (user.language === "tr" ? "tr" : "en") as "en" | "tr";
  const payload = buildTestPayload(locale);

  const result = await sendPushToUserAction(userId, payload);

  if (result.sent === 0) {
    throw new Error("Push aboneliği bulunamadı. Lütfen önce bildirimlere izin verin.");
  }

  return result;
}

// ─── Bekleyen Rutinler İçin Push Gönder ──────────────────────────────────────

export async function sendRoutineReminderPushAction(
  userId: string,
  slot: NotificationSlot = "morning",
) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      language: true,
      routines: {
        where: { isActive: true },
        select: {
          title: true,
          currentStreak: true,
          logs: {
            where: { completedAt: { gte: todayStart } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  const pending = user.routines
    .filter((r) => r.logs.length === 0)
    .map((r) => ({ title: r.title, currentStreak: r.currentStreak }));

  if (pending.length === 0) return { sent: 0, reason: "all_done" };

  const locale = (user.language === "tr" ? "tr" : "en") as "en" | "tr";
  const payload = buildPushPayload(locale, slot, pending);

  return sendPushToUserAction(userId, payload);
}
