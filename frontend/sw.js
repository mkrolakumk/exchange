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
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

// Cache statycznych zasobów podczas instalacji Service Workera, czyli Cache First
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker zainstalowany, zasoby statyczne zapisane w cache.');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Błąd podczas cachowania statycznych zasobów:', error);
      })
  );
});

// Usuwanie starych cache podczas aktywacji nowego Service Workera
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('exchange-cache-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE
            )
            .map((key) => caches.delete(key))
        );
      })
      .then(() => {
        console.log('Service Worker aktywowany, stare cache usunięte.');
      })
      .then(() => {
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('Błąd podczas usuwania starych cache:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Dla metod innych niż GET - przepuść bezpośrednio, Network only
  if (request.method !== 'GET') {
    return;
  }

  // Zapisz kursy historyczne w cache, czyli Stale-While-Revalidate
  if (request.url.includes('/api/currencies/history')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Jeśli sieć jest niedostępna, zwróć odpowiedź z cache (jeśli istnieje)
              return (
                cachedResponse ||
                new Response(JSON.stringify({ error: 'Brak danych' }), {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' },
                })
              );
            });

          return cachedResponse || fetchPromise;
        });
      })
    );
  }

  // Nie obsługuj żądań API - zawsze przepuść do sieci, również Network only
  if (url.pathname.startsWith('/api/')) {
    return;
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Kliknięto powiadomienie:', event.notification.title);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          console.log('Fokus na istniejącą kartę:', client.url);
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
