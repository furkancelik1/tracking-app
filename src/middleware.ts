import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * MIDDLEWARE â€” Locale detection + Session kontrolÃ¼
 *
 * 1. next-intl locale prefix'ini iÅŸler (redirect / rewrite)
 * 2. KorumalÄ± route'lar iÃ§in session cookie kontrolÃ¼ yapar
 *
 * NextAuth "database" session stratejisi â†’ JWT yok.
 * Middleware sadece hÄ±zlÄ± "cookie var mÄ±?" kontrolÃ¼ yapar.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API ve statik dosyalarÄ± atla
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // --- Auth kontrolÃ¼ ---
  // Locale prefix'ini Ã§Ä±karÄ±p asÄ±l path'i bul
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
      // Locale-aware login redirect
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
    // Statik dosyalarÄ±, Clerk public route'larÄ± ve PWA varlÄ±klarÄ±nÄ± middleware'den hariÃ§ tut
    "/((?!api/cron|api/auth|api/webhook|_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-.*|manifest\\.json|.*\\.png|.*\\.jpg|.*\\.ico|.*\\.svg|sign-in|sign-up).*)",
  ],
};
