const CACHE_NAME = "golden-formula-shell-v1";

// Only cache the bare minimum app shell
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
});

// NEVER cache JS — always fetch fresh Golden Formula logic
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Always fetch JS fresh (Golden Formula engine, OCR, parsing, renderer)
  if (url.endsWith(".js")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for HTML + manifest only
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
