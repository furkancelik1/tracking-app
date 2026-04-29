import { PrismaClient } from "@prisma/client";

const TEST_EMAILS = [
  "e2e-user-a@test.local",
  "e2e-user-b@test.local",
  "e2e-free@test.local",
  "e2e-pro@test.local",
];

export default async function globalTeardown() {
  if (!process.env.DATABASE_URL) return;

  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({
      where: { email: { in: TEST_EMAILS } },
    });
    console.log("[E2E Teardown] Test users removed.");
  } finally {
    await prisma.$disconnect();
  }
}
