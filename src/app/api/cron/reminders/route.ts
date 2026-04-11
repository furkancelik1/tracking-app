import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/web-push";
import { startOfDay } from "date-fns";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Sabitler ──────────────────────────────────────────────────────────────────
const PUSH_BATCH_SIZE = 20;

// ── Timing-safe secret karşılaştırma ─────────────────────────────────────────
function isValidSecret(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

// ─── GET /api/cron/reminders ─────────────────────────────────────────────────
// Tüm push abonelerine (FREE + PRO) bekleyen rutin hatırlatıcısı gönderir.
// Vercel Cron tarafından günlük olarak tetiklenir.

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // ── Güvenlik: Vercel Cron header + Bearer token ───────────────────────────
  const isVercel = !!process.env.VERCEL;
  if (isVercel && req.headers.get("x-vercel-cron") !== "1") {
    console.warn("[cron/push-reminders] ⛔ x-vercel-cron header eksik");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !token || !isValidSecret(token, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todayStart = startOfDay(new Date());

    // ── Push aboneliği olan kullanıcıları + bekleyen rutinlerini çek ────────
    const usersWithSubs = await prisma.user.findMany({
      where: {
        pushSubscriptions: { some: {} },
        routines: { some: { isActive: true } },
      },
      select: {
        id: true,
        name: true,
        language: true,
        pushSubscriptions: {
          select: { id: true, endpoint: true, p256dh: true, auth: true },
        },
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

    // ── Bekleyen rutini olan kullanıcıları filtrele ─────────────────────────
    const targets = usersWithSubs
      .map((user) => {
        const pending = user.routines.filter((r) => r.logs.length === 0);
        return { ...user, pending };
      })
      .filter((u) => u.pending.length > 0);

    console.log(
      `[cron/push-reminders] 📋 ${usersWithSubs.length} push abonesi, ${targets.length} kişinin bekleyen rutini var`
    );

    // ── Batch halinde push gönder ───────────────────────────────────────────
    let pushSent = 0;
    let pushFailed = 0;
    let subsCleaned = 0;

    for (let i = 0; i < targets.length; i += PUSH_BATCH_SIZE) {
      if (Date.now() - startTime > 50_000) {
        console.warn(
          `[cron/push-reminders] ⏱ Timeout yaklaştı — ${i}/${targets.length} işlendi`
        );
        break;
      }

      const batch = targets.slice(i, i + PUSH_BATCH_SIZE);

      await Promise.allSettled(
        batch.flatMap((user) => {
          const pendingCount = user.pending.length;
          const body =
            pendingCount === 1
              ? `"${user.pending[0].title}" rutinini henüz tamamlamadın!`
              : `${pendingCount} tamamlanmamış rutinin var. Serini bozma!`;

          const longestStreak = Math.max(
            ...user.pending.map((r) => r.currentStreak),
            0
          );

          const payload = JSON.stringify({
            title: "⏰ Rutin Hatırlatıcısı",
            body:
              longestStreak > 0
                ? `${body} 🔥 ${longestStreak} günlük serin tehlikede!`
                : body,
            icon: "/icons/maskable_icon_x192.png",
            badge: "/icons/maskable_icon_x192.png",
            url: "/dashboard",
            tag: "routine-reminder",
          });

          return user.pushSubscriptions.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload
              );
              pushSent++;
            } catch (err: any) {
              // 410 Gone / 404 — abonelik geçersiz, DB'den temizle
              if (err.statusCode === 410 || err.statusCode === 404) {
                await prisma.pushSubscription
                  .delete({ where: { id: sub.id } })
                  .catch(() => {});
                subsCleaned++;
                console.log(
                  `[cron/push-reminders] 🧹 Geçersiz abonelik silindi: ${sub.endpoint.slice(0, 60)}…`
                );
              } else {
                pushFailed++;
                console.error(
                  `[cron/push-reminders] ❌ Push hatası (${err.statusCode}): ${sub.endpoint.slice(0, 60)}…`
                );
              }
            }
          });
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[cron/push-reminders] ✅ Tamamlandı — gönderilen: ${pushSent}, hata: ${pushFailed}, temizlenen: ${subsCleaned}, süre: ${duration}ms`
    );

    return NextResponse.json({
      ok: true,
      pushSent,
      pushFailed,
      subsCleaned,
      usersNotified: targets.length,
      duration: `${duration}ms`,
    });
  } catch (err) {
    console.error("[cron/push-reminders] 💥 Kritik hata:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
