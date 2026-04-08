import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
// 1. KRİTİK NOKTA: db'yi doğru import ettiğinden emin ol.
// Senin db.ts dosyan nerede duruyorsa yolu ona göre ver. Örneğin:
import { db } from "@/lib/db"; 

// 2. KRİTİK NOKTA: Eğer bu dosyanın en üstünde veya herhangi bir yerinde
// export const runtime = "edge"; 
// yazıyorsa, ONU KESİNLİKLE SİL! Prisma standart sürümde Edge'de çalışmaz.

export const authOptions: NextAuthOptions = {
  // 3. KRİTİK NOKTA: db nesnesini adaptöre bu şekilde ver
  adapter: PrismaAdapter(db), 
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt", // Prisma kullansan bile JWT stratejisi Google için daha stabildir
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  // İsteğe bağlı: Callbacks ile oturum bilgilerini zenginleştirebilirsin
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };