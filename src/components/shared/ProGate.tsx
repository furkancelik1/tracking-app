"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { STRIPE_PLANS } from "@/lib/stripe";
import { useTranslations } from "next-intl";

type Props = {
  children: React.ReactNode;
  /** i18n key suffix for the feature name shown in upgrade dialog */
  feature?: string;
};

/**
 * Wraps PRO-only UI. FREE users see a disabled wrapper that opens
 * an upgrade dialog on click.
 */
export function ProGate({ children, feature }: Props) {
  const auth = useAuth();
  const t = useTranslations("proGate");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (auth.status !== "authenticated" || auth.isPro) {
    return <>{children}</>;
  }

  const featureLabel = feature ?? t("defaultFeature");

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? t("checkoutError"));
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className="cursor-pointer opacity-60 hover:opacity-80 transition-opacity"
        title={t("tooltip", { feature: featureLabel })}
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description", { feature: featureLabel })}
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 py-2">
            {STRIPE_PLANS.PRO.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">âœ“</span>
                {f}
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground text-lg">
              {STRIPE_PLANS.PRO.price}
            </span>
            /{STRIPE_PLANS.PRO.interval} â€” {t("cancelAnytime")}
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("maybeLater")}
            </Button>
            <Button onClick={handleUpgrade} disabled={loading}>
              {loading ? t("redirecting") : t("upgradeNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
