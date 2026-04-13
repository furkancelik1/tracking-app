import { DashboardNav } from "@/components/shared/DashboardNav";
import { ThemeOverlay } from "@/components/shared/ThemeOverlay";
import { DevCoinButton } from "@/components/dev/DevCoinButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <DashboardNav />
      <ThemeOverlay />
      <main className="mx-auto max-w-6xl">{children}</main>
      {process.env.NODE_ENV === "development" && <DevCoinButton />}
    </div>
  );
}