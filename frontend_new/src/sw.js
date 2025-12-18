// Stałe aplikacji
const VERSION = "v1";
const CACHE_NAME = `exchange-${VERSION}`;
const APP_ASSETS = ["/", "/index.html", "/src"];

// Instalacja Service Workera i cache'owanie zasobów aplikacji
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_ASSETS);
    })
  );

  self.skipWaiting();
});

// Aktywacja Service Workera i usuwanie starych cache'y
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      Promise.all(
        keys
          .filter((key) => key.startsWith("exchange") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

// Obsługa żądań sieciowych i serwowanie zasobów z cache'a
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch((err) => {
        console.error("Błąd zapytania fetch: ", err);
      })
  );
});

// Obsługa kliknięć w powiadomienia push
self.addEventListener("notificationclick", (event) => {
  console.log("Kliknięto powiadomienie:", event.notification.title);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === self.location.origin + "/" && "focus" in client) {
          console.log("Fokus na istniejącą kartę");
          return client.focus();
        }
      }
      console.log("Otwieranie nowej karty");
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
