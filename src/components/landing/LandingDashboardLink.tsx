"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Oturum varsa /dashboard, yoksa /login */
export function LandingDashboardLink({ children, className }: Props) {
  const auth = useAuth();
  const href = auth.status === "authenticated" ? "/dashboard" : "/login";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
