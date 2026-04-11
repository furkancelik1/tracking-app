// Custom push event handler — next-pwa otomatik olarak bu dosyayı SW'ye inject eder.
// @ts-nocheck

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

  event.waitUntil(self.registration.showNotification(title ?? "Rutin Takipçisi", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir pencere varsa odaklan
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Yoksa yeni pencere aç
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
