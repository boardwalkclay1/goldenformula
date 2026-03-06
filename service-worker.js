// ===============================
// GOLDEN FORMULA SERVICE WORKER — UPGRADED
// ===============================

const CACHE_NAME = "golden-formula-shell-v3";

// Only cache the bare minimum app shell (HTML + manifest + icons)
const FILES_TO_CACHE = [
  "/goldenformula/",
  "/goldenformula/index.html",
  "/goldenformula/simulator.html",
  "/goldenformula/manifest.json",
  "/goldenformula/gf-logo.png",
  "/goldenformula/favicon.ico"
];

// INSTALL — cache shell only
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(FILES_TO_CACHE)
    )
  );
  self.skipWaiting();
});

// ACTIVATE — clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH — JS always fresh, shell cache-first
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = req.url;

  // Always fetch JS fresh (engine logic, OCR, parsing, renderer)
  if (url.endsWith(".js")) {
    event.respondWith(fetch(req));
    return;
  }

  // Cache-first for HTML + manifest + icons
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req);
    })
  );
});
