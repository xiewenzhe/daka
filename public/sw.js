self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network-first placeholder. Full offline caching can be added later.
});

self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : {
        title: "喝药提醒",
        body: "到喝药时间了。",
        url: "/app"
      };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: {
        url: data.url || "/app"
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(url));

      if (existingClient) {
        return existingClient.focus();
      }

      return self.clients.openWindow(url);
    })
  );
});
