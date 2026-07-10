// NPS Registrar — service worker (manual PWA, no build plugin).
// Bump VERSION to force every client to refetch the app shell after a deploy.
const VERSION = 'v2';
const CACHE = `nps-registrar-${VERSION}`;

// App shell precached on install so the app opens offline after the first visit.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/nps-logo.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache each item independently so one 404 doesn't fail the whole install
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin. Supabase (auth + data) is cross-origin and must
  // always hit the network — never cache or intercept it.
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first (so a fresh deploy is picked up), falling
  // back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // Hashed static assets / icons: cache-first, then network (and cache it).
  // Always resolve to a real Response — returning undefined to respondWith throws
  // "Failed to convert value to 'Response'" and shows as a network error.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(
          () =>
            cached ??
            new Response('', { status: 504, statusText: 'Offline' }),
        );
    }),
  );
});
