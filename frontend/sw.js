const VERSION = 'v1';
const STATIC_CACHE = `exchange-cache-static-${VERSION}`;
const DYNAMIC_CACHE = `exchange-cache-dynamic-${VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './src/styles.css',
  './src/app.js',
  './src/router.js',
  './src/state.js',
  './src/components/menu.js',
  './src/components/modal.js',
  './src/components/confirm.js',
  './src/components/currencyRow.js',
  './src/views/home.js',
  './src/views/balance.js',
  './src/views/history.js',
  './src/views/notifications.js',
  './src/utils/api.js',
  './src/utils/db.js',
  './src/utils/queue.js',
  './src/utils/geolocation.js',
  './src/utils/install.js',
  './src/utils/notifications.js',
  './src/utils/onboarding.js',
  './src/utils/chart.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('exchange-cache-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE
          )
          .map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nie obsługuj żądań API - zawsze przepuść do sieci
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Dla metod innych niż GET - przepuść bezpośrednio
  if (request.method !== 'GET') {
    return;
  }

  // Dla zasobów z tego samego originu (ale NIE /api/*) - cache-first strategy
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          return (
            cachedResponse ||
            fetch(request).then((networkResponse) => {
              // Cachuj tylko poprawne odpowiedzi
              if (networkResponse && networkResponse.ok) {
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, networkResponse.clone());
                  return networkResponse;
                });
              }
              return networkResponse;
            })
          );
        })
        .catch(() => {
          // Fallback do index.html TYLKO dla nawigacji
          if (request.mode === 'navigate' || request.destination === 'document') {
            return caches.match('./index.html');
          }
          // Dla innych zasobów - brak fallbacku
          throw new Error('Offline - brak zasobu w cache');
        })
    );
  } else {
    // Dla zewnętrznych zasobów (np. CDN) - network-first
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Obsługa kliknięć w powiadomienia push
self.addEventListener('notificationclick', (event) => {
  console.log('Kliknięto powiadomienie:', event.notification.title);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === self.location.origin + '/' && 'focus' in client) {
          console.log('Fokus na istniejącą kartę');
          return client.focus();
        }
      }
      console.log('Otwieranie nowej karty');
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
