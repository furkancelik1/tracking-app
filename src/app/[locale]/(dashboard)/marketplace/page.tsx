import React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketplaceContent } from "@/components/dashboard/MarketplaceContent";
import { getMarketplaceItems } from "@/actions/shop.actions";


export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "marketplace.metadata" });
  return { title: t("title"), description: t("description") };
}


export default async function MarketplacePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  setRequestLocale(locale);

  const data = await getMarketplaceItems();

  return (
    <div className="px-6 py-12">
      <MarketplaceContent initialData={data} />
    </div>
  );
}
