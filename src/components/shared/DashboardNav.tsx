"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import type { Route } from "next";
import { Moon, Sun, Coins, Trophy, Plus } from "lucide-react";
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
  
  const [isMounted, setIsMounted] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);
  const [optimisticDelta, setOptimisticDelta] = useState<number>(0);

  const refreshCoins = useCallback(() => {
    getUserCoins().then(setCoins).catch(() => {});
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (auth.status === "authenticated") refreshCoins();
  }, [auth.status, refreshCoins]);

  // Coin değişikliklerini dinle
  useEffect(() => {
    const handler = () => {
      refreshCoins();
      setOptimisticDelta(0);
    };
    const optHandler = (e: Event) => {
      const ev = e as CustomEvent;
      const gain = ev?.detail?.coinGain ?? 0;
      if (typeof gain === "number" && gain > 0) {
        setOptimisticDelta((d) => d + gain);
        toast.success(`+${gain} DP`, { duration: 1200 });
      }
    };
    const rollbackHandler = (_e: Event) => {
      setOptimisticDelta(0);
      toast.error("Ödül alınamadı, işlem geri alındı.");
    };

    window.addEventListener("coins-updated", handler);
    window.addEventListener("coins-optimistic", optHandler as EventListener);
    window.addEventListener("coins-rollback", rollbackHandler as EventListener);
    return () => {
      window.removeEventListener("coins-updated", handler);
      window.removeEventListener("coins-optimistic", optHandler as EventListener);
      window.removeEventListener("coins-rollback", rollbackHandler as EventListener);
    };
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
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/80"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 group select-none">
          <div className="relative h-8 w-8 overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/images/logo.png"
              alt="Zenith"
              fill
              className="object-cover"
              style={{ objectPosition: "50% 18%" }}
              sizes="32px"
            />
          </div>
          <span
            className="max-w-[5.5rem] truncate text-xs font-black uppercase tracking-[0.15em] sm:max-w-none sm:text-sm sm:tracking-[0.2em]"
            style={{ color: "#D6FF00", textShadow: "0 0 10px rgba(214,255,0,0.35)" }}
          >
            ZENITH
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
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

        {/* User menu & Actions */}
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          
          {/* Yeni Rutin Ekleme Butonu (Desktop) */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex gap-1 px-2 text-[#D6FF00] hover:bg-[#D6FF00]/10 sm:gap-1.5 sm:px-3"
            data-testid="add-routine-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-routine-modal"));
            }}
            aria-label="Add Routine"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden lg:inline text-xs font-semibold sm:text-sm">New</span>
          </Button>

          {/* Shop */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 text-[#D6FF00] hover:bg-[#D6FF00]/10 sm:gap-1.5 sm:px-3"
            onClick={() => setShopOpen(true)}
            aria-label={t("shop")}
          >
            <Coins className="h-4 w-4 shrink-0" aria-hidden />
            <span
              className="inline text-xs font-semibold tabular-nums sm:text-sm"
              suppressHydrationWarning
            >
              {coins !== null
                ? (coins + optimisticDelta).toLocaleString("en-US")
                : "—"}
            </span>
          </Button>

          {/* Badges */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-[#D6FF00]/90 hover:bg-[#D6FF00]/10"
            onClick={() => setBadgesOpen(true)}
            aria-label={t("badges")}
          >
            <Trophy className="h-4 w-4" aria-hidden />
          </Button>

          {/* Language Switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative size-10 rounded-full p-0 touch-manipulation" data-testid="user-menu-btn">
                <Avatar className="size-8">
                  <AvatarImage src={auth.user.image ?? undefined} alt={auth.user.name ?? ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium truncate flex items-center gap-1.5">
                  <span className="truncate">{auth.user.name}</span>
                  {auth.isPro && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white leading-none">
                      PRO
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs truncate">{auth.user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                {isMounted && resolvedTheme === "dark" ? (
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

      {/* Dialogs */}
      <ShopDialog open={shopOpen} onOpenChange={setShopOpen} />
      <BadgeGallery open={badgesOpen} onOpenChange={setBadgesOpen} />
      <OnboardingDialog />
      <InstallPrompt />
    </header>
  );
}