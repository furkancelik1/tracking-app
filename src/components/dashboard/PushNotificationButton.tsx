"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { subscribePushAction, unsubscribePushAction, sendTestPushAction } from "@/actions/push.actions";

type SubState = "loading" | "unsupported" | "denied" | "unsubscribed" | "subscribed";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushNotificationButton() {
  const [state, setState] = useState<SubState>("loading");
  const [busy, setBusy] = useState(false);

  // ── Mevcut durumu kontrol et ──────────────────────────────────────────────
  const checkSubscription = useCallback(async () => {
    console.log("[Push] 🔍 checkSubscription başlatıldı");

    if (!("serviceWorker" in navigator)) {
      console.warn("[Push] ❌ serviceWorker desteklenmiyor");
      setState("unsupported");
      return;
    }
    if (!("PushManager" in window)) {
      console.warn("[Push] ❌ PushManager desteklenmiyor");
      setState("unsupported");
      return;
    }
    console.log("[Push] ✅ serviceWorker & PushManager mevcut");

    // Dev modda SW yoksa elle register et
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log("[Push] 📋 Kayıtlı SW sayısı:", registrations.length, registrations.map(r => r.scope));
    if (registrations.length === 0) {
      console.log("[Push] ⚙️ SW bulunamadı, /sw.js elle register ediliyor...");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[Push] ✅ SW register edildi — scope:", reg.scope);
      } catch (regErr) {
        console.error("[Push] ❌ SW register BAŞARISIZ:", regErr);
        setState("unsupported");
        return;
      }
    }

    const permission = Notification.permission;
    console.log("[Push] 🔔 Mevcut izin durumu:", permission);
    if (permission === "denied") {
      setState("denied");
      return;
    }

    try {
      console.log("[Push] ⏳ navigator.serviceWorker.ready bekleniyor...");
      const reg = await navigator.serviceWorker.ready;
      console.log("[Push] ✅ SW ready — scope:", reg.scope);
      const sub = await reg.pushManager.getSubscription();
      console.log("[Push] 📋 Mevcut abonelik:", sub ? sub.endpoint : "YOK");
      setState(sub ? "subscribed" : "unsubscribed");
    } catch (err) {
      console.error("[Push] HATA DETAYI (checkSubscription):", err);
      setState("unsubscribed");
    }
  }, []);

  useEffect(() => {
    console.log("[Push] 🔑 VAPID_PUBLIC_KEY:", VAPID_PUBLIC_KEY || "⚠️ BOŞ / undefined!");
    console.log("[Push] 🔑 VAPID_PUBLIC_KEY tam değer:", VAPID_PUBLIC_KEY);
    checkSubscription();
  }, [checkSubscription]);

  // ── Abone ol ──────────────────────────────────────────────────────────────
  async function handleSubscribe() {
    alert("Butona basıldı!");
    console.log("Push desteği kontrol ediliyor:", "PushManager" in window);
    console.log("--- ABONELİK BAŞLADI ---");
    console.log("[Push] 1. Adım: Butona tıklandı — handleSubscribe başlatıldı");
    setBusy(true);
    try {
      // 2 — VAPID kontrolü
      console.log("[Push] 2. Adım: VAPID Key kontrolü:", VAPID_PUBLIC_KEY);
      if (!VAPID_PUBLIC_KEY) {
        const msg = "NEXT_PUBLIC_VAPID_PUBLIC_KEY ortam değişkeni tanımlı değil!";
        alert("❌ " + msg);
        throw new Error(msg);
      }

      // 3 — İzin iste
      console.log("[Push] 3. Adım: Notification.requestPermission() çağrılıyor...");
      const permission = await Notification.requestPermission();
      console.log("[Push] 3. Adım sonuç: permission =", permission);
      if (permission !== "granted") {
        setState("denied");
        toast.error("Bildirim izni reddedildi. Tarayıcı ayarlarından değiştirebilirsin.");
        return;
      }

      // 4 — Service Worker ready (timeout korumalı)
      console.log("[Push] 4. Adım: SW Kaydı aranıyor... navigator.serviceWorker.ready");
      console.log("[Push] 4. Adım: Mevcut SW kayıtları:", await navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.scope)));

      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SW ready 10 saniyede yanıt vermedi — Service Worker kayıtlı değil!")), 10_000)
        ),
      ]);
      console.log("[Push] 4. Adım sonuç: SW ready — scope:", reg.scope, "active:", reg.active?.state);

      // 5 — PushManager subscribe
      console.log("[Push] 5. Adım: PushManager'a abone olunuyor...");
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log("[Push] 5. Adım: applicationServerKey uzunluğu:", applicationServerKey.length);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log("[Push] 5. Adım sonuç: Abonelik objesi oluşturuldu:", JSON.stringify(sub.toJSON()));
      console.log("[Push] 5. Adım: endpoint:", sub.endpoint);

      // 6 — Server'a kaydet
      const json = sub.toJSON();
      console.log("[Push] 6. Adım: Server action'a gönderiliyor...", {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh?.slice(0, 20) + "...",
        auth: json.keys?.auth?.slice(0, 10) + "...",
      });
      await subscribePushAction({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });
      console.log("[Push] 7. Adım: ✅ Server action başarılı — abonelik DB'ye kaydedildi");

      setState("subscribed");
      toast.success("Push bildirimleri etkinleştirildi!");
    } catch (err: any) {
      console.error("[Push] ❌ HATA DETAYI (handleSubscribe):", err);
      console.error("[Push] Hata adı:", err?.name, "| Mesaj:", err?.message, "| Stack:", err?.stack);
      const errorMsg = "Abonelik başarısız: " + (err.message ?? "Bilinmeyen hata");
      toast.error(errorMsg);
      alert("❌ " + errorMsg);
    } finally {
      setBusy(false);
      console.log("--- ABONELİK BİTTİ ---");
    }
  }

  // ── Aboneliği iptal et ────────────────────────────────────────────────────
  async function handleUnsubscribe() {
    console.log("[Push] handleUnsubscribe başlatıldı");
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      console.log("[Push] Mevcut abonelik:", sub?.endpoint ?? "YOK");
      if (sub) {
        await sub.unsubscribe();
        await unsubscribePushAction(sub.endpoint);
        console.log("[Push] ✅ Abonelik iptal edildi");
      }
      setState("unsubscribed");
      toast.success("Push bildirimleri kapatıldı.");
    } catch (err: any) {
      console.error("[Push] HATA DETAYI (handleUnsubscribe):", err);
      toast.error("İptal başarısız: " + (err.message ?? "Bilinmeyen hata"));
    } finally {
      setBusy(false);
    }
  }

  // ── Test bildirimi gönder ─────────────────────────────────────────────────
  async function handleTestPush() {
    console.log("[Push] handleTestPush başlatıldı");
    setBusy(true);
    try {
      const result = await sendTestPushAction();
      console.log("[Push] ✅ Test push sonucu:", result);
      toast.success("Test bildirimi gönderildi!");
    } catch (err: any) {
      console.error("[Push] HATA DETAYI (handleTestPush):", err);
      toast.error(err.message ?? "Test bildirimi gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") {
    console.log("[Push] ⚠️ Bileşen render edilmiyor — state:", state);
    return null;
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Push Bildirimleri</p>
          <p className="text-xs text-muted-foreground mt-0.5">Kontrol ediliyor…</p>
        </div>
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Push Bildirimleri</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {state === "subscribed"
            ? "Bildirimler açık — sunucudan push alabilirsin."
            : state === "denied"
            ? "İzin reddedildi. Tarayıcı ayarlarından etkinleştir."
            : "Rutin hatırlatıcıları için push bildirim aç."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {state === "subscribed" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestPush}
              disabled={busy}
              className="gap-1.5"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
              Test
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUnsubscribe}
              disabled={busy}
              className="gap-1.5 text-muted-foreground"
            >
              <BellOff size={14} />
              Kapat
            </Button>
          </>
        )}
        {state === "unsubscribed" && (
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={busy}
            className="gap-1.5"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            İzin Ver
          </Button>
        )}
        {state === "denied" && (
          <Button size="sm" variant="outline" disabled className="gap-1.5">
            <BellOff size={14} />
            Engellendi
          </Button>
        )}
      </div>
    </div>
  );
}
