"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function DashboardEmptyState() {
  const t = useTranslations("dashboard.emptyState");
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
        <CalendarPlus className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        {t("title")}
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        {t("description")}
      </p>
      <Button className="mt-6" size="sm" asChild>
        <a href="/dashboard">{t("cta")}</a>
      </Button>
    </div>
  );
}
