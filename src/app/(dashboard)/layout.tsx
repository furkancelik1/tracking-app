import { requireAuth } from "@/lib/auth";
import { DashboardNav } from "@/components/shared/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="mx-auto max-w-6xl">{children}</main>
    </div>
  );
}
