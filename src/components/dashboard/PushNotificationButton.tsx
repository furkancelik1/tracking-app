"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("push");
  const [state, setState] = useState<SubState>("loading");
  const [busy, setBusy] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    } catch {
      setState("unsubscribed");
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  async function handleSubscribe() {
    setBusy(true);
    try {
      if (!VAPID_PUBLIC_KEY) {
        throw new Error("VAPID key not configured");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        toast.error(t("permissionDenied"));
        return;
      }

      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service Worker timeout")), 10_000)
        ),
      ]);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await subscribePushAction({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });

      setState("subscribed");
      toast.success(t("enabled"));
    } catch (err: any) {
      toast.error(t("subscribeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribePushAction(sub.endpoint);
      }
      setState("unsubscribed");
      toast.success(t("disabled"));
    } catch (err: any) {
      toast.error(t("unsubscribeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleTestPush() {
    setBusy(true);
    try {
      await sendTestPushAction();
      toast.success(t("testSent"));
    } catch {
      toast.error(t("testFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") return null;

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("checking")}</p>
        </div>
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {state === "subscribed"
            ? t("statusOn")
            : state === "denied"
            ? t("statusDenied")
            : t("statusOff")}
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
              {t("test")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUnsubscribe}
              disabled={busy}
              className="gap-1.5 text-muted-foreground"
            >
              <BellOff size={14} />
              {t("turnOff")}
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
            {t("allow")}
          </Button>
        )}
        {state === "denied" && (
          <Button size="sm" variant="outline" disabled className="gap-1.5">
            <BellOff size={14} />
            {t("blocked")}
          </Button>
        )}
      </div>
    </div>
  );
}
