import { DashboardNav } from "@/components/shared/DashboardNav";
import { BottomNav } from "@/components/shared/BottomNav";
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
      <main className="mx-auto w-full min-w-0 max-w-6xl pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>
      <BottomNav />
      {process.env.NODE_ENV === "development" && <DevCoinButton />}
    </div>
  );
}