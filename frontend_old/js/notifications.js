function getNotificationTag(notification) {
  return `${notification.currency_code}_${notification.direction}_${notification.threshold}`;
}

async function isNotificationActive(tag) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.log('Brak aktywnego service workera');
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const activeNotifications = await registration.getNotifications({ tag });
  return activeNotifications.length > 0;
}

async function checkNotificationConditions() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const prefs = await preferences.get();
  const notifications = prefs?.data || [];
  if (notifications.length === 0) return;

  const pricesData = await prices.get();
  if (!pricesData?.data) return;

  const currentPrices = pricesData.data;
  const allCurrencies = await currencies.get();
  const currenciesData = allCurrencies?.data || {};

  for (const notification of notifications) {
    const tag = getNotificationTag(notification);

    if (await isNotificationActive(tag)) continue;

    const priceData = currentPrices.find((p) => p.currency_code === notification.currency_code);
    if (!priceData) continue;

    const currentPrice = priceData.sell_price;
    let conditionMet = false;

    if (notification.direction === 'above' && currentPrice > notification.threshold) {
      conditionMet = true;
    } else if (notification.direction === 'below' && currentPrice < notification.threshold) {
      conditionMet = true;
    }

    if (conditionMet) {
      const currencyName =
        currenciesData[notification.currency_code]?.name || notification.currency_code;
      const directionText =
        notification.direction === 'above' ? 'wzrasta powyżej' : 'spada poniżej';

      await showNotification(
        `${currencyName} ${directionText} ${notification.threshold.toFixed(2)} PLN`,
        `Aktualny kurs: ${currentPrice.toFixed(2)} PLN`,
        tag
      );
    }
  }
}

async function showNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  console.log(`Wyświetlanie powiadomienia: ${title}`);

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

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}
