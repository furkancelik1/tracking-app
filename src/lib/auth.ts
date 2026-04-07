import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
type Role = "USER" | "ADMIN";
/**
 * Server-side auth helper. Returns the session or redirects to /login.
 * Use inside Server Components and Route Handlers.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Server-side admin guard. Redirects non-admins to /basket.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.subscriptionTier !== "PRO") {
    redirect("/basket" as any);
  }
  return session;
}

/**
 * Returns the session without redirecting — use in API route handlers
 * to return 401 instead of redirecting.
 */
export async function getSession() {
  return getServerSession(authOptions);
}
