const VERSION = 'v4';
const STATIC_CACHE = `static-${VERSION}`;
const DYNAMIC_CACHE = `dynamic-${VERSION}`;

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
  './manifest.json',
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
            (key) => key.startsWith('exchange') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE
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

  // Nie cachuj żądań API - przepuść je bezpośrednio do sieci
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Dla metod innych niż GET (POST, PUT, DELETE, PATCH) - przepuść bezpośrednio
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Dla zasobów z tego samego originu - cache-first strategy
  if (url.origin === location.origin) {
    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          return (
            cachedResponse ||
            fetch(request).then((networkResponse) => {
              // Cachuj tylko poprawne odpowiedzi
              if (networkResponse && networkResponse.status === 200) {
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
          // Fallback do index.html dla navigation requests
          if (request.destination === 'document') {
            return caches.match('./index.html');
          }
        })
    );
  } else {
    // Dla zewnętrznych zasobów - network-first strategy
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
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
