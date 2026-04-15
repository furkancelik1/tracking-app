import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * MIDDLEWARE — Locale detection + Session kontrolü
 *
 * 1. next-intl locale prefix'ini işler (redirect / rewrite)
 * 2. Korumalı route'lar için session cookie kontrolü yapar
 *
 * NextAuth "database" session stratejisi → JWT yok.
 * Middleware sadece hızlı "cookie var mı?" kontrolü yapar.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API ve statik dosyaları atla
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // --- Auth kontrolü ---
  // Locale prefix'ini çıkarıp asıl path'i bul
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
    // Statik dosyaları, Clerk public route'ları ve PWA varlıklarını middleware'den hariç tut
    "/((?!api/cron|api/auth|api/webhook|_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-.*|manifest\\.json|.*\\.png|.*\\.jpg|.*\\.ico|.*\\.svg|sign-in|sign-up).*)",
  ],
};