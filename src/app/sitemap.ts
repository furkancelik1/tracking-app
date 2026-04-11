import type { MetadataRoute } from "next";

const SITE_URL = "https://furkancelik.online";

const locales = ["en", "tr"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/login"];

  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "weekly" : "monthly",
        priority: page === "" ? 1.0 : 0.5,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}${page}`])
          ),
        },
      });
    }
  }

  return entries;
}
