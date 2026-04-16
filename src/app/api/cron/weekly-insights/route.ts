import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyInsightEmail } from "@/lib/mail";
import { generateWeeklyInsightsForProUsers } from "@/actions/ai.actions";
import { timingSafeEqual } from "crypto";
import { getISOWeek, getISOWeekYear } from "date-fns";

export const runtime = "nodejs";
export const maxDuration = 120;

const EMAIL_BATCH_SIZE = 5;

// â”€â”€ Timing-safe secret karÅŸÄ±laÅŸtÄ±rma â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/cron/weekly-insights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Haftada bir kez Pazar gÃ¼nÃ¼ Ã§alÄ±ÅŸtÄ±rÄ±lÄ±r.
// 1) PRO kullanÄ±cÄ±lar iÃ§in AI insight Ã¼retir (henÃ¼z yoksa).
// 2) Bildirimleri aÃ§Ä±k olan PRO kullanÄ±cÄ±lara e-posta gÃ¶nderir.

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // â”€â”€ 1) GÃ¼venlik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  const authHeader = req.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = req.nextUrl.searchParams.get("secret");
  const token = headerToken ?? queryToken;

  const isAuthorized =
    isVercelCron || (!!cronSecret && !!token && isValidSecret(token, cronSecret));

  if (!isAuthorized) {
    console.warn("[weekly-insights] â›” Yetkisiz eriÅŸim.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = { insightsGenerated: 0, insightsFailed: 0, insightsSkipped: 0, emailSent: 0, emailFailed: 0 };

  try {
    // â”€â”€ 2) AI Insight Toplu Ãœretimi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const genResult = await generateWeeklyInsightsForProUsers();
    stats.insightsGenerated = genResult.generated;
    stats.insightsFailed = genResult.failed;
    stats.insightsSkipped = genResult.skipped;

    // â”€â”€ 3) E-posta GÃ¶nderimi (PRO + email bildirim aÃ§Ä±k) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        console.warn(`[weekly-insights] â± Timeout â€” ${i}/${emailTargets.length} e-posta iÅŸlendi`);
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
    console.log(`[weekly-insights] âœ… TamamlandÄ± (${elapsed}ms)`, stats);

    return NextResponse.json({
      ok: true,
      elapsed: `${elapsed}ms`,
      ...stats,
    });
  } catch (error) {
    console.error("[weekly-insights] âŒ Beklenmeyen hata:", error);
    return NextResponse.json(
      { error: "Internal server error", ...stats },
      { status: 500 }
    );
  }
}
