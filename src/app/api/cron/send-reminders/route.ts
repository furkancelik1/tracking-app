import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRoutineReminderEmail } from "@/lib/mail";
import { webpush } from "@/lib/web-push";
import { startOfDay } from "date-fns";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Sabitler ──────────────────────────────────────────────────────────────────
const BATCH_SIZE = 10; // Vercel 60s limitine takılmamak için paralel batch boyutu
const BATCH_DELAY_MS = 200; // Batch'ler arası bekleme (rate limit koruması)

// ── Timing-safe secret karşılaştırma ─────────────────────────────────────────
function isValidSecret(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // ── Güvenlik Kontrolü ─────────────────────────────────────────────────────
  // 1) Vercel Cron header doğrulaması (production'da zorunlu)
  const isVercel = !!process.env.VERCEL;
  if (isVercel && req.headers.get("x-vercel-cron") !== "1") {
    console.warn("[cron/reminders] ⛔ x-vercel-cron header eksik — reddedildi.");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Bearer token — timing-safe karşılaştırma
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !token || !isValidSecret(token, cronSecret)) {
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

    // ── Kullanıcı başına bekleyen rutinleri hesapla ─────────────────────────
    const usersWithPending = eligibleUsers
      .map((user) => {
        const pending = user.routines
          .filter((r) => r.logs.length === 0)
          .map((r) => ({
            title: r.title,
            currentStreak: r.currentStreak,
            color: r.color ?? "#6366f1",
          }));
        return { ...user, pending };
      })
      .filter((u) => u.pending.length > 0);

    // ── Batch halinde mail gönder ───────────────────────────────────────────
    let sent = 0;
    let failed = 0;
    const errors: { userId: string; error: string }[] = [];

    for (let i = 0; i < usersWithPending.length; i += BATCH_SIZE) {
      // Vercel timeout'una yaklaşıyorsak erken çık
      if (Date.now() - startTime > 50_000) {
        console.warn(
          `[cron/reminders] ⏱ Timeout yaklaştı — ${i}/${usersWithPending.length} işlendi, kalan atlandı.`
        );
        break;
      }

      const batch = usersWithPending.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((user) =>
          sendRoutineReminderEmail({
            to: user.email!,
            userName: user.name ?? "User",
            pendingRoutines: user.pending,
            language: user.language,
          })
        )
      );

      // ── Batch içindeki sonuçları işleme ───────────────────────────────────────
for (let j = 0; j < results.length; j++) {
  const result = results[j];
  const user = batch[j];

  // 1) "Undefined" kontrolü: TypeScript'e bu değişkenlerin var olduğunu garanti et
  if (!result || !user) continue;

  if (result.status === "fulfilled") {
    sent++;
  } else {
    // 2) Tip Daraltma (Type Narrowing): 
    // TypeScript'e bu 'result'ın kesinlikle 'rejected' olduğunu söyle
    const rejectedResult = result as PromiseRejectedResult;
    
    failed++;
    errors.push({
      userId: user.id,
      error:
        rejectedResult.reason instanceof Error
          ? rejectedResult.reason.message
          : String(rejectedResult.reason),
    });
    console.error(
      `[cron/reminders] ❌ ${user.email}: ${rejectedResult.reason}`
    );
  }
}

      // Son batch değilse rate limit için kısa bekleme
      if (i + BATCH_SIZE < usersWithPending.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const duration = Date.now() - startTime;

    // ── Push Bildirimleri Gönder ────────────────────────────────────────────
    let pushSent = 0;
    for (const user of usersWithPending) {
      if (Date.now() - startTime > 55_000) break;

      const subs = await prisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      const body =
        user.pending.length === 1
          ? `"${user.pending[0].title}" rutinini henüz tamamlamadın!`
          : `${user.pending.length} tamamlanmamış rutinin var. Serini bozma!`;

      const payload = JSON.stringify({
        title: "⏰ Rutin Hatırlatıcısı",
        body,
        icon: "/icons/maskable_icon_x192.png",
        badge: "/icons/maskable_icon_x192.png",
        url: "/dashboard",
        tag: "routine-reminder",
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          pushSent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        }
      }
    }

    console.log(
      `[cron/reminders] ✅ Tamamlandı — email: ${sent}, push: ${pushSent}, atlandı: ${eligibleUsers.length - usersWithPending.length}, hata: ${failed}, süre: ${duration}ms`
    );

    return NextResponse.json({
      ok: true,
      sent,
      pushSent,
      skipped: eligibleUsers.length - usersWithPending.length,
      failed,
      duration: `${duration}ms`,
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
