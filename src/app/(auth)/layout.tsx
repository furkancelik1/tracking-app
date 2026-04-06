export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-white">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="size-6 rounded-full bg-white" />
          Tracking App
        </div>
        <blockquote className="space-y-2">
          <p className="text-xl leading-relaxed">
            &ldquo;Build better routines. Track every action. Stay consistent.&rdquo;
          </p>
          <footer className="text-zinc-400 text-sm">
            — Productivity redefined
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
