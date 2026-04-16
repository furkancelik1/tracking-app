import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Proxy — Locale detection + session check
 *
 * 1. Handles locale prefixes via next-intl (redirect/rewrite)
 * 2. Performs lightweight cookie-based auth checks on protected paths
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API and static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // --- Auth check ---
  const segments = pathname.split("/");
  const locales = routing.locales as readonly string[];
  const pathWithoutLocale =
    segments.length > 1 && locales.includes(segments[1] as string)
      ? "/" + segments.slice(2).join("/")
      : pathname;

  const protectedPaths = ["/dashboard", "/settings", "/admin", "/marketplace", "/social", "/leaderboard", "/stats", "/basket"];
  const isProtected = protectedPaths.some((p) =>
    pathWithoutLocale.startsWith(p)
  );

  if (isProtected) {
    const isSecure = req.nextUrl.protocol === "https:";
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const sessionToken = req.cookies.get(cookieName)?.value;

    if (!sessionToken) {
      const locale =
        segments.length > 1 && locales.includes(segments[1] as string)
          ? segments[1]
          : routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- Locale handling ---
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api/cron|api/auth|api/webhook|_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-.*|manifest\\.json|.*\\.png|.*\\.jpg|.*\\.ico|.*\\.svg|sign-in|sign-up).*)",
  ],
};
