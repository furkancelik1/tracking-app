"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SubscriptionTier } from "@prisma/client";
import type { STRIPE_PLANS } from "@/lib/stripe";

type Plan = (typeof STRIPE_PLANS)["PRO"];

type Props = {
  tier: SubscriptionTier;
  hasStripeCustomer: boolean;
  plan: Plan;
};

export function SubscriptionCard({ tier, hasStripeCustomer, plan }: Props) {
  const router = useRouter();
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
    <div className="rounded-lg border p-5 space-y-4">
      {/* Current plan */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{isPro ? "Pro Plan" : "Free Plan"}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPro
              ? "Full access — unlimited basket items"
              : "Up to 5 basket items"}
          </p>
        </div>
        <Badge variant={isPro ? "default" : "secondary"}>
          {isPro ? "PRO" : "FREE"}
        </Badge>
      </div>

      {!isPro && (
        <>
          <Separator />

          {/* Pro plan benefits */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-sm">Upgrade to Pro</p>
              <p className="text-sm">
                <span className="font-bold text-lg">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </p>
            </div>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={handleCheckout}
              disabled={loading !== null}
            >
              {loading === "checkout" ? "Redirecting…" : "Upgrade to Pro"}
            </Button>
          </div>
        </>
      )}

      {isPro && hasStripeCustomer && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Manage payment method, invoices, or cancel subscription.
            </p>
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={loading !== null}
            >
              {loading === "portal" ? "Opening…" : "Manage Billing"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
