// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter"; // v4 adapter
import { prisma } from "@/lib/prisma"; // singleton

export const authOptions = {
  adapter: PrismaAdapter(prisma), // db değil, prisma
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.subscriptionTier = token.subscriptionTier ?? "FREE";
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.subscriptionTier = (user as any).subscriptionTier ?? "FREE";
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };