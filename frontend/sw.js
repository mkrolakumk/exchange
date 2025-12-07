// Stałe aplikacji
const VERSION = 'v1';
const CACHE_NAME = `exchange-${VERSION}`;
const APP_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/db.js',
  '/css/style.css',
  '/js/state.js',
  '/js/api.js',
  '/js/router.js',
  '/js/components/menu.js',
  '/js/components/modal.js',
  '/js/views/prices.js',
  '/js/views/home.js',
  '/js/views/balance.js',
  '/js/views/notifications.js',
  '/manifest.json',
  '/favicon.ico',
  '/assets',
];

// Instalacja Service Workera i cache'owanie zasobów aplikacji
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_ASSETS);
    })
  );

  self.skipWaiting();
});

// Aktywacja Service Workera i usuwanie starych cache'y
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      Promise.all(
        keys
          .filter((key) => key.startsWith('exchange') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

// Obsługa żądań sieciowych i serwowanie zasobów z cache'a
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch((err) => {
        console.error('Błąd zapytania fetch: ', err);
      })
  );
});
