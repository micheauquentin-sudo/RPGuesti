// Service Worker ASTRA RP / RPGuesti
const CACHE_NAME = 'astra-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/astra-logo.png',
  '/scan'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Laisser passer les appels réseau d'API, de websocket et de mutation
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // Network First, avec secours sur le cache hors-ligne
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse si valide
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si on est sur une navigation de page et hors-ligne
          if (event.request.mode === 'navigate') {
            return caches.match('/scan') || caches.match('/');
          }
          return new Response('Hors-ligne', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
