"use client"

import type { ReactNode } from "react"
import type { Session } from "next-auth"
import { SessionProvider } from "next-auth/react"

type Props = {
  children: ReactNode
  /** Server session from getSession() — keeps useSession() in sync on first paint and avoids hydration mismatches */
  session: Session | null
}

export function AuthProvider({ children, session }: Props) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
