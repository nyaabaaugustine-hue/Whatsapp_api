const CACHE = 'drv-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/offline.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(self.clients.claim())
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const client = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (client && 'focus' in client) return client.focus();
      return self.clients.openWindow('/');
    })
  );
});

function isNavigation(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Network-first for API
  if (req.url.includes('/api/')) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req)).then(res => res || new Response('', { status: 503 }))
    );
    return;
  }

  // Navigation fallback to offline.html
  if (isNavigation(req)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/offline.html')).then(res => res || new Response('', { status: 503 }))
    );
    return;
  }

  // Images: stale-while-revalidate
  if (req.destination === 'image') {
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached);
        return cached || fetchPromise || new Response('', { status: 503 });
      })
    );
    return;
  }

  // Default: cache with network update
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || fetchPromise || new Response('', { status: 503 });
    })
  );
});
