import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Note: @prisma/client cannot be imported in Edge Runtime.
// Use string literal instead of Role enum.
const ADMIN_ROLE = "ADMIN";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Unauthenticated users are redirected to the sign-in page.
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route guard — redirect non-admins back to dashboard.
  if (pathname.startsWith("/admin") && token.role !== ADMIN_ROLE) {
    return NextResponse.redirect(new URL("/basket", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude auth and framework internals to avoid sign-in redirect loops.
    "/((?!api|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};
