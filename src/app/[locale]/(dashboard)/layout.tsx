import React from "react";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { ThemeOverlay } from "@/components/shared/ThemeOverlay";
import { ThemeTransition } from "@/components/shared/ThemeTransition";
import { DevCoinButton } from "@/components/dev/DevCoinButton";
import { SplashScreen } from "@/components/ui/SplashScreen";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <SplashScreen />
      <DashboardNav />
      <ThemeOverlay />
      <ThemeTransition />
      <main className="mx-auto max-w-6xl">{children}</main>
      {process.env.NODE_ENV === "development" && <DevCoinButton />}
    </div>
  );
}