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

const emailSchema = z.string().email("Please enter a valid email address.");

type LoginState = "idle" | "loading" | "email_sent" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthAccountNotLinked:
    "This email is already registered with a different method.",
  EmailSignin: "Could not send the magic link. Please try again.",
  EmailCreateAccount: "Could not create your account. Please try again.",
  SessionRequired: "Please sign in to continue.",
  Default: "Something went wrong. Please try again.",
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
    await signIn("google", { callbackUrl: "/basket" });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? "Invalid email.");
      return;
    }

    setState("loading");
    const res = await signIn("email", {
      email: result.data,
      redirect: false,
      callbackUrl: "/basket",
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
      {/* Header */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* OAuth error banner */}
      {errorMessage != null && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Google */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Email magic link */}
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
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
          {isLoading ? "Sending…" : "Continue with Email"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Loading sign-in…</p>
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
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a magic link to{" "}
          <span className="font-medium text-foreground">{email || "your inbox"}</span>.
          Click it to sign in — no password needed.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Didn&apos;t receive it? Check your spam folder or{" "}
        <button
          type="button"
          onClick={onBack}
          className="underline underline-offset-2 hover:text-foreground"
        >
          try again
        </button>
        .
      </p>
    </div>
  );
}
