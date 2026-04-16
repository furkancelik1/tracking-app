import React from "react";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function LandingHeader() {
  const session = await getSession();
  const isLoggedIn = !!session?.user;
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
          <Image
            src="/icons/logo-192x192.png"
            alt="Zenith"
            width={20}
            height={20}
            className="rounded-md"
          />
          {tc("appName")}
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <a
            href="#features"
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          >
            {t("header.features")}
          </a>
          <a
            href="#pricing"
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          >
            {t("header.pricing")}
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          >
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">{t("header.goToDashboard")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">{t("header.signIn")}</Link>
            </Button>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export function LandingHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <div className="h-5 w-28 rounded-md bg-muted animate-pulse" />
        <div className="h-8 w-40 rounded-md bg-muted animate-pulse" />
      </div>
    </header>
  );
}
