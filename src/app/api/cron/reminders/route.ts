import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRoutineReminderEmail } from "@/lib/mail";
import { startOfDay } from "date-fns";

export const runtime = "nodejs";
// Vercel Cron'da zaman aşımını önlemek için maksimum süreyi uzat
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // ── Güvenlik Kontrolü ───────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !token || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── PRO + Bildirimi Açık Kullanıcıları Çek ──────────────────────────────
    const todayStart = startOfDay(new Date());

    const eligibleUsers = await prisma.user.findMany({
      where: {
        subscriptionTier: "PRO",
        emailNotificationsEnabled: true,
        email: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        language: true,
        routines: {
          where: { isActive: true, frequency: "DAILY" },
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
        },
      },
    });

    // ── Her Kullanıcı İçin Mail Gönder ────────────────────────────────────────
    let sent = 0;
    let skipped = 0;
    const errors: { userId: string; error: string }[] = [];

    for (const user of eligibleUsers) {
      const pending = user.routines
        .filter((r) => r.logs.length === 0)
        .map((r) => ({
          title: r.title,
          currentStreak: r.currentStreak,
          color: r.color ?? "#6366f1",
        }));

      if (pending.length === 0) {
        skipped++;
        continue;
      }

      try {
        await sendRoutineReminderEmail({
          to: user.email!,
          userName: user.name ?? "User",
          pendingRoutines: pending,
          language: user.language,
        });
        sent++;
        console.log(
          `[cron/reminders] ✅ Gönderildi → ${user.email} (${pending.length} rutin)`
        );
      } catch (err) {
        errors.push({
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`[cron/reminders] ❌ Hata → ${user.email}:`, err);
      }
    }

    console.log(
      `[cron/reminders] Tamamlandı — gönderildi: ${sent}, atlandı: ${skipped}, hata: ${errors.length}`
    );

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[cron/reminders] 💥 Kritik hata:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
