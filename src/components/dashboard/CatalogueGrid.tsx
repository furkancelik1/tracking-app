"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCardDuration } from "@/lib/utils";
import { useAddToBasket } from "@/hooks/useBasket";
import type { ResetType } from "@prisma/client";

type CatalogueCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  affiliateUrl: string | null;
  resetType: ResetType;
  duration: number;
};

type Props = {
  cards: CatalogueCard[];
  inBasketIds: Set<string>;
  categories: string[];
};

export function CatalogueGrid({ cards, inBasketIds, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const addToBasket = useAddToBasket();

  const filtered =
    activeCategory == null
      ? cards
      : cards.filter((c) => c.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory == null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((card) => {
          const added = inBasketIds.has(card.id);
          return (
            <Card key={card.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {card.title}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {card.category}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {card.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pb-2 space-y-2">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    {card.resetType === "ROLLING" ? "⏱ Rolling" : "🕛 Fixed"}
                  </span>
                  <span>·</span>
                  <span>{formatCardDuration(card.duration)}</span>
                </div>
                {card.affiliateUrl != null && (
                  <a
                    href={`/go/${card.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View resource ↗
                  </a>
                )}
              </CardContent>

              <CardFooter className="pt-2">
                <Button
                  size="sm"
                  variant={added ? "secondary" : "default"}
                  className="w-full"
                  disabled={added || addToBasket.isPending}
                  onClick={() => addToBasket.mutate(card.id)}
                >
                  {added ? "In Basket" : "Add to Basket"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No actions in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
