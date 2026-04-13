import { DashboardNav } from "@/components/shared/DashboardNav";
import { ThemeOverlay } from "@/components/shared/ThemeOverlay";

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
    </div>
  );
}