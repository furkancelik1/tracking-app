import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { resetWeeklyLeagueRankingCronAction } from "@/actions/social.actions";

export const runtime = "nodejs";
export const maxDuration = 30;

function isValidSecret(token: string, secret: string): boolean {
  if (token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  const authHeader = req.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = req.nextUrl.searchParams.get("secret");
  const token = headerToken ?? queryToken;

  const isAuthorized =
    isVercelCron || (!!cronSecret && !!token && isValidSecret(token, cronSecret));

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetWeeklyLeagueRankingCronAction();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/league-reset] unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
