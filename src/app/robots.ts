import type { MetadataRoute } from "next";

const SITE_URL = "https://furkancelik.online";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/*/dashboard/",
          "/*/dashboard",
          "/*/settings/",
          "/*/settings",
          "/*/stats/",
          "/*/stats",
          "/*/leaderboard/",
          "/*/leaderboard",
          "/*/admin/",
          "/*/admin",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
