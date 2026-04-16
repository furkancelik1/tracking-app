"use client";

import React, { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/shared/GoogleIcon";
import { cn } from "@/lib/utils";

type LoginState = "idle" | "loading" | "email_sent" | "error";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const t = useTranslations("auth.login");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const isVerifyMode = searchParams.get("verify") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [state, setState] = useState<LoginState>(
    isVerifyMode ? "email_sent" : "idle"
  );

  const ERROR_KEYS = ["OAuthSignin", "OAuthCallback", "OAuthAccountNotLinked", "EmailSignin", "EmailCreateAccount", "SessionRequired", "Default"] as const;
  const getErrorMessage = (code: string | null) => {
    if (!code) return null;
    const key = ERROR_KEYS.includes(code as typeof ERROR_KEYS[number]) ? code : "Default";
    return t(`errors.${key}` as Parameters<typeof t>[0]);
  };
  const errorMessage = getErrorMessage(errorCode);

  async function handleGoogleSignIn() {
    setState("loading");
    await signIn("google", { callbackUrl });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    const emailSchema = z.string().email(t("errors.invalidEmail"));
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? t("errors.invalidEmail"));
      return;
    }

    setState("loading");
    const res = await signIn("email", {
      email: result.data,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setState("error");
      setEmailError(t("errors.EmailSignin"));
    } else {
      setState("email_sent");
    }
  }

  if (state === "email_sent") {
    return <EmailSentView email={email} onBack={() => setState("idle")} />;
  }

  const isLoading = state === "loading";

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {errorMessage != null && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <GoogleIcon className="size-4" />
        {t("google")}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{tc("or")}</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={cn(emailError && "border-destructive")}
          />
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("emailSending") : t("emailSubmit")}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {t("terms")}{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
          {t("termsLink")}
        </a>{" "}
        {t("and")}{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          {t("privacyLink")}
        </a>
      </p>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="h-7 w-48 mx-auto bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 mx-auto bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

function EmailSentView({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const t = useTranslations("auth.login");
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
        ✉️
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t("emailSent.title")}</h2>
        <p
          className="text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{
            __html: t("emailSent.description", { email: email || "" }),
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {t("emailSent.back")}
        </button>
      </p>
    </div>
  );
}