import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

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
