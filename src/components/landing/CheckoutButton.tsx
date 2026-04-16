"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function CheckoutButton() {
  const t = useTranslations("landing.pricing.pro");
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (auth.status !== "authenticated") {
      window.location.href = "/login?next=/settings";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Ã–deme baÅŸlatÄ±lamadÄ±.");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      toast.error("Bir hata oluÅŸtu, lÃ¼tfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "..." : t("cta")}
    </Button>
  );
}
