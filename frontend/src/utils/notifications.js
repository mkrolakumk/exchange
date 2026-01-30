import { state } from '../state.js';
import { fetchPrices, fetchNotifications, fetchCurrencies } from '../utils/api.js';

function getNativeLocalNotifications() {
  const capacitor = window?.Capacitor;
  if (!capacitor || typeof capacitor.isNativePlatform !== 'function') {
    return null;
  }

  if (!capacitor.isNativePlatform()) {
    return null;
  }

  const plugins = capacitor.Plugins || capacitor.plugins;
  return plugins?.LocalNotifications || null;
}

function mapNativePermission(permission) {
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  return 'default';
}

function getNotificationIdFromTag(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0; // 32-bit
  }
  return Math.abs(hash || 1);
}

export async function getNotificationPermission() {
  const nativeNotifications = getNativeLocalNotifications();
  if (nativeNotifications?.checkPermissions) {
    try {
      const result = await nativeNotifications.checkPermissions();
      return mapNativePermission(result?.display);
    } catch (err) {
      console.warn('Nie udało się sprawdzić uprawnień powiadomień (native):', err);
    }
  }

  if ('Notification' in window) {
    return Notification.permission;
  }

  return 'unsupported';
}

export async function requestNotificationPermission() {
  const nativeNotifications = getNativeLocalNotifications();
  if (nativeNotifications?.requestPermissions) {
    try {
      const result = await nativeNotifications.requestPermissions();
      return mapNativePermission(result?.display);
    } catch (err) {
      console.warn('Nie udało się pobrać uprawnień powiadomień (native):', err);
      return 'denied';
    }
  }

  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

function getNotificationTag(notification) {
  return `${notification.currency_code}_${notification.direction}_${notification.threshold}`;
}

async function isNotificationActive(tag) {
  const nativeNotifications = getNativeLocalNotifications();
  if (nativeNotifications?.getPending) {
    try {
      const pending = await nativeNotifications.getPending();
      return (
        pending?.notifications?.some((notification) =>
          notification?.extra?.tag ? notification.extra.tag === tag : false
        ) || false
      );
    } catch (err) {
      console.warn('Nie udało się odczytać oczekujących powiadomień (native):', err);
    }
  }

  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const activeNotifications = await registration.getNotifications({ tag });
  return activeNotifications.length > 0;
}

async function showNotification(title, body, tag) {
  const nativeNotifications = getNativeLocalNotifications();
  if (nativeNotifications?.schedule) {
    const permission = await getNotificationPermission();
    if (permission !== 'granted') return;

    const id = getNotificationIdFromTag(tag);
    await nativeNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          extra: { tag },
        },
      ],
    });
    return;
  }

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
  const permission = await getNotificationPermission();
  if (permission !== 'granted') return;

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
