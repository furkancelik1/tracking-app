import { getSession } from "@/lib/auth";
import { DashboardNav } from "@/components/shared/DashboardNav";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Middleware zaten koruyor ama ekstra güvenlik için kontrol
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="mx-auto max-w-6xl">{children}</main>
    </div>
  );
}