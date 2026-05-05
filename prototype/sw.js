/* QLINK 프로토타입 Service Worker (App Shell + 런타임 캐시) */
const CACHE = 'qlink-shell-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './icon.svg',
  './icon-home.png',
  './icon-folder.png',
  './icon-search.png',
  './icon-settings.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // 같은 오리진의 정적 자산: cache-first
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
              return res;
            })
            .catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // 외부 자산(파비콘 등): stale-while-revalidate
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy).catch(() => {}));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
