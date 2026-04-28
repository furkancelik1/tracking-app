"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Shown on pages where a FREE user hits the plan limit.
 * Pass `count` and `limit` from the parent so this component
 * stays decoupled from any specific data hook.
 */
type Props = {
  count: number;
  limit: number;
};

export function UpgradeBanner({ count, limit }: Props) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  if (auth.status !== "authenticated" || auth.isPro) return null;

  const atLimit = count >= limit;
  const nearLimit = count >= limit - 1;

  if (!nearLimit) return null;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Ödeme başlatılamadı.");
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
      <p className="text-amber-800 dark:text-amber-200">
        {atLimit ? (
          <>
            <span className="font-semibold">Limit doldu</span> — Ücretsiz planda
            en fazla {limit} rutin oluşturabilirsin.
          </>
        ) : (
          <>
            <span className="font-semibold">
              {count}/{limit} rutin
            </span>{" "}
            — Sınırsız rutin için PRO&apos;ya geç.
          </>
        )}
      </p>
      <Button
        size="sm"
        onClick={handleUpgrade}
        disabled={loading}
        className="touch-manipulation min-h-[44px] sm:min-h-0 w-full sm:w-auto"
      >
        {loading ? "Yönlendiriliyor…" : "PRO'ya Geç"}
      </Button>
    </div>
  );
}
