import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { STRIPE_PLANS, TIER_LIMITS } from "@/lib/stripe";

export default async function SettingsPage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      subscriptionTier: true,
      stripeSubId: true,
      _count: { select: { basketItems: true } },
    },
  });

  if (!user) return null;

  const tier = user.subscriptionTier;
  const limit = TIER_LIMITS[tier];
  const basketCount = user._count.basketItems;

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and subscription
        </p>
      </div>

      {/* Account info */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Account
        </h2>
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <Row label="Name" value={user.name ?? "—"} />
          <Row label="Email" value={user.email ?? "—"} />
          <Row
            label="Basket items"
            value={`${basketCount} / ${limit === Infinity ? "∞" : limit}`}
          />
        </div>
      </section>

      {/* Subscription */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Subscription
        </h2>
        <SubscriptionCard
          tier={tier}
          hasStripeCustomer={!!user.stripeSubId}
          plan={STRIPE_PLANS.PRO}
        />
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
