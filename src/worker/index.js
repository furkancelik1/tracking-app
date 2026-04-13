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
      title: "Rutin Takipçisi",
      body: event.data.text(),
    };
  }

  const { title, body, icon, badge, url, tag } = payload;

  const options = {
    body: body ?? "",
    icon: icon ?? "/icons/maskable_icon_x192.png",
    badge: badge ?? "/icons/maskable_icon_x192.png",
    tag: tag ?? "default",
    vibrate: [200, 100, 200],
    data: { url: url ?? "/dashboard" },
    actions: [
      { action: "open", title: "Aç" },
      { action: "dismiss", title: "Kapat" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title ?? "Rutin Takipçisi", options)
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
