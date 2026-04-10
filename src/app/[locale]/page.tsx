import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/landing/CheckoutButton";
import { STRIPE_PLANS } from "@/lib/stripe";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

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

  const FEATURES = [
    {
      icon: "✅",
      title: t("features.smartTracking.title"),
      description: t("features.smartTracking.description"),
      badge: undefined as string | undefined,
    },
    {
      icon: "🔥",
      title: t("features.streaks.title"),
      description: t("features.streaks.description"),
      badge: undefined as string | undefined,
    },
    {
      icon: "📊",
      title: t("features.analytics.title"),
      description: t("features.analytics.description"),
      badge: t("features.analytics.badge"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
            <span className="size-5 rounded-full bg-primary inline-block" />
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
          </nav>

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
      </header>

      <main className="flex-1">
        {/* ─── HERO ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-50"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--background))_0%,transparent_100%)]"
          />

          <div className="relative mx-auto max-w-4xl px-6 py-28 text-center flex flex-col items-center gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              {t("hero.badge")}
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              {t("hero.titleStart")}{" "}
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Button asChild size="lg" className="px-8">
                <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                  {t("hero.ctaPrimary")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">{t("hero.ctaSecondary")}</a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("hero.ctaNote")}
            </p>
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

            <div className="grid gap-6 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl">{f.icon}</div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                  {f.badge && (
                    <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">
                      {f.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SOCIAL PROOF ───────────────────────────────────────────────────── */}
        <section className="py-14 border-t bg-muted/40">
          <div className="mx-auto max-w-4xl px-6 text-center space-y-8">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t("testimonials.label")}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((item) => (
                <blockquote
                  key={item.name}
                  className="rounded-xl border bg-card p-5 text-left space-y-3"
                >
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
        <section id="pricing" className="py-24 border-t">
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
                      <span className="text-green-500 shrink-0">✓</span>
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
              <div className="rounded-xl border-2 border-primary bg-card p-8 flex flex-col gap-6 relative shadow-lg">
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
                      <span className="text-green-500 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <CheckoutButton isLoggedIn={isLoggedIn} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA BANNER ─────────────────────────────────────────────────────── */}
        <section className="py-20 border-t bg-primary text-primary-foreground">
          <div className="mx-auto max-w-2xl px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-primary-foreground/70 text-sm sm:text-base">
              {t("cta.description")}
            </p>
            <Button asChild size="lg" variant="secondary" className="px-8">
              <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                {t("cta.button")}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <span className="size-4 rounded-full bg-primary inline-block" />
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

