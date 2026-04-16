"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { sendTestEmailAction } from "@/actions/notification.actions";

export function TestEmailButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await sendTestEmailAction();
      toast.success(`Test maili gÃ¶nderildi â†’ ${result.to}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Mail gÃ¶nderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Test E-postasÄ±</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          furkansteam2022@gmail.com adresine Ã¶rnek hatÄ±rlatma maili gÃ¶nderir.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={loading}
        className="shrink-0 gap-1.5"
      >
        <Mail size={14} />
        {loading ? "GÃ¶nderiliyorâ€¦" : "Test GÃ¶nder"}
      </Button>
    </div>
  );
}
