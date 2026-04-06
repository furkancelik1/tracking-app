"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/hooks/useRealtime";
import { REALTIME_CHANNELS } from "@/lib/supabase";
import { CatalogueGrid } from "@/components/dashboard/CatalogueGrid";
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

/**
 * Thin wrapper around CatalogueGrid that subscribes to admin catalogue
 * updates and triggers a full page refresh when cards change.
 */
export function CatalogueGridWrapper({ cards, inBasketIds, categories }: Props) {
  const qc = useQueryClient();

  useRealtime({
    channel: REALTIME_CHANNELS.adminBroadcast,
    event: "CATALOGUE_UPDATED",
    onMessage: () => {
      // Invalidate catalogue query — Next.js router.refresh() would require
      // a Server Component; instead we bust the cache via the query client
      // so the parent page re-fetches on next navigation.
      void qc.invalidateQueries({ queryKey: ["catalogue"] });
      // Force a full route revalidation for the SSR data
      window.location.reload();
    },
  });

  return (
    <CatalogueGrid
      cards={cards}
      inBasketIds={inBasketIds}
      categories={categories}
    />
  );
}
