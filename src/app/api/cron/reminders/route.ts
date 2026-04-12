import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRoutineReminderEmail } from "@/lib/mail";
import { webpush } from "@/lib/web-push";
import { startOfDay } from "date-fns";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Sabitler ──────────────────────────────────────────────────────────────────
const EMAIL_BATCH_SIZE = 10;
const PUSH_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

// ── Timing-safe secret karşılaştırma ─────────────────────────────────────────
function isValidSecret(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

// ─── GET /api/cron/reminders ─────────────────────────────────────────────────
// Master cron: Tek çağrıda hem PRO e-posta hem tüm kullanıcılara push gönderir.
// Vercel Hobby planı tek cron hakkına sahip olduğu için birleştirildi.

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // ── 1) Güvenlik ───────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  // Bearer token veya ?secret= query param ile doğrulama
  const authHeader = req.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = req.nextUrl.searchParams.get("secret");
  const token = headerToken ?? queryToken;

  const isAuthorized =
    isVercelCron || (!!cronSecret && !!token && isValidSecret(token, cronSecret));

  if (!isAuthorized) {
    console.warn("[cron] ⛔ Yetkisiz erişim — header/token eşleşmedi.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = {
    emailSent: 0,
    emailFailed: 0,
    pushSent: 0,
    pushFailed: 0,
    subsCleaned: 0,
  };
  const errors: { userId: string; channel: string; error: string }[] = [];

  try {
    const todayStart = startOfDay(new Date());

    // ══════════════════════════════════════════════════════════════════════════
    // FAZA 1: PRO E-POSTA HATIRLATICLARI
    // ══════════════════════════════════════════════════════════════════════════

    const proUsers = await prisma.user.findMany({
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

    const proWithPending = proUsers
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

    // ── E-posta batch gönderimi ─────────────────────────────────────────────
    for (let i = 0; i < proWithPending.length; i += EMAIL_BATCH_SIZE) {
      if (Date.now() - startTime > 30_000) {
        console.warn(`[cron] ⏱ E-posta fazı timeout — ${i}/${proWithPending.length} işlendi`);
        break;
      }

      const batch = proWithPending.slice(i, i + EMAIL_BATCH_SIZE);

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

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const user = batch[j];
        if (!result || !user) continue;

        if (result.status === "fulfilled") {
          stats.emailSent++;
        } else {
          stats.emailFailed++;
          const reason = (result as PromiseRejectedResult).reason;
          errors.push({
            userId: user.id,
            channel: "email",
            error: reason instanceof Error ? reason.message : String(reason),
          });
          console.error(`[cron] ❌ Email ${user.email}: ${reason}`);
        }
      }

      if (i + EMAIL_BATCH_SIZE < proWithPending.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    console.log(`[cron] 📧 E-posta fazı tamamlandı — gönderilen: ${stats.emailSent}, hata: ${stats.emailFailed}`);

    // ══════════════════════════════════════════════════════════════════════════
    // FAZA 2: TÜM KULLANICILARA PUSH BİLDİRİM (FREE + PRO)
    // ══════════════════════════════════════════════════════════════════════════

    const pushUsers = await prisma.user.findMany({
      where: {
        pushSubscriptions: { some: {} },
        routines: { some: { isActive: true } },
      },
      select: {
        id: true,
        name: true,
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

    const pushTargets = pushUsers
      .map((user) => {
        const pending = user.routines.filter((r) => r.logs.length === 0);
        return { ...user, pending };
      })
      .filter((u) => u.pending.length > 0);

    console.log(`[cron] 🔔 Push fazı — ${pushUsers.length} abone, ${pushTargets.length} kişinin bekleyen rutini var`);

    // ── Push batch gönderimi ────────────────────────────────────────────────
    for (let i = 0; i < pushTargets.length; i += PUSH_BATCH_SIZE) {
      if (Date.now() - startTime > 55_000) {
        console.warn(`[cron] ⏱ Push fazı timeout — ${i}/${pushTargets.length} işlendi`);
        break;
      }

      const batch = pushTargets.slice(i, i + PUSH_BATCH_SIZE);

      await Promise.allSettled(
        batch.flatMap((user) => {
          const pendingCount = user.pending.length;
          const body =
            pendingCount === 1 && user.pending[0]
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
              stats.pushSent++;
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await prisma.pushSubscription
                  .delete({ where: { id: sub.id } })
                  .catch(() => {});
                stats.subsCleaned++;
                console.log(`[cron] 🧹 Geçersiz abonelik silindi: ${sub.endpoint.slice(0, 60)}…`);
              } else {
                stats.pushFailed++;
                console.error(`[cron] ❌ Push hatası (${err.statusCode}): ${sub.endpoint.slice(0, 60)}…`);
              }
            }
          });
        })
      );
    }

    // ── Sonuç ───────────────────────────────────────────────────────────────
    const duration = Date.now() - startTime;
    console.log(
      `[cron] ✅ Master cron tamamlandı — email: ${stats.emailSent}, push: ${stats.pushSent}, temizlenen: ${stats.subsCleaned}, süre: ${duration}ms`
    );

    return NextResponse.json({
      ok: true,
      ...stats,
      duration: `${duration}ms`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[cron] 💥 Kritik hata:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
