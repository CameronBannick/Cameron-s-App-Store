// Service worker — NETWORK-FIRST so updates always show up on the next load.
//
// When online: every request goes to the network first, so new/changed apps,
// CSS, and JS appear immediately on a single reload (no cache-busting, no
// clearing site data). A fresh copy is stashed in the cache as we go.
// When offline: we fall back to that cached copy so the store still opens.
// APKs are never cached (they're large and must always be fetched fresh).

const CACHE = 'cameron-store-v4';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/placeholder.svg',
];

self.addEventListener('install', (event) => {
  // Pre-cache the shell for first-load offline support, then take over ASAP.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Drop old caches and start controlling open pages immediately.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // APKs: straight to network, never cached (too big; must be current).
  if (url.pathname.endsWith('.apk')) return;

  // Everything else: network-first, fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Stash a fresh copy of good same-origin responses for offline use.
        // Key by URL string so requests made with cache:'no-store' (e.g. the
        // catalog) don't make Cache.put() reject; swallow any storage error.
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.href, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        // Offline: serve the cached version, or the app shell for navigations.
        caches.match(req).then((cached) =>
          cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
