import {from "react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin guard — redirects non-admins to /basket
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-3 text-sm font-medium text-muted-foreground">
        Admin Panel
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
