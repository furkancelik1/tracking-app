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
        toast.error(json.error ?? "Ã–deme baÅŸlatÄ±lamadÄ±.");
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
            <span className="font-semibold">Limit doldu</span> â€” Ãœcretsiz planda
            en fazla {limit} rutin oluÅŸturabilirsin.
          </>
        ) : (
          <>
            <span className="font-semibold">
              {count}/{limit} rutin
            </span>{" "}
            â€” SÄ±nÄ±rsÄ±z rutin iÃ§in PRO&apos;ya geÃ§.
          </>
        )}
      </p>
      <Button size="sm" onClick={handleUpgrade} disabled={loading}>
        {loading ? "YÃ¶nlendiriliyorâ€¦" : "PRO'ya GeÃ§"}
      </Button>
    </div>
  );
}
