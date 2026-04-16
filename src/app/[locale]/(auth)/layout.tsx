import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth.layout");
  const tCommon = await getTranslations("common");

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-white">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Image src="/icons/logo-192x192.png" alt="Zenith" width={24} height={24} className="rounded-md" />
          {tCommon("appName")}
        </div>
        <blockquote className="space-y-2">
          <p className="text-xl leading-relaxed">
            &ldquo;{t("quote")}&rdquo;
          </p>
          <footer className="text-zinc-400 text-sm">
            {t("quoteAuthor")}
          </footer>
        </blockquote>
      </div>

      {/* Right — auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
