/* eslint-disable no-undef */
const CACHE_NAME = "ms-inv-cache-v5";

// Archivos mínimos (offline-ish). NO metemos /api aquí.
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Instala y toma control ASAP
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Permite forzar activación desde el cliente
self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo cachea mismo origen
  if (url.origin !== self.location.origin) return;

  // JAMÁS cachear API
  if (url.pathname.startsWith("/api/")) return;

  const accept = req.headers.get("accept") || "";

  // HTML / navegación: NETWORK-FIRST (evita HTML viejo apuntando a bundles viejos)
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put("/index.html", fresh.clone());
          return fresh;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match("/index.html");
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Assets: CACHE-FIRST (rápido), con fallback a red
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return Response.error();
      }
    })()
  );
});
