import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRoutineReminderEmail } from "@/lib/mail";
import { webpush } from "@/lib/web-push";
import { startOfDay } from "date-fns";
import { timingSafeEqual } from "crypto";
import { buildPushPayload, type NotificationSlot } from "@/constants/notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

// â”€â”€ Sabitler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EMAIL_BATCH_SIZE = 10;
const PUSH_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

// â”€â”€ Timing-safe secret karÅŸÄ±laÅŸtÄ±rma â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function isValidSecret(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

// â”€â”€ Detect notification time slot from UTC hour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function detectSlot(utcHour: number): NotificationSlot {
  // Cron runs at 06:00, 09:00, 18:00 UTC â†’ maps to slots
  if (utcHour < 10) return "morning";
  if (utcHour < 15) return "midday";
  return "evening";
}

// â”€â”€â”€ GET /api/cron/reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Master cron: Tek Ã§aÄŸrÄ±da hem PRO e-posta hem tÃ¼m kullanÄ±cÄ±lara push gÃ¶nderir.
// Vercel Hobby planÄ± tek cron hakkÄ±na sahip olduÄŸu iÃ§in birleÅŸtirildi.

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // â”€â”€ 1) GÃ¼venlik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  // Bearer token veya ?secret= query param ile doÄŸrulama
  const authHeader = req.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = req.nextUrl.searchParams.get("secret");
  const token = headerToken ?? queryToken;

  const isAuthorized =
    isVercelCron || (!!cronSecret && !!token && isValidSecret(token, cronSecret));

  if (!isAuthorized) {
    console.warn("[cron] â›” Yetkisiz eriÅŸim â€” header/token eÅŸleÅŸmedi.");
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // FAZA 1: PRO E-POSTA HATIRLATICLARI
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

    // â”€â”€ E-posta batch gÃ¶nderimi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (let i = 0; i < proWithPending.length; i += EMAIL_BATCH_SIZE) {
      if (Date.now() - startTime > 30_000) {
        console.warn(`[cron] â± E-posta fazÄ± timeout â€” ${i}/${proWithPending.length} iÅŸlendi`);
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
          console.error(`[cron] âŒ Email ${user.email}: ${reason}`);
        }
      }

      if (i + EMAIL_BATCH_SIZE < proWithPending.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    console.log(`[cron] ğŸ“§ E-posta fazÄ± tamamlandÄ± â€” gÃ¶nderilen: ${stats.emailSent}, hata: ${stats.emailFailed}`);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // FAZA 2: TÃœM KULLANICILARA PUSH BÄ°LDÄ°RÄ°M (FREE + PRO)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    const slot = detectSlot(new Date().getUTCHours());

    const pushUsers = await prisma.user.findMany({
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

    const pushTargets = pushUsers
      .map((user) => {
        const pending = user.routines
          .filter((r) => r.logs.length === 0)
          .map((r) => ({ title: r.title, currentStreak: r.currentStreak }));
        return { ...user, pending };
      })
      .filter((u) => u.pending.length > 0);

    console.log(`[cron] ğŸ”” Push fazÄ± (${slot}) â€” ${pushUsers.length} abone, ${pushTargets.length} kiÅŸinin bekleyen rutini var`);

    // â”€â”€ Push batch gÃ¶nderimi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (let i = 0; i < pushTargets.length; i += PUSH_BATCH_SIZE) {
      if (Date.now() - startTime > 55_000) {
        console.warn(`[cron] â± Push fazÄ± timeout â€” ${i}/${pushTargets.length} iÅŸlendi`);
        break;
      }

      const batch = pushTargets.slice(i, i + PUSH_BATCH_SIZE);

      await Promise.allSettled(
        batch.flatMap((user) => {
          const locale = (user.language === "tr" ? "tr" : "en") as "en" | "tr";
          const payload = JSON.stringify(
            buildPushPayload(locale, slot, user.pending)
          );

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
              } else {
                stats.pushFailed++;
                console.error(`[cron] âŒ Push hatasÄ± (${err.statusCode}): ${sub.endpoint.slice(0, 60)}â€¦`);
              }
            }
          });
        })
      );
    }

    // â”€â”€ SonuÃ§ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const duration = Date.now() - startTime;
    console.log(
      `[cron] âœ… Master cron tamamlandÄ± â€” email: ${stats.emailSent}, push: ${stats.pushSent}, temizlenen: ${stats.subsCleaned}, sÃ¼re: ${duration}ms`
    );

    return NextResponse.json({
      ok: true,
      ...stats,
      duration: `${duration}ms`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[cron] ğŸ’¥ Kritik hata:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
