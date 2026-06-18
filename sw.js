const CLARA_APP_VERSION = "clara-v57-bunny-timer-cache-20260618";
const CACHE_NAME = `clara-app-${CLARA_APP_VERSION}`;
const CORE_ASSETS = [
  "./",
  `./index.html?v=${CLARA_APP_VERSION}`,
  `./style.css?v=${CLARA_APP_VERSION}`,
  `./script.js?v=${CLARA_APP_VERSION}`,
  `./manifest.json?v=${CLARA_APP_VERSION}`
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(() => undefined))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  const freshFirst = request.mode === "navigate" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "manifest" ||
    url.pathname.endsWith(".html");

  if (freshFirst) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification?.data?.url || `./index.html?v=${CLARA_APP_VERSION}`;
  event.waitUntil(clients.openWindow(url));
});
