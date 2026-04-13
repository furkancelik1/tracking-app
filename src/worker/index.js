// ─── Custom Worker — Push Notifications ───────────────────────────────────────
// Bu dosya next-pwa tarafından Workbox-generated sw.js içine merge edilir.
// Install / Activate / Fetch → Workbox yönetir.
// Push + NotificationClick → burada tanımlanır.

// ── Push — bildirim göster ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "ZenTrack",
      body: event.data.text(),
    };
  }

  const { title, body, icon, badge, url, tag, actions: customActions } = payload;

  const options = {
    body: body ?? "",
    icon: icon ?? "/icons/icon-192x192.png",
    badge: badge ?? "/icons/icon-192x192.png",
    tag: tag ?? "zentrack-default",
    vibrate: [100, 50, 100],
    renotify: true,
    data: { url: url ?? "/dashboard" },
    actions: customActions ?? [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title ?? "ZenTrack", options)
  );
});

// ── Notification Click — tıklanınca sayfayı aç ─────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
