// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type {
  Adapter,
  AdapterUser,
  AdapterSession,
  AdapterAccount,
} from "next-auth/adapters";

// ─── Custom Prisma Adapter (Prisma v6 uyumlu) ────────────────────────────────

function CustomPrismaAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">) {
      return prisma.user.create({ data }) as unknown as AdapterUser;
    },
    async getUser(id) {
      return prisma.user.findUnique({
        where: { id },
      }) as Promise<AdapterUser | null>;
    },
    async getUserByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
      }) as Promise<AdapterUser | null>;
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: { provider, providerAccountId },
        },
        include: { user: true },
      });
      return (account?.user ?? null) as AdapterUser | null;
    },
    async updateUser({ id, ...data }) {
      return prisma.user.update({
        where: { id },
        data,
      }) as unknown as AdapterUser;
    },
    async linkAccount(data: AdapterAccount) {
      await prisma.account.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token ?? null,
          access_token: data.access_token ?? null,
          expires_at: data.expires_at ?? null,
          token_type: data.token_type ?? null,
          scope: data.scope ?? null,
          id_token: data.id_token ?? null,
          session_state: (data.session_state as string) ?? null,
        },
      });
      return data;
    },
    async createSession(data) {
      return prisma.session.create({ data }) as unknown as AdapterSession;
    },
    async getSessionAndUser(sessionToken) {
      const result = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!result) return null;
      const { user, ...session } = result;
      return {
        session: session as unknown as AdapterSession,
        user: user as unknown as AdapterUser,
      };
    },
    async updateSession({ sessionToken, ...data }) {
      return prisma.session.update({
        where: { sessionToken },
        data,
      }) as unknown as AdapterSession;
    },
    async deleteSession(sessionToken) {
      return prisma.session.delete({
        where: { sessionToken },
      }) as unknown as AdapterSession;
    },
  };
}

// ─── NextAuth Options ────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  adapter: CustomPrismaAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "database",
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async session({ session, user }) {
      if (user && session.user) {
        (session.user as any).id = user.id;
        (session.user as any).subscriptionTier =
          (user as any).subscriptionTier ?? "FREE";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Server-side session getter.
 * Kullanım: API route'larında ve Server Component'larda.
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Oturum zorunlu olan sayfalarda kullanılır.
 * Oturum yoksa /login'e yönlendirir.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session as typeof session & {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscriptionTier: string;
    };
  };
}

/**
 * Admin sayfaları için guard.
 * Oturum yoksa /login'e, admin değilse /dashboard'a yönlendirir.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  // Şu an admin rolü DB'de tutulmuyor; ileride genişletilebilir.
  // Geçici olarak sadece oturum kontrolü yapılıyor.
  // Gerçek admin kontrolü için User modeline role alanı eklenebilir.
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { email: true },
  });
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!user?.email || !adminEmails.includes(user.email)) {
    redirect("/dashboard");
  }
  return session;
}