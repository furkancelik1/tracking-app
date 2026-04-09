"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/shared/GoogleIcon";
import { cn } from "@/lib/utils";

const emailSchema = z.string().email("Geçerli bir e-posta adresi girin.");

type LoginState = "idle" | "loading" | "email_sent" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Google girişi başlatılamadı. Lütfen tekrar deneyin.",
  OAuthCallback: "Google girişi başarısız. Lütfen tekrar deneyin.",
  OAuthAccountNotLinked: "Bu e-posta farklı bir yöntemle kayıtlı.",
  EmailSignin: "Sihirli bağlantı gönderilemedi. Lütfen tekrar deneyin.",
  EmailCreateAccount: "Hesabınız oluşturulamadı. Lütfen tekrar deneyin.",
  SessionRequired: "Devam etmek için giriş yapın.",
  Default: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const isVerifyMode = searchParams.get("verify") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [state, setState] = useState<LoginState>(
    isVerifyMode ? "email_sent" : "idle"
  );

  const errorMessage =
    errorCode != null
      ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES["Default"])
      : null;

  async function handleGoogleSignIn() {
    setState("loading");
    await signIn("google", { callbackUrl });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? "Geçersiz e-posta.");
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
      setEmailError(ERROR_MESSAGES["EmailSignin"] ?? "");
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
        <h1 className="text-2xl font-bold tracking-tight">Tekrar hoş geldin</h1>
        <p className="text-sm text-muted-foreground">
          Devam etmek için hesabına giriş yap
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
        Google ile devam et
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">veya</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta adresi</Label>
          <Input
            id="email"
            type="email"
            placeholder="sen@ornek.com"
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
          {isLoading ? "Gönderiliyor…" : "E-posta ile devam et"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Devam ederek{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Kullanım Şartları
        </a>{" "}
        ve{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Gizlilik Politikası
        </a>
        &apos;nı kabul etmiş olursunuz.
      </p>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Tekrar hoş geldin</h1>
        <p className="text-sm text-muted-foreground">Giriş yükleniyor…</p>
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
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
        ✉️
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">E-postanı kontrol et</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {email || "gelen kutuna"}
          </span>{" "}
          adresine sihirli bir bağlantı gönderdik.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Almadın mı? Spam klasörünü kontrol et veya{" "}
        <button
          type="button"
          onClick={onBack}
          className="underline underline-offset-2 hover:text-foreground"
        >
          tekrar dene
        </button>
        .
      </p>
    </div>
  );
}