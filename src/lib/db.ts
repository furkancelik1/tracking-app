import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// GeliÅŸtirme ortamÄ±nda hot-reload'da yeni instance oluÅŸmasÄ±nÄ± engelle.
// Production'da da aynÄ± instance kullanÄ±lÄ±r (serverless soÄŸuk baÅŸlatma hariÃ§).
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
