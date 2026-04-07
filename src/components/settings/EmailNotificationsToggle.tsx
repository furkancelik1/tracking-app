"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toggleEmailNotificationsAction } from "@/actions/notification.actions";

type Props = {
  enabled: boolean;
  isPro: boolean;
};

export function EmailNotificationsToggle({ enabled, isPro }: Props) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: boolean) {
    if (!isPro) return;
    const prev = checked;
    setChecked(value); // optimistic
    startTransition(async () => {
      try {
        await toggleEmailNotificationsAction(value);
        toast.success(value ? "E-posta bildirimleri açıldı." : "E-posta bildirimleri kapatıldı.");
      } catch (err) {
        setChecked(prev); // rollback
        toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="email-notifications" className="text-sm font-medium">
            Günlük E-posta Hatırlatıcısı
          </Label>
          {!isPro && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              PRO
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isPro
            ? "Tamamlanmamış rutinlerin için her gün hatırlatıcı al."
            : "Bu özellik yalnızca PRO kullanıcılara özeldir."}
        </p>
      </div>
      <Switch
        id="email-notifications"
        checked={isPro ? checked : false}
        onCheckedChange={handleChange}
        disabled={!isPro || isPending}
        aria-label="E-posta bildirimlerini aç/kapat"
      />
    </div>
  );
}
