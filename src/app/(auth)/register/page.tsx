import Link from "next/link";

// No separate registration flow — accounts are created automatically
// on first sign-in via Google OAuth or Email magic link.
export default function RegisterPage() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="text-sm text-muted-foreground">
        New accounts are created automatically after your first sign-in.
      </p>
      <Link href="/login" className="text-sm underline underline-offset-4 hover:text-foreground">
        Continue to sign in
      </Link>
    </div>
  );
}
