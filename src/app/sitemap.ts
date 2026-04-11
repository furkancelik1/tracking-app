import type { MetadataRoute } from "next";

const SITE_URL = "https://furkancelik.online";

const locales = ["en", "tr"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { path: "", changeFreq: "weekly" as const, prio: 1.0 },
    { path: "/login", changeFreq: "monthly" as const, prio: 0.6 },
    { path: "/register", changeFreq: "monthly" as const, prio: 0.5 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFreq,
        priority: page.prio,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}${page.path}`])
          ),
        },
      });
    }
  }

  return entries;
}
