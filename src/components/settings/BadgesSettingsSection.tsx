"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeGallery } from "@/components/dashboard/BadgeGallery";
import { useTranslations } from "next-intl";

export function BadgesSettingsSection() {
  const t = useTranslations("settings.badges");
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="rounded-lg border p-5 space-y-3">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <Trophy className="h-4 w-4" style={{ color: "#39FF14", filter: "drop-shadow(0 0 4px #39FF14)" }} />
          {t("viewAll")}
        </Button>
      </section>

      <BadgeGallery open={open} onOpenChange={setOpen} />
    </>
  );
}
