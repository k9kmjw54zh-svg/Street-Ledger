// Street Ledger service worker
// Strategy: network-first for the game file itself (so new versions always
// load when online), falling back to cache when offline. This avoids the
// "stuck on an old cached version" problem without needing manual cache-busting
// on every release.

const CACHE_NAME = "street-ledger-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests from our own origin's app shell files.
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Got a fresh copy — update the cache for offline use next time.
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return networkResponse;
      })
      .catch(() =>
        // Offline (or request failed) — serve the last cached copy if we have one.
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
