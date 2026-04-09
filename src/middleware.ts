import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * MIDDLEWARE — Session kontrolü
 *
 * KRITIK NOT: NextAuth "database" session stratejisi kullanıyoruz.
 * Bu durumda `getToken()` (JWT bazlı) ÇALIŞMAZ çünkü JWT token üretilmez.
 * Bunun yerine session cookie'sinin varlığını kontrol ediyoruz.
 *
 * Gerçek session doğrulaması sunucu tarafında (getServerSession) yapılır.
 * Middleware sadece hızlı bir "cookie var mı?" kontrolü yapar.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuth database strategy cookie adı:
  // Production'da (HTTPS): __Secure-next-auth.session-token
  // Development'ta (HTTP):  next-auth.session-token
  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const sessionToken = req.cookies.get(cookieName)?.value;

  const protectedPaths = ["/dashboard", "/settings", "/admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Korumalı sayfa + session cookie yok → login'e yönlendir
  if (isProtected && !sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin kontrolü — cookie var ama admin değilse yönlendir
  // Not: Middleware'de tam admin doğrulaması yapamayız (DB erişimi yok).
  // Admin guard asıl olarak src/lib/auth.ts → requireAdmin() ile yapılır.
  // Burada sadece ek bir güvenlik katmanı olarak ADMIN_EMAILS kontrolü yapılabilir
  // ama JWT olmadan email bilgisine erişemeyiz, bu yüzden bu kontrolü server-side'a bırakıyoruz.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};