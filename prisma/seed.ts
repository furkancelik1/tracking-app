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
    description: "Soft teal â€” calm clarity for deep work sessions.",
    price: 350,
    metadata: {
      primary: "#5eead4",
      secondary: "#0d9488",
      accent: "#99f6e4",
      glow: "rgba(94, 234, 212, 0.25)",
      pattern: "dots",
    },
  },
  {
    name: "Ember Overdrive",
    description: "Aggressive red-orange neon â€” for warriors who don't stop.",
    price: 600,
    metadata: {
      primary: "#f97316",
      secondary: "#dc2626",
      accent: "#fb923c",
      glow: "rgba(249, 115, 22, 0.38)",
    },
  },
  {
    name: "Arctic Focus",
    description: "Ice-blue silence â€” cold clarity, zero distractions.",
    price: 450,
    metadata: {
      primary: "#38bdf8",
      secondary: "#0284c7",
      accent: "#7dd3fc",
      glow: "rgba(56, 189, 248, 0.28)",
      pattern: "lines",
    },
  },
  {
    name: "Prestige Gold",
    description: "Elite golden aura â€” for those who've earned it.",
    price: 1000,
    metadata: {
      primary: "#eab308",
      secondary: "#a16207",
      accent: "#fde047",
      glow: "rgba(234, 179, 8, 0.35)",
      pattern: "grid",
    },
  },
  {
    name: "Forest Silence",
    description: "Soft emerald â€” breathe deep, move with intention.",
    price: 400,
    metadata: {
      primary: "#34d399",
      secondary: "#059669",
      accent: "#6ee7b7",
      glow: "rgba(52, 211, 153, 0.26)",
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
      console.log(`âœ“ "${theme.name}" created`);
    } else {
      // Update metadata so pattern/price/description changes propagate
      await prisma.shopItem.update({
        where: { id: existing.id },
        data: {
          description: theme.description,
          price: theme.price,
          metadata: theme.metadata,
          isActive: true,
        },
      });
      console.log(`âŸ³ "${theme.name}" updated`);
    }
  }

  console.log("\nâœ“ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
