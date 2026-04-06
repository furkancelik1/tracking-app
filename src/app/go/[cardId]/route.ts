import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ cardId: string }> };

/**
 * GET /go/[cardId]
 *
 * Affiliate tracking redirect:
 *  1. Validates the card exists and has an affiliate URL
 *  2. Logs an AFFILIATE_CLICK in ActivityLog (fire-and-forget)
 *  3. Issues a 302 redirect to the affiliate URL
 *
 * Works for both authenticated users (full tracking) and
 * unauthenticated visitors (redirect only, no log).
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId, isActive: true },
    select: { affiliateUrl: true, title: true },
  });

  if (!card?.affiliateUrl) {
    return NextResponse.json(
      { error: "No affiliate URL for this card." },
      { status: 404 }
    );
  }

  // Log click if authenticated — non-blocking
  const session = await getSession();
  if (session?.user) {
    prisma.activityLog
      .create({
        data: {
          userId: session.user.id,
          cardId,
          action: "AFFILIATE_CLICK",
          metadata: { affiliateUrl: card.affiliateUrl, title: card.title },
        },
      })
      .catch(() => {/* non-critical */});
  }

  // 302 so the browser always re-checks (affiliate URLs can rotate)
  return NextResponse.redirect(card.affiliateUrl, { status: 302 });
}
