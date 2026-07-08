const CACHE_NAME = 'forum-geekshacking-pwa-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/login',
  '/login.html',
  '/signup',
  '/signup.html',
  '/forgot-password',
  '/forgot-password.html',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icons/forumlogo192.png',
  '/icons/forumlogo512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        return (
          (await caches.match(url.pathname)) ||
          (await caches.match(`${url.pathname}.html`)) ||
          (await caches.match('/index.html')) ||
          Response.error()
        );
      })
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?)$/i.test(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
