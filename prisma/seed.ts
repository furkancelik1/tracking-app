import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const THEMES = [
  {
    name: "Neon Purple",
    description: "Deep violet glows for focused minds.",
    price: 500,
    metadata: {
      primary: "#a855f7",
      secondary: "#7c3aed",
      accent: "#c084fc",
      glow: "rgba(168, 85, 247, 0.32)",
    },
  },
  {
    name: "Zen Mode Focus",
    description: "Soft teal — calm clarity for deep work sessions.",
    price: 350,
    metadata: {
      primary: "#5eead4",
      secondary: "#0d9488",
      accent: "#99f6e4",
      glow: "rgba(94, 234, 212, 0.25)",
    },
  },
];

async function main() {
  for (const theme of THEMES) {
    const existing = await prisma.shopItem.findFirst({
      where: { name: theme.name },
    });

    if (!existing) {
      await prisma.shopItem.create({
        data: {
          name: theme.name,
          description: theme.description,
          price: theme.price,
          category: "THEME",
          isActive: true,
          metadata: theme.metadata,
        },
      });
      console.log(`✓ "${theme.name}" seeded`);
    } else {
      console.log(`⟳ "${theme.name}" already exists, skipping`);
    }
  }

  console.log("\n✓ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
