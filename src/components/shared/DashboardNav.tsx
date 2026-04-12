"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Route } from "next";
import { Moon, Sun, Coins, Trophy } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ShopDialog } from "@/components/dashboard/ShopDialog";
import { BadgeGallery } from "@/components/dashboard/BadgeGallery";
import { OnboardingDialog } from "@/components/dashboard/OnboardingDialog";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { getUserCoins } from "@/actions/shop.actions";

const NAV_KEYS = [
  { href: "/dashboard" as Route, key: "routines" },
  { href: "/marketplace" as Route, key: "marketplace" },
  { href: "/social" as Route, key: "social" },
  { href: "/leaderboard" as Route, key: "leaderboard" },
  { href: "/settings" as Route, key: "settings" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("nav");
  const [shopOpen, setShopOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);

  const refreshCoins = useCallback(() => {
    getUserCoins().then(setCoins).catch(() => {});
  }, []);

  useEffect(() => {
    if (auth.status === "authenticated") refreshCoins();
  }, [auth.status, refreshCoins]);

  // Coin değişikliklerini dinle (onboarding, shop, rutin tamamlama vb.)
  useEffect(() => {
    const handler = () => refreshCoins();
    window.addEventListener("coins-updated", handler);
    return () => window.removeEventListener("coins-updated", handler);
  }, [refreshCoins]);

  if (auth.status !== "authenticated") return null;

  const initials = auth.user.name
    ? auth.user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="border-b bg-card sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="font-semibold text-sm flex items-center gap-2">
          <span className="size-5 rounded-full bg-primary inline-block" />
          {t("logo")}
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_KEYS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* User menu */}
        <div className="flex items-center gap-2">
          {/* Coin display & shop */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => setShopOpen(true)}
          >
            <Coins className="h-4 w-4" />
            <span className="text-sm font-semibold tabular-nums">
              {coins !== null ? coins.toLocaleString() : "—"}
            </span>
          </Button>
          {/* Badge gallery */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2"
            onClick={() => setBadgesOpen(true)}
          >
            <Trophy className="h-4 w-4" />
          </Button>
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative size-8 rounded-full p-0">
                <Avatar className="size-8">
                  <AvatarImage src={auth.user.image ?? undefined} alt={auth.user.name ?? ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium truncate">{auth.user.name}</p>
                <p className="text-muted-foreground text-xs truncate">{auth.user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    {t("lightMode")}
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    {t("darkMode")}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void auth.signOut()}>
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ShopDialog open={shopOpen} onOpenChange={setShopOpen} />
      <BadgeGallery open={badgesOpen} onOpenChange={setBadgesOpen} />
      <OnboardingDialog />
      <InstallPrompt />
    </header>
  );
}
