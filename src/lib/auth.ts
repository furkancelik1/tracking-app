// src/lib/authOptions.ts

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  // Prisma v6 tipiyle NextAuth adaptörü arasındaki uyuşmazlığı susturuyoruz
  adapter: PrismaAdapter(prisma) as any,
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.subscriptionTier = (user as any).subscriptionTier ?? "FREE";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // TypeScript'in standart user objesinde id ve tier aramamasını sağlıyoruz
        (session.user as any).id = token.id as string;
        (session.user as any).subscriptionTier = (token.subscriptionTier as string) ?? "FREE";
      }
      return session;
    },
  },
};