const CACHE_NAME = '3d-models-playground-pwa-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_ASSETS);
      await Promise.allSettled(
        CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((res) => { if (res && res.ok) return cache.put(url, res); })
            .catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const net = fetch(event.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }
  const isSame = reqUrl.origin === self.location.origin;
  const isCDN = CDN_ASSETS.includes(event.request.url) ||
    reqUrl.hostname.includes('cdnjs.cloudflare.com') ||
    reqUrl.hostname.includes('cdn.jsdelivr.net');
  if (isSame || isCDN) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      })
    );
  }
});
