// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db"; // İŞTE KRİTİK NOKTA: db.ts'den gelmeli!

export const authOptions: NextAuthOptions = {
  // Veritabanı bağlantısı burada kuruluyor
  adapter: PrismaAdapter(prisma), 
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  // ÖNEMLİ: Callback hatasını engellemek için strateji seçimi
  session: {
    strategy: "jwt", // Veritabanı (database) yerine JWT kullanmak bazen bağlantı yükünü hafifletir
  },

  pages: {
    signIn: "/login",
    error: "/login", // Hata aldığında tekrar login'e atar
  },

  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        // Kullanıcı ID'sini session'a ekleyelim ki Dashboard'da kullanabilesin
        (session.user as any).id = token.sub;
      }
      return session;
    },
    // Google'dan dönen veriyi kontrol edelim
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        return true; // Girişe izin ver
      }
      return true;
    },
  },
  
  // Debug modunu açarsan Vercel loglarında hatayı daha net görürüz
  // src/lib/auth.ts

// ... diğer kodlar aynı

  // BUNU ŞÖYLE DEĞİŞTİR:
  debug: true, 
  secret: process.env.NEXTAUTH_SECRET,
};