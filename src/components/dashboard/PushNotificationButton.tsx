"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function PushNotificationButton() {
  const [permission, setPermission] = useState<PermissionState>("default");

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === "granted") {
      toast.success("Tarayıcı bildirimleri açıldı!");
      fireTestNotification();
    } else if (result === "denied") {
      toast.error("Bildirim izni reddedildi. Tarayıcı ayarlarından değiştirebilirsin.");
    }
  }

  function fireTestNotification() {
    new Notification("🔥 Rutin Hatırlatıcısı", {
      body: "Bugün tamamlaman gereken rutinlerin var. Serini bozma!",
      icon: "/favicon.ico",
      tag: "routine-reminder",
    });
  }

  function handleTestClick() {
    if (permission !== "granted") {
      requestPermission();
      return;
    }
    fireTestNotification();
    toast.success("Test bildirimi gönderildi.");
  }

  if (permission === "unsupported") return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Tarayıcı Bildirimleri</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {permission === "granted"
            ? "Bildirimler açık — test bildirimi gönderebilirsin."
            : permission === "denied"
            ? "İzin reddedildi. Tarayıcı ayarlarından etkinleştir."
            : "Rutin hatırlatıcıları için izin ver."}
        </p>
      </div>
      <Button
        size="sm"
        variant={permission === "granted" ? "outline" : "default"}
        onClick={handleTestClick}
        disabled={permission === "denied"}
        className="shrink-0 gap-1.5"
      >
        {permission === "granted" ? (
          <>
            <Bell size={14} />
            Test
          </>
        ) : permission === "denied" ? (
          <>
            <BellOff size={14} />
            Engellendi
          </>
        ) : (
          <>
            <Bell size={14} />
            İzin Ver
          </>
        )}
      </Button>
    </div>
  );
}
