import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  register: true,
  customWorkerSrc: "src/worker",
  fallbacks: {
    document: "/offline.html",
  },
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      // Next.js build chunks — CacheFirst (immutable hashed filenames)
      {
        urlPattern: /^https?:\/\/[^/]+\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      // Public icons, manifest, offline fallback
      {
        urlPattern:
          /^https?:\/\/[^/]+\/(?:icons\/.*|manifest\.webmanifest|favicon\.ico|offline\.html)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "public-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // App HTML — NetworkFirst with short timeout (offline shell)
      {
        urlPattern: /^https?.*\/(dashboard|leaderboard|settings|login|marketplace).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 3,
        },
      },
      // REST API reads — stale-while-revalidate (fast repeat visits; mutations still go network-first in app)
      {
        urlPattern: /^https?:\/\/[^/]+\/api\/v1\/.*$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
        },
      },
      // Other API routes (cron excluded by hostname in practice) — SWR for GET-heavy endpoints
      {
        urlPattern: /^https?:\/\/[^/]+\/api\/(?!cron\/).*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-misc",
          expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
        },
      },
      // Static file extensions — CacheFirst
      {
        urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp|avif)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 16, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  transpilePackages: ["lucide-react", "sonner", "next-intl"],
  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
