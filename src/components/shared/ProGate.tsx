"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";

type Props = {
  children: React.ReactNode;
};

export function ProGate({ children }: Props) {
  const auth = useAuth();
  const t = useTranslations("proGate");
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
        toast.error(json.error ?? t("checkoutError"));
        return;
      }
      window.location.href = json.data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none blur-sm brightness-75">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/50 p-6 text-center backdrop-blur-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("proOnly")}</p>
        </div>
        <Button size="sm" onClick={handleUpgrade} disabled={loading}>
          {loading ? t("redirecting") : t("upgradeNow")}
        </Button>
      </div>
    </div>
  );
}
