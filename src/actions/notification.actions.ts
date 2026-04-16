"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRoutineReminderEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

// â”€â”€â”€ BugÃ¼nkÃ¼ bekleyen rutinleri Ã§ek â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ E-posta Bildirimi AÃ§/Kapat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function toggleEmailNotificationsAction(enabled: boolean) {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  if (user?.subscriptionTier !== "PRO") {
    throw new Error("E-posta hatÄ±rlatÄ±cÄ±larÄ± yalnÄ±zca PRO kullanÄ±cÄ±lara Ã¶zeldir.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailNotificationsEnabled: enabled },
  });

  revalidatePath("/settings");
}

// â”€â”€â”€ GerÃ§ek HatÄ±rlatÄ±cÄ± GÃ¶nder (cron / kullanÄ±cÄ± tetiklemeli) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  if (!user?.email) throw new Error("KullanÄ±cÄ± e-postasÄ± bulunamadÄ±.");
  if (user.subscriptionTier !== "PRO") throw new Error("PRO planÄ± gerekli.");
  if (!user.emailNotificationsEnabled) throw new Error("E-posta bildirimleri kapalÄ±.");

  const pending = await getPendingRoutines(userId);

  if (pending.length === 0) {
    return { skipped: true, reason: "TÃ¼m rutinler tamamlanmÄ±ÅŸ." };
  }

  await sendRoutineReminderEmail({
    to: user.email,
    userName: user.name ?? "KullanÄ±cÄ±",
    pendingRoutines: pending,
  });

  return { sent: true };
}

// â”€â”€â”€ Test Maili GÃ¶nder (sadece geliÅŸtirici kullanÄ±mÄ±) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TEST_EMAIL = "furkansteam2022@gmail.com";

export async function sendTestEmailAction() {
  const session = await requireAuth();
  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const pending = await getPendingRoutines(userId);

  // Test iÃ§in en az bir rutin gÃ¶ster; gerÃ§ekte bekleyen yoksa mock ekle
  const testRoutines =
    pending.length > 0
      ? pending
      : [
          { title: "Test Rutini", currentStreak: 5, color: "#6366f1" },
          { title: "Sabah KoÅŸusu", currentStreak: 12, color: "#f97316" },
        ];

  await sendRoutineReminderEmail({
    to: TEST_EMAIL,
    userName: user?.name ?? "Furkan",
    pendingRoutines: testRoutines,
  });

  return { sent: true, to: TEST_EMAIL };
}
