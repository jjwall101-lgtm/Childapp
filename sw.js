const CACHE_NAME = "clara-bunny-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=clara-bunny-5",
  "./script.js?v=clara-bunny-5",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => undefined))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request).then(match => match || caches.match("./index.html")))
  );
});
