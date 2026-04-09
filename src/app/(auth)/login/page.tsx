import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { EmailNotificationsToggle } from "@/components/settings/EmailNotificationsToggle";
import { STRIPE_PLANS, TIER_LIMITS, getSubscriptionTier } from "@/lib/stripe";

export default async function SettingsPage() {
  const session = await requireAuth();
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      subscriptionTier: true,
      emailNotificationsEnabled: true,
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { routines: { where: { isActive: true } } } },
    },
  });

  if (!user) return null;

  const tier = getSubscriptionTier(user.subscriptionTier);
  const isPro = tier === "PRO";
  const limit = TIER_LIMITS[tier];
  const routineCount = user._count.routines;

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Hesabını ve aboneliğini yönet
        </p>
      </div>

      {/* Hesap bilgisi */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Hesap
        </h2>
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <Row label="Ad" value={user.name ?? "—"} />
          <Row label="E-posta" value={user.email ?? "—"} />
          <Row
            label="Rutinler"
            value={`${routineCount} / ${limit === Infinity ? "∞" : limit}`}
          />
        </div>
      </section>

      {/* Abonelik */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Abonelik
        </h2>
        <SubscriptionCard
          tier={tier}
          hasStripeCustomer={!!user.stripeCustomerId}
          plan={STRIPE_PLANS.PRO}
        />
      </section>

      {/* Bildirimler */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bildirimler
        </h2>
        <div className="rounded-lg border p-4 divide-y">
          <EmailNotificationsToggle
            enabled={user.emailNotificationsEnabled}
            isPro={isPro}
          />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}