import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/landing/CheckoutButton";
import { STRIPE_PLANS } from "@/lib/stripe";

export const metadata = {
  title: "Routine Tracker — Rutinlerini Takip Et, Hayatını Değiştir",
  description:
    "Günlük alışkanlıklarını kolayca takip et. Streak sistemi ve haftalık istatistiklerle motivasyonunu canlı tut.",
};

// ─── Sayfayı her istekte taze getir (session kontrolü için) ──────────────────
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
            <span className="size-5 rounded-full bg-primary inline-block" />
            Routine Tracker
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            <a
              href="#features"
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              Özellikler
            </a>
            <a
              href="#pricing"
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              Fiyatlandırma
            </a>
          </nav>

          {/* CTA */}
          {isLoggedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Panele Git</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Giriş Yap</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* ─── HERO ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Arka plan ızgara deseni */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-50"
          />
          {/* Radial gradient — ızgarayı ortada solar */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--background))_0%,transparent_100%)]"
          />

          <div className="relative mx-auto max-w-4xl px-6 py-28 text-center flex flex-col items-center gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              🔥 Streak sistemi ile motivasyonunu koru
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Rutinlerini Takip Et,{" "}
              <span className="text-primary">Hayatını Değiştir</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Günlük alışkanlıklarını dakikalar içinde kur. Aralıksız seri sistemi
              ve haftalık grafiklerle ilerleni gör, motivasyonunu hiç kaybetme.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Button asChild size="lg" className="px-8">
                <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                  Ücretsiz Başla
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">Nasıl Çalışır?</a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Kredi kartı gerekmez · Ücretsiz planda 5 rutin
            </p>
          </div>
        </section>

        {/* ─── FEATURES ───────────────────────────────────────────────────────── */}
        <section id="features" className="py-24 border-t">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                İhtiyacın olan her şey, tek yerde
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
                Karmaşık uygulamalara gerek yok. Sade, hızlı ve etkili bir rutin
                takip deneyimi.
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
              Kullanıcılar ne diyor?
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <blockquote
                  key={t.name}
                  className="rounded-xl border bg-card p-5 text-left space-y-3"
                >
                  <p className="text-sm text-foreground leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="text-xs text-muted-foreground font-medium">
                    — {t.name}
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
                Sade ve şeffaf fiyatlandırma
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                İstediğin zaman yükselt, istediğin zaman iptal et.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
              {/* Free */}
              <div className="rounded-xl border bg-card p-8 flex flex-col gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ücretsiz</p>
                  <p className="mt-1 text-4xl font-bold">$0</p>
                  <p className="text-sm text-muted-foreground mt-1">Sonsuza kadar ücretsiz</p>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                    Ücretsiz Başla
                  </Link>
                </Button>
              </div>

              {/* Pro — highlighted */}
              <div className="rounded-xl border-2 border-primary bg-card p-8 flex flex-col gap-6 relative shadow-lg">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                  En Popüler
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
                    İstediğin zaman iptal et
                  </p>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {PRO_FEATURES.map((f) => (
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
              Bugün ilk rutinini oluştur
            </h2>
            <p className="text-primary-foreground/70 text-sm sm:text-base">
              Binlerce kullanıcı rutinlerini takip etmek için Routine Tracker&apos;ı
              kullanıyor. Sıra sende.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="px-8"
            >
              <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                Hemen Başla — Ücretsiz
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
            Routine Tracker
          </div>
          <p>© {new Date().getFullYear()} Routine Tracker. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Giriş Yap
            </Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Fiyatlandırma
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Statik veri ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "✅",
    title: "Akıllı Takip",
    description:
      "Günlük, haftalık ve aylık rutinlerini saniyeler içinde oluştur. Checkbox ile tamamla, ilerleni anında gör.",
    badge: undefined,
  },
  {
    icon: "🔥",
    title: "Alevli Seriler",
    description:
      "Her gün rutinini tamamla, streak'ini büyüt. Serilerin görsel olarak takip edilir, kopmasın diye seni uyarır.",
    badge: undefined,
  },
  {
    icon: "📊",
    title: "Gelişmiş Analitik",
    description:
      "Son 7 günün performansını interaktif grafiklerle incele. Hangi günler daha verimli olduğunu keşfet.",
    badge: "Pro Özelliği",
  },
] as const;

const FREE_FEATURES = [
  "Maksimum 5 rutin",
  "Günlük / Haftalık / Aylık sıklık",
  "Streak takibi",
  "Bugünkü ilerleme çubuğu",
  "Tüm cihazlarda erişim",
];

const PRO_FEATURES = [
  "Sınırsız rutin",
  "Günlük / Haftalık / Aylık sıklık",
  "Streak takibi",
  "Haftalık istatistik grafikleri",
  "Öncelikli destek",
  "Tüm gelecek özellikler",
];

const TESTIMONIALS = [
  {
    quote:
      "Streak sistemini görünce ilk hafta hiçbir rutinimi atlamamak için motivasyonum ikiye katlandı.",
    name: "Elif K.",
  },
  {
    quote:
      "Bu kadar sade bir arayüzde bu kadar güçlü bir takip sistemi beklenmiyordu. Günlük kullanıyorum.",
    name: "Mert A.",
  },
  {
    quote:
      "Pro'ya geçince haftalık grafikleri görünce hangi günler daha üretken olduğumu fark ettim.",
    name: "Selin T.",
  },
];
