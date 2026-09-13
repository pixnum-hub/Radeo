/* Radeo service worker — caches the same-origin app shell only.
   Cross-origin requests (Radio Browser API search, Icecast/HLS audio streams)
   are always left untouched so search results and playback stay live. */
const CACHE_VERSION = "radeo-shell-v3";
const SHELL_PATHS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/favicon/favicon.ico",
  "./icons/favicon/favicon-16.png",
  "./icons/favicon/favicon-32.png",
  "./icons/favicon/favicon-48.png",
  "./icons/favicon/favicon-64.png",
  "./icons/pwa/icon-72.png",
  "./icons/pwa/icon-96.png",
  "./icons/pwa/icon-128.png",
  "./icons/pwa/icon-144.png",
  "./icons/pwa/icon-152.png",
  "./icons/pwa/icon-192.png",
  "./icons/pwa/icon-256.png",
  "./icons/pwa/icon-384.png",
  "./icons/pwa/icon-512.png",
  "./icons/pwa/icon-maskable-192.png",
  "./icons/pwa/icon-maskable-512.png",
  "./icons/apple/apple-touch-icon-120.png",
  "./icons/apple/apple-touch-icon-152.png",
  "./icons/apple/apple-touch-icon-167.png",
  "./icons/apple/apple-touch-icon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const urls = SHELL_PATHS.map((p) => new URL(p, self.registration.scope).href);
    await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin API/stream requests

  event.respondWith((async () => {
    const cached = await caches.match(req);
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  })());
});
