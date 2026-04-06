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

type Props = {
  children: React.ReactNode;
  /** Feature description shown in the upgrade dialog */
  feature?: string;
};

/**
 * Wraps PRO-only UI. FREE users see a disabled wrapper that opens
 * an upgrade dialog on click.
 */
export function ProGate({ children, feature = "this feature" }: Props) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (auth.status !== "authenticated" || auth.isPro) {
    return <>{children}</>;
  }

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
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className="cursor-pointer opacity-60 hover:opacity-80 transition-opacity"
        title={`Upgrade to Pro to unlock ${feature}`}
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Unlock {feature} and everything else Pro has to offer.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 py-2">
            {STRIPE_PLANS.PRO.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground text-lg">
              {STRIPE_PLANS.PRO.price}
            </span>
            /{STRIPE_PLANS.PRO.interval} — cancel anytime
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Maybe later
            </Button>
            <Button onClick={handleUpgrade} disabled={loading}>
              {loading ? "Redirecting…" : "Upgrade Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
