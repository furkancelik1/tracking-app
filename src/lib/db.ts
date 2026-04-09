import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// Geliştirme ortamında hot-reload'da yeni instance oluşmasını engelle.
// Production'da da aynı instance kullanılır (serverless soğuk başlatma hariç).
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}