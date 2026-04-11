"use server";

import { getSession } from "@/lib/auth";
import {
  createCheckoutSession,
  createBillingPortalSession,
} from "@/services/stripe.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string; email: string | null };
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Kullanıcıyı Stripe Checkout sayfasına yönlendirir.
 * Dönen URL'ye client tarafında `window.location.href` ile redirect yapılır.
 */
export async function createCheckoutAction(): Promise<{ url: string }> {
  const user = await requireUser();
  if (!user.email) throw new Error("Account has no email.");
  const url = await createCheckoutSession(user.id, user.email);
  return { url };
}

/**
 * Kullanıcıyı Stripe Billing Portal'a yönlendirir.
 * Abonelik yönetimi (iptal, kart değiştirme, fatura görüntüleme) için kullanılır.
 */
export async function createCustomerPortalAction(): Promise<{ url: string }> {
  const user = await requireUser();
  const url = await createBillingPortalSession(user.id);
  return { url };
}
