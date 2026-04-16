import React from "react";
import { getMarketplaceItems } from "@/actions/shop.actions";
import { MarketplaceContent } from "@/components/dashboard/MarketplaceContent";

export async function MarketplacePageLoader() {
  const data = await getMarketplaceItems();
  return <MarketplaceContent initialData={data} />;
}
