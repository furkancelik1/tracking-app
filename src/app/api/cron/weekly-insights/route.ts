import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyInsightEmail } from "@/lib/mail";
import { generateWeeklyInsightsForProUsers } from "@/actions/ai.actions";
import { timingSafeEqual } from "crypto";
import { getISOWeek, getISOWeekYear } from "date-fns";

export const runtime = "nodejs";
export const maxDuration = 120;

const EMAIL_BATCH_SIZE = 5;

// ── Timing-safe secret karşılaştırma ─────────────────────────────────────────
function isValidSecret(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  const year = getISOWeekYear(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// ─── GET /api/cron/weekly-insights ───────────────────────────────────────────
// Haftada bir kez Pazar günü çalıştırılır.
// 1) PRO kullanıcılar için AI insight üretir (henüz yoksa).
// 2) Bildirimleri açık olan PRO kullanıcılara e-posta gönderir.

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // ── 1) Güvenlik ───────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  const authHeader = req.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = req.nextUrl.searchParams.get("secret");
  const token = headerToken ?? queryToken;

  const isAuthorized =
    isVercelCron || (!!cronSecret && !!token && isValidSecret(token, cronSecret));

  if (!isAuthorized) {
    console.warn("[weekly-insights] ⛔ Yetkisiz erişim.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = { insightsGenerated: 0, insightsFailed: 0, insightsSkipped: 0, emailSent: 0, emailFailed: 0 };

  try {
    // ── 2) AI Insight Toplu Üretimi ─────────────────────────────────────────
    const genResult = await generateWeeklyInsightsForProUsers();
    stats.insightsGenerated = genResult.generated;
    stats.insightsFailed = genResult.failed;
    stats.insightsSkipped = genResult.skipped;

    // ── 3) E-posta Gönderimi (PRO + email bildirim açık) ────────────────────
    const weekKey = getCurrentWeekKey();

    const usersWithInsights = await prisma.weeklyInsight.findMany({
      where: { weekKey },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            language: true,
            subscriptionTier: true,
            emailNotificationsEnabled: true,
          },
        },
      },
    });

    const emailTargets = usersWithInsights.filter(
      (wi) =>
        wi.user.subscriptionTier === "PRO" &&
        wi.user.emailNotificationsEnabled &&
        wi.user.email
    );

    for (let i = 0; i < emailTargets.length; i += EMAIL_BATCH_SIZE) {
      if (Date.now() - startTime > 90_000) {
        console.warn(`[weekly-insights] ⏱ Timeout — ${i}/${emailTargets.length} e-posta işlendi`);
        break;
      }

      const batch = emailTargets.slice(i, i + EMAIL_BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((wi) =>
          sendWeeklyInsightEmail({
            to: wi.user.email!,
            userName: wi.user.name ?? "User",
            insight: wi.summary,
            language: wi.user.language,
          })
        )
      );

      for (const r of results) {
        if (r.status === "fulfilled") stats.emailSent++;
        else stats.emailFailed++;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[weekly-insights] ✅ Tamamlandı (${elapsed}ms)`, stats);

    return NextResponse.json({
      ok: true,
      elapsed: `${elapsed}ms`,
      ...stats,
    });
  } catch (error) {
    console.error("[weekly-insights] ❌ Beklenmeyen hata:", error);
    return NextResponse.json(
      { error: "Internal server error", ...stats },
      { status: 500 }
    );
  }
}
