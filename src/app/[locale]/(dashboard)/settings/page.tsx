import React from 'react';
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionTier, STRIPE_PLANS } from "@/lib/stripe";
import { EmailNotificationsToggle } from "@/components/settings/EmailNotificationsToggle";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { PushNotificationButton } from "@/components/dashboard/PushNotificationButton";
import { BadgesSettingsSection } from "@/components/settings/BadgesSettingsSection";
import { SoundEffectsToggle } from "@/components/settings/SoundEffectsToggle";
import { PWAInstallSection } from "@/components/settings/PWAInstallSection";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings.metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");
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
      stripeCurrentPeriodEnd: true,
    },
  });

  const tier = getSubscriptionTier(user.subscriptionTier);
  const isPro = tier === "PRO";

  return (
    <div className="px-6 py-8 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Profile ── */}
      <section className="rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold">{t("profile.title")}</h2>
        <div className="grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">{t("profile.name")}</span>{" "}
            {user.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{t("profile.email")}</span>{" "}
            {user.email ?? "—"}
          </p>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold">{t("notifications.title")}</h2>
        <EmailNotificationsToggle enabled={user.emailNotificationsEnabled} isPro={isPro} />
        <PushNotificationButton />
      </section>

      {/* ── Sound Effects ── */}
      <section className="rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold">Sound</h2>
        <SoundEffectsToggle />
      </section>

      {/* ── App Install ── */}
      <PWAInstallSection />

      {/* ── Badges ── */}
      <BadgesSettingsSection />

      {/* ── Abonelik ── */}
      <section>
        <SubscriptionCard
          tier={tier}
          hasStripeCustomer={!!user.stripeCustomerId}
          plan={STRIPE_PLANS.PRO}
          periodEnd={
            user.stripeCurrentPeriodEnd
              ? user.stripeCurrentPeriodEnd.toLocaleDateString(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : null
          }
        />
      </section>
    </div>
  );
}