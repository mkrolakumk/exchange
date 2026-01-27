import { state } from '../state.js';
import { fetchPrices, fetchNotifications, fetchCurrencies } from '../utils/api.js';

function getNotificationTag(notification) {
  return `${notification.currency_code}_${notification.direction}_${notification.threshold}`;
}

async function isNotificationActive(tag) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const activeNotifications = await registration.getNotifications({ tag });
  return activeNotifications.length > 0;
}

async function showNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });
  } else {
    new Notification(title, {
      body,
      icon: '/assets/icons/icon-192.png',
      tag,
    });
  }
}

export async function checkNotificationConditions() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const isLoggedIn = await state.isLoggedIn();
  if (!isLoggedIn) return;

  try {
    const notifications = await fetchNotifications();

    if (notifications.length === 0) return;

    const pricesData = await fetchPrices();
    if (!pricesData) return;

    const currenciesData = await fetchCurrencies();

    for (const notification of notifications) {
      const tag = getNotificationTag(notification);

      if (await isNotificationActive(tag)) continue;

      const priceData = pricesData.find((p) => p.currency_code === notification.currency_code);
      if (!priceData) continue;

      const currentPrice = Number(priceData.sell_price);
      const threshold = Number(notification.threshold);

      if (isNaN(currentPrice) || isNaN(threshold)) continue;

      let conditionMet = false;

      if (notification.direction === 'above' && currentPrice > threshold) {
        conditionMet = true;
      } else if (notification.direction === 'below' && currentPrice < threshold) {
        conditionMet = true;
      }

      if (conditionMet) {
        const currencyName =
          currenciesData[notification.currency_code]?.name || notification.currency_code;
        const directionText =
          notification.direction === 'above' ? 'wzrasta powyżej' : 'spada poniżej';

        await showNotification(
          `${currencyName} ${directionText} ${threshold.toFixed(2)} PLN`,
          `Aktualny kurs: ${currentPrice.toFixed(2)} PLN`,
          tag
        );
      }
    }
  } catch (err) {
    console.error('Błąd sprawdzania powiadomień:', err);
  }
}

let notificationInterval = null;

export function startNotificationMonitoring() {
  if (notificationInterval !== null) {
    return;
  }

  checkNotificationConditions();
  notificationInterval = setInterval(() => {
    checkNotificationConditions();
  }, 30000);
}

export function stopNotificationMonitoring() {
  if (notificationInterval !== null) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}
