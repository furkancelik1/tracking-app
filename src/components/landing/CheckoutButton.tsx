"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Props = {
  isLoggedIn: boolean;
};

export function CheckoutButton({ isLoggedIn }: Props) {
  const t = useTranslations("landing.pricing.pro");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!isLoggedIn) {
      window.location.href = "/login?next=/settings";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Ödeme başlatılamadı.");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      toast.error("Bir hata oluştu, lütfen tekrar dene.");
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
