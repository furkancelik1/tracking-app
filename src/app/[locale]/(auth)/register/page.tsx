import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register.metadata" });

  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
  };
}

// No separate registration flow — accounts are created automatically
// on first sign-in via Google OAuth or Email magic link.
export default function RegisterPage() {
  const t = useTranslations("auth.register");
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("description")}
      </p>
      <Link href="/login" className="text-sm underline underline-offset-4 hover:text-foreground">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
