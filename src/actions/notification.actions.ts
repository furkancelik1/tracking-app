"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRoutineReminderEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

// ─── Bugünkü bekleyen rutinleri çek ──────────────────────────────────────────

async function getPendingRoutines(userId: string) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const routines = await prisma.routine.findMany({
    where: { userId, isActive: true },
    select: {
      title: true,
      color: true,
      currentStreak: true,
      logs: {
        where: { completedAt: { gte: todayStart } },
        select: { id: true },
        take: 1,
      },
    },
  });

  return routines
    .filter((r) => r.logs.length === 0)
    .map((r) => ({
      title: r.title,
      currentStreak: r.currentStreak,
      color: r.color ?? "#6366f1",
    }));
}

// ─── E-posta Bildirimi Aç/Kapat ───────────────────────────────────────────────

export async function toggleEmailNotificationsAction(enabled: boolean) {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  if (user?.subscriptionTier !== "PRO") {
    throw new Error("E-posta hatırlatıcıları yalnızca PRO kullanıcılara özeldir.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailNotificationsEnabled: enabled },
  });

  revalidatePath("/settings");
}

// ─── Gerçek Hatırlatıcı Gönder (cron / kullanıcı tetiklemeli) ────────────────

export async function sendReminderEmailAction() {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      subscriptionTier: true,
      emailNotificationsEnabled: true,
    },
  });

  if (!user?.email) throw new Error("Kullanıcı e-postası bulunamadı.");
  // Geçici debug: gönderim akışını test etmek için abonelik kontrolünü bypass et.
  // if (user.subscriptionTier !== "PRO") throw new Error("PRO planı gerekli.");
  // Geçici debug: gönderim akışını test etmek için bildirim tercihi kontrolünü bypass et.
  // if (!user.emailNotificationsEnabled) throw new Error("E-posta bildirimleri kapalı.");

  const pending = await getPendingRoutines(userId);

  if (pending.length === 0) {
    return { skipped: true, reason: "Tüm rutinler tamamlanmış." };
  }

  await sendRoutineReminderEmail({
    to: user.email,
    userName: user.name ?? "Kullanıcı",
    pendingRoutines: pending,
  });

  return { sent: true };
}

// ─── Test Maili Gönder (sadece geliştirici kullanımı) ────────────────────────

const TEST_EMAIL = "furkansteam2022@gmail.com";

export async function sendTestEmailAction() {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const pending = await getPendingRoutines(userId);

  // Test için en az bir rutin göster; gerçekte bekleyen yoksa mock ekle
  const testRoutines =
    pending.length > 0
      ? pending
      : [
          { title: "Test Rutini", currentStreak: 5, color: "#6366f1" },
          { title: "Sabah Koşusu", currentStreak: 12, color: "#f97316" },
        ];

  await sendRoutineReminderEmail({
    to: TEST_EMAIL,
    userName: user?.name ?? "Furkan",
    pendingRoutines: testRoutines,
  });

  return { sent: true, to: TEST_EMAIL };
}
