import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionTier, STRIPE_PLANS } from "@/lib/stripe";
import { EmailNotificationsToggle } from "@/components/settings/EmailNotificationsToggle";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";

export const metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      subscriptionTier: true,
      emailNotificationsEnabled: true,
      stripeCustomerId: true,
    },
  });

  const tier = getSubscriptionTier(user.subscriptionTier);
  const isPro = tier === "PRO";

  return (
    <div className="px-6 py-8 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hesap ve bildirim tercihlerini yönet.
        </p>
      </div>

      {/* ── Profil ── */}
      <section className="rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold">Profil</h2>
        <div className="grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">İsim:</span>{" "}
            {user.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">E-posta:</span>{" "}
            {user.email ?? "—"}
          </p>
        </div>
      </section>

      {/* ── Bildirimler ── */}
      <section className="rounded-lg border p-5 space-y-1">
        <h2 className="font-semibold">Bildirimler</h2>
        <EmailNotificationsToggle enabled={user.emailNotificationsEnabled} isPro={isPro} />
      </section>

      {/* ── Abonelik ── */}
      <section>
        <SubscriptionCard
          tier={tier}
          hasStripeCustomer={!!user.stripeCustomerId}
          plan={STRIPE_PLANS.PRO}
        />
      </section>
    </div>
  );
}