import React from "react";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckoutButton } from "@/components/landing/CheckoutButton";
import { STRIPE_PLANS } from "@/lib/stripe";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import Image from "next/image";
import {
  CheckCircle2,
  Flame,
  BarChart3,
  Grid3X3,
  Bell,
  Smartphone,
  Trophy,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.metadata" });
  return { title: t("title"), description: t("description") };
}

function JsonLd({ locale }: { locale: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Zenith",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: `https://furkancelik.online/${locale}`,
    offers: {
      "@type": "Offer",
      price: "4.99",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "120",
    },
    description:
      locale === "tr"
        ? "Günlük alışkanlıklarınızı kolayca takip edin. Seriler, haftalık istatistikler ve analizlerle motivasyonunuzu koruyun."
        : "Easily track your daily habits. Stay motivated with streaks, weekly stats, and analytics.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  const isLoggedIn = !!session?.user;
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  const freeFeatures = t.raw("pricing.freeFeatures") as string[];
  const proFeatures = t.raw("pricing.proFeatures") as string[];
  const testimonials = t.raw("testimonials.items") as Array<{
    quote: string;
    name: string;
  }>;
  const faqItems = t.raw("faq.items") as Array<{
    question: string;
    answer: string;
  }>;

  const FEATURES = [
    {
      icon: <CheckCircle2 className="size-5" />,
      title: t("features.smartTracking.title"),
      description: t("features.smartTracking.description"),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: <Flame className="size-5" />,
      title: t("features.streaks.title"),
      description: t("features.streaks.description"),
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      icon: <BarChart3 className="size-5" />,
      title: t("features.analytics.title"),
      description: t("features.analytics.description"),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: t("features.analytics.badge"),
    },
    {
      icon: <Grid3X3 className="size-5" />,
      title: t("features.heatmap.title"),
      description: t("features.heatmap.description"),
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: <Bell className="size-5" />,
      title: t("features.pushNotifications.title"),
      description: t("features.pushNotifications.description"),
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      icon: <Smartphone className="size-5" />,
      title: t("features.pwa.title"),
      description: t("features.pwa.description"),
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd locale={locale} />

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
            <Image src="/icons/logo-192x192.png" alt="Zenith" width={20} height={20} className="rounded-md" />
            {tc("appName")}
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <a
              href="#features"
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              {t("header.features")}
            </a>
            <a
              href="#pricing"
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              {t("header.pricing")}
            </a>
            <a
              href="#faq"
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Button asChild size="sm">
                <Link href="/dashboard">{t("header.goToDashboard")}</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/login">{t("header.signIn")}</Link>
              </Button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── HERO ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Grid background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-50"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--background))_0%,transparent_100%)]"
          />
          {/* Glow orb */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px]"
          />

          <div className="relative mx-auto max-w-4xl px-6 py-28 sm:py-36 text-center flex flex-col items-center gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              {t("hero.badge")}
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
              {t("hero.titleStart")}{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                {t("hero.titleHighlight")}
              </span>
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button asChild size="lg" className="px-8 text-base h-12 shadow-lg shadow-primary/25">
                <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12">
                <a href="#features">{t("hero.ctaSecondary")}</a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("hero.ctaNote")}
            </p>
          </div>
        </section>

        {/* ─── DASHBOARD PREVIEW (Görsel Kanıt) ──────────────────────────────── */}
        <section className="py-4 -mt-8">
          <div className="mx-auto max-w-5xl px-6">
            <div className="relative rounded-xl border bg-card/50 backdrop-blur-sm p-6 sm:p-8 shadow-2xl shadow-primary/5">
              {/* Simulated dashboard mockup */}
              <div className="grid gap-4 sm:grid-cols-4 mb-6">
                {[
                  { label: locale === "tr" ? "Bugün" : "Today", value: "3/5", color: "text-emerald-500" },
                  { label: locale === "tr" ? "Aktif Seri" : "Streak", value: "14 🔥", color: "text-orange-500" },
                  { label: locale === "tr" ? "Haftalık" : "Weekly", value: "%86", color: "text-blue-500" },
                  { label: locale === "tr" ? "Seviye" : "Level", value: "12 ⭐", color: "text-purple-500" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border bg-background/80 p-4 text-center"
                  >
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold tabular-nums mt-1 ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Simulated heatmap */}
              <div className="rounded-lg border bg-background/80 p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  {locale === "tr" ? "Yıllık Aktivite Haritası" : "Yearly Activity Map"}
                </p>
                <div className="flex gap-[3px] overflow-hidden">
                  {Array.from({ length: 52 }, (_, w) => (
                    <div key={w} className="flex flex-col gap-[3px]">
                      {Array.from({ length: 7 }, (_, d) => {
                        const intensity = Math.random();
                        const cls =
                          intensity > 0.7
                            ? "bg-emerald-500"
                            : intensity > 0.4
                              ? "bg-emerald-400/60"
                              : intensity > 0.15
                                ? "bg-emerald-300/30"
                                : "bg-muted/40";
                        return (
                          <div
                            key={d}
                            className={`size-[10px] sm:size-[12px] rounded-[2px] ${cls}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative glow */}
              <div
                aria-hidden
                className="absolute -bottom-px left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              />
            </div>
          </div>
        </section>

        {/* ─── FEATURES ───────────────────────────────────────────────────────── */}
        <section id="features" className="py-24 border-t">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t("features.title")}
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
                {t("features.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-xl border bg-card p-6 space-y-3 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-200"
                >
                  <div
                    className={`size-10 rounded-lg ${f.bg} flex items-center justify-center ${f.color}`}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                  {"badge" in f && f.badge && (
                    <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">
                      {f.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── GAMIFICATION HIGHLIGHT ─────────────────────────────────────────── */}
        <section className="py-20 border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-8 sm:grid-cols-2 items-center">
              <div className="space-y-4">
                <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="size-6 text-amber-500" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {t("features.gamification.title")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t("features.gamification.description")}
                </p>
                <Button asChild variant="outline" className="mt-2">
                  <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                    {t("hero.ctaPrimary")}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>

              {/* Gamification mockup */}
              <div className="space-y-3">
                {[
                  { icon: "🔥", label: locale === "tr" ? "7 Gün Seri" : "7 Day Streak", xp: "+70 XP" },
                  { icon: "🏆", label: locale === "tr" ? "Yüzbaşı Rozeti" : "Centurion Badge", xp: "+100 XP" },
                  { icon: "⭐", label: locale === "tr" ? "Seviye 12" : "Level 12", xp: "1,240 XP" },
                  { icon: "🪙", label: locale === "tr" ? "Seri Dondurucu" : "Streak Freeze", xp: "50 Coins" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">
                      {item.xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ───────────────────────────────────────────────────── */}
        <section className="py-16 border-t">
          <div className="mx-auto max-w-4xl px-6 text-center space-y-8">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t("testimonials.label")}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((item) => (
                <blockquote
                  key={item.name}
                  className="rounded-xl border bg-card p-5 text-left space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <footer className="text-xs text-muted-foreground font-medium">
                    — {item.name}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ────────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 border-t bg-muted/20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t("pricing.title")}
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
              {/* Free */}
              <div className="rounded-xl border bg-card p-8 flex flex-col gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("pricing.free.name")}</p>
                  <p className="mt-1 text-4xl font-bold">{t("pricing.free.price")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("pricing.free.interval")}</p>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {freeFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                    {t("pricing.free.cta")}
                  </Link>
                </Button>
              </div>

              {/* Pro */}
              <div className="rounded-xl border-2 border-primary bg-card p-8 flex flex-col gap-6 relative shadow-lg shadow-primary/10">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                  {t("pricing.pro.popular")}
                </span>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {STRIPE_PLANS.PRO.name}
                  </p>
                  <p className="mt-1 text-4xl font-bold">
                    {STRIPE_PLANS.PRO.price}
                    <span className="text-base font-normal text-muted-foreground">
                      /{STRIPE_PLANS.PRO.interval}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("pricing.pro.cancelAnytime")}
                  </p>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <CheckoutButton isLoggedIn={isLoggedIn} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ────────────────────────────────────────────────────────────── */}
        <section id="faq" className="py-24 border-t">
          <div className="mx-auto max-w-2xl px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t("faq.title")}
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                {t("faq.subtitle")}
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ─── TRUST BADGES ───────────────────────────────────────────────────── */}
        <section className="py-12 border-t bg-muted/20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
              {[
                { icon: <Shield className="size-5" />, label: locale === "tr" ? "SSL Şifreli" : "SSL Encrypted" },
                { icon: <Zap className="size-5" />, label: locale === "tr" ? "99.9% Uptime" : "99.9% Uptime" },
                { icon: <Smartphone className="size-5" />, label: "PWA Ready" },
                { icon: <Bell className="size-5" />, label: "Web Push" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 text-xs font-medium"
                >
                  {badge.icon}
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA BANNER (Mevcut) ────────────────────────────────────────────── */}
        <section className="py-20 border-t bg-primary text-primary-foreground">
          <div className="mx-auto max-w-2xl px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-primary-foreground/70 text-sm sm:text-base">
              {t("cta.description")}
            </p>
            <Button asChild size="lg" variant="secondary" className="px-8 h-12 shadow-lg">
              <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                {t("cta.button")}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ─── FINAL CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 border-t">
          <div className="mx-auto max-w-xl px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("finalCta.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("finalCta.description")}
            </p>
            <Button asChild size="lg" className="px-8 h-12 shadow-lg shadow-primary/25">
              <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                {t("finalCta.button")}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Image src="/icons/logo-192x192.png" alt="Zenith" width={16} height={16} className="rounded-md" />
            {tc("appName")}
          </div>
          <p>{tc("footer", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              {t("footer.signIn")}
            </Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {t("footer.pricing")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

