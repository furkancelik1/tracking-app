import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import { CatalogueGridWrapper } from "@/components/dashboard/CatalogueGridWrapper";

const getActiveCards = unstable_cache(
  () =>
    prisma.card.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        affiliateUrl: true,
        resetType: true,
        duration: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ["catalogue-cards"],
  { tags: ["cards"] }
);

export default async function CataloguePage() {
  const session = await requireAuth();
  const [cards, basketItems] = await Promise.all([
    getActiveCards(),
    prisma.basketItem.findMany({
      where: { userId: session.user.id },
      select: { cardId: true },
    }),
  ]);

  const inBasketIds = new Set(basketItems.map((b) => b.cardId));

  const categories = [...new Set(cards.map((c) => c.category))].sort();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Action Catalogue</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {cards.length} actions available — add them to your daily basket
        </p>
      </div>
      <CatalogueGridWrapper
        cards={cards}
        inBasketIds={inBasketIds}
        categories={categories}
      />
    </div>
  );
}
