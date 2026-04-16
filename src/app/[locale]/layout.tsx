import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageTransition } from "@/components/shared/PageTransition";

const SITE_URL = "https://furkancelik.online";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(SITE_URL),
    manifest: "/manifest.json",
    title: {
      default: title,
      template: `%s | ${t("siteName")}`,
    },
    description,
    keywords: t("keywords"),
    authors: [{ name: "Furkan Çelik", url: SITE_URL }],
    creator: "Furkan Çelik",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: t("siteName"),
      startupImage: [
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
        },
        {
          url: "/icons/icon-512x512.png",
          media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
        },
      ],
    },
    icons: {
      icon: [
        { url: "/icons/logo-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/logo-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      url: SITE_URL,
      siteName: t("siteName"),
      title,
      description,
      images: [
        {
          url: "/icons/icon-512x512.png",
          width: 512,
          height: 512,
          alt: t("siteName"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/icons/icon-512x512.png"],
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        en: `${SITE_URL}/en`,
        tr: `${SITE_URL}/tr`,
        "x-default": `${SITE_URL}/en`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: light)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zenith" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <PageTransition>{children}</PageTransition>
                <Toaster />
              </ThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
