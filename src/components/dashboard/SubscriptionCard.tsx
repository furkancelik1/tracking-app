"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import type { STRIPE_PLANS, SubscriptionTier } from "@/lib/stripe";
import { motion } from "framer-motion";

type Plan = (typeof STRIPE_PLANS)["PRO"];

type Props = {
  tier: SubscriptionTier;
  hasStripeCustomer: boolean;
  plan: Plan;
  periodEnd?: string | null;
};

export function SubscriptionCard({ tier, hasStripeCustomer, plan, periodEnd }: Props) {
  const router = useRouter();
  const t = useTranslations("settings.subscription");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const isPro = tier === "PRO";

  async function handleCheckout() {
    setLoading("checkout");
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/v1/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="rounded-lg p-5 space-y-4 glass-card dark-surface retro-border theme-surface border border-white/10"
    >
      {/* Current plan */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{isPro ? t("proPlan") : t("freePlan")}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPro ? t("proDescription") : t("freeDescription")}
          </p>
        </div>
        <Badge variant={isPro ? "default" : "secondary"}>
          {isPro ? tc("pro") : tc("free")}
        </Badge>
      </div>

      {!isPro && (
        <>
          <Separator />

          {/* Pro plan benefits */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-sm">{t("upgrade")}</p>
              <p className="text-sm">
                <span className="font-bold text-lg">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </p>
            </div>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">âœ“</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={handleCheckout}
              disabled={loading !== null}
            >
              {loading === "checkout" ? "..." : t("upgrade")}
            </Button>
          </div>
        </>
      )}

      {isPro && hasStripeCustomer && (
        <>
          <Separator />
          <div className="space-y-2">
            {periodEnd && (
              <p className="text-sm text-muted-foreground">
                {t("renewsOn", { date: periodEnd })}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("manageDescription")}
            </p>
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={loading !== null}
            >
              {loading === "portal" ? "..." : t("manageBilling")}
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
