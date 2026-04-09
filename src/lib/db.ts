// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Bu yapı, Next.js her yenilendiğinde 100 tane veritabanı bağlantısı 
// açılmasını engeller (Singleton Pattern)
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;