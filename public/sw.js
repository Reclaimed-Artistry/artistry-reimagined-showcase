const CACHE_PREFIX = "selah-bible-shell-";
const CACHE_NAME = `${CACHE_PREFIX}__SELAH_CACHE_VERSION__`;
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/kids-story-hero.webp",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/bibles/cdn_catalog.json",
  "/bibles/bolls_catalog.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Your daily Scripture reminder is ready." };
  }
  const title = payload.title || "A quiet moment with Scripture";
  const options = {
    body: payload.body || "Open Selah to continue your reading.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "selah-daily-reading-reminder",
    data: { url: payload.url || "/?section=reader" },
  };
  // A group notice is worth interrupting for: it is another person writing to
  // you, so it re-alerts and stays on screen instead of replacing the last one.
  if (payload.groupId || String(payload.tag || "").startsWith("selah-group-")) {
    options.renotify = true;
    options.requireInteraction = false;
    options.tag = payload.tag || `selah-group-${Date.now()}`;
  }
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Keep the app badge in step so an installed Selah shows the count even
      // when the reader has the app closed.
      if (typeof payload.unreadCount === "number" && "setAppBadge" in self.navigator) {
        return self.setAppBadge(payload.unreadCount).catch(() => {});
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/?section=reader", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        return existing.focus().then(() => existing.navigate(targetUrl)).catch(() => self.clients.openWindow(targetUrl));
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("node_modules") ||
    url.pathname.startsWith("/src/") ||
    url.pathname === "/sw.js"
  ) {
    return;
  }

  // Always check the network for the app document so deployed UI changes aren't
  // hidden behind a stale cached index.html. Keep a cached shell for offline use.
  if (req.mode === "navigate" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      });
    })
  );
});
