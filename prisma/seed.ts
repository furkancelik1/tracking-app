import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ─── Neon Purple Theme ───────────────────────────────────────────────────────
  const existing = await prisma.shopItem.findFirst({
    where: { name: "Neon Purple" },
  });

  if (!existing) {
    await prisma.shopItem.create({
      data: {
        name: "Neon Purple",
        description: "Deep violet glows for focused minds.",
        price: 500,
        category: "THEME",
        isActive: true,
        metadata: {
          primary: "#a855f7",    // purple-500
          secondary: "#7c3aed", // violet-600
          accent: "#c084fc",    // purple-400
          glow: "rgba(168, 85, 247, 0.32)",
        },
      },
    });
    console.log("✓ Neon Purple theme seeded");
  } else {
    console.log("⟳ Neon Purple already exists, skipping");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
