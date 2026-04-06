"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBasket } from "@/hooks/useBasket";

/**
 * Shown at the top of the basket page for FREE users who are
 * approaching or at their item limit.
 */
export function UpgradeBanner() {
  const auth = useAuth();
  const { data: items = [] } = useBasket();
  const [loading, setLoading] = useState(false);

  if (auth.status !== "authenticated" || auth.isPro) return null;

  // TIER_LIMITS'i stripe dosyasından çekmek yerine şimdilik buraya sabitliyoruz.
  // İleride bunu ortak bir constants (sabitler) dosyasına taşıyabilirsin.
  const limit = 5; 
  const count = items.length;
  const atLimit = count >= limit;
  const nearLimit = count >= limit - 1;

  if (!nearLimit) return null;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 flex items-center justify-between gap-4 text-sm">
      <p className="text-amber-800 dark:text-amber-200">
        {atLimit ? (
          <>
            <span className="font-semibold">Basket is full</span> — Free plan
            allows {limit} items.
          </>
        ) : (
          <>
            <span className="font-semibold">
              {count}/{limit} items
            </span>{" "}
            — Upgrade for unlimited basket items.
          </>
        )}
      </p>
      <Button size="sm" onClick={handleUpgrade} disabled={loading}>
        {loading ? "Redirecting…" : "Upgrade to Pro"}
      </Button>
    </div>
  );
}