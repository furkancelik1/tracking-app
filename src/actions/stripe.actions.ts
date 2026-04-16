"use server";

import { getSession } from "@/lib/auth";
import {
  createCheckoutSession,
  createBillingPortalSession,
} from "@/services/stripe.service";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as { id: string; email: string | null };
}

// â”€â”€â”€ Server Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * KullanÄ±cÄ±yÄ± Stripe Checkout sayfasÄ±na yÃ¶nlendirir.
 * DÃ¶nen URL'ye client tarafÄ±nda `window.location.href` ile redirect yapÄ±lÄ±r.
 */
export async function createCheckoutAction(): Promise<{ url: string }> {
  const user = await requireUser();
  if (!user.email) throw new Error("Account has no email.");
  const url = await createCheckoutSession(user.id, user.email);
  return { url };
}

/**
 * KullanÄ±cÄ±yÄ± Stripe Billing Portal'a yÃ¶nlendirir.
 * Abonelik yÃ¶netimi (iptal, kart deÄŸiÅŸtirme, fatura gÃ¶rÃ¼ntÃ¼leme) iÃ§in kullanÄ±lÄ±r.
 */
export async function createCustomerPortalAction(): Promise<{ url: string }> {
  const user = await requireUser();
  const url = await createBillingPortalSession(user.id);
  return { url };
}
