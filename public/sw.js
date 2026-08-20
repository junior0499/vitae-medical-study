const CACHE_NAME = "poh-tah-toh-travel-v9";
const APP_SHELL = ["/", "/offline", "/study-tools"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_TRAVEL_PACK" || !Array.isArray(event.data.urls)) return;
  const urls = Array.from(new Set([...APP_SHELL, ...event.data.urls.filter((url) => typeof url === "string" && url.startsWith("/") && !url.startsWith("/api/"))])).slice(0, 80);
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    const old = await cache.keys(); await Promise.all(old.map((request) => cache.delete(request)));
    const results = await Promise.allSettled(urls.map((url) => cache.add(url)));
    const cached = results.filter((result) => result.status === "fulfilled").length;
    event.ports?.[0]?.postMessage({ ok: true, cached, failed: results.length - cached });
  }).catch((error) => event.ports?.[0]?.postMessage({ ok: false, error: error instanceof Error ? error.message : "Offline saving failed." })));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/offline"))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
