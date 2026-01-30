import { saveToDB, getFromDB } from './db.js';
import { detectCurrency } from './api.js';

function getNativeGeolocation() {
  const capacitor = window?.Capacitor;
  if (!capacitor || typeof capacitor.isNativePlatform !== 'function') {
    return null;
  }

  if (!capacitor.isNativePlatform()) {
    return null;
  }

  const plugins = capacitor.Plugins || capacitor.plugins;
  return plugins?.Geolocation || null;
}

async function getPositionFromNative(options) {
  const nativeGeolocation = getNativeGeolocation();
  if (!nativeGeolocation?.getCurrentPosition) {
    return null;
  }

  try {
    if (nativeGeolocation.requestPermissions) {
      if (nativeGeolocation.checkPermissions) {
        const permissions = await nativeGeolocation.checkPermissions();
        const isGranted =
          permissions?.location === 'granted' || permissions?.coarseLocation === 'granted';

        if (!isGranted) {
          const requestResult = await nativeGeolocation.requestPermissions();
          const grantedAfterRequest =
            requestResult?.location === 'granted' || requestResult?.coarseLocation === 'granted';

          if (!grantedAfterRequest) {
            console.log('Użytkownik odmówił dostępu do lokalizacji (native)');
            return null;
          }
        }
      } else {
        const requestResult = await nativeGeolocation.requestPermissions();
        const grantedAfterRequest =
          requestResult?.location === 'granted' || requestResult?.coarseLocation === 'granted';

        if (!grantedAfterRequest) {
          console.log('Użytkownik odmówił dostępu do lokalizacji (native)');
          return null;
        }
      }
    }

    return await nativeGeolocation.getCurrentPosition(options);
  } catch (error) {
    console.log('Błąd geolokalizacji (native):', error?.message || error);
    return null;
  }
}

async function getPositionFromWeb(options) {
  if (!('geolocation' in navigator)) {
    return null;
  }

  return await new Promise((resolve) => {
    console.log('Pobieranie pozycji...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Pozycja pobrana:', pos.coords.latitude, pos.coords.longitude);
        resolve(pos);
      },
      (error) => {
        console.log('Błąd geolokalizacji:', error.code, error.message);
        if (error.code === 1) {
          console.log('Użytkownik odmówił dostępu do lokalizacji');
        }
        resolve(null);
      },
      options
    );
  });
}

export async function checkAndUpdateLocalCurrency() {
  console.log('Sprawdzanie geolokalizacji...');
  try {
    const savedCurrency = await getFromDB('localCurrency');
    console.log('Zapisana waluta:', savedCurrency);

    const options = {
      timeout: 60000,
      maximumAge: 0,
      enableHighAccuracy: true,
    };

    let position = await getPositionFromNative(options);
    if (!position) {
      position = await getPositionFromWeb(options);
    }

    if (!position) {
      console.log('Brak pozycji, zachowuję obecną walutę');
      if (!savedCurrency) {
        await saveToDB('localCurrency', 'PLN');
      }
      return;
    }

    const { latitude, longitude } = position.coords;
    const data = await detectCurrency(latitude, longitude);
    const detectedCurrency = data.currency;

    if (!savedCurrency) {
      console.log(`Ustawiono pierwszą walutę: ${detectedCurrency}`);
      await saveToDB('localCurrency', detectedCurrency);
    } else if (savedCurrency !== detectedCurrency) {
      console.log(`Zmiana waluty: ${savedCurrency} → ${detectedCurrency}`);
      await saveToDB('localCurrency', detectedCurrency);
      showCurrencyNotification(detectedCurrency);
    } else {
      console.log(`Waluta bez zmian: ${savedCurrency}`);
    }
  } catch (error) {
    console.error('Błąd podczas wykrywania lokalizacji:', error);
    const savedCurrency = await getFromDB('localCurrency');
    if (!savedCurrency) {
      await saveToDB('localCurrency', 'PLN');
    }
  }
}

export async function getLocalCurrency() {
  const currency = await getFromDB('localCurrency');
  return currency || 'PLN';
}

function showCurrencyNotification(currency) {
  const notification = document.createElement('div');
  notification.className = 'currency-notification';

  const content = document.createElement('div');
  content.className = 'currency-notification-content';

  const icon = document.createElement('div');
  icon.className = 'currency-notification-icon';
  icon.textContent = '🌍';

  const textContainer = document.createElement('div');
  textContainer.className = 'currency-notification-text';

  const title = document.createElement('div');
  title.className = 'currency-notification-title';
  title.textContent = 'Wykryto nową lokalizację';

  const currencyCode = document.createElement('div');
  currencyCode.className = 'currency-notification-currency';
  currencyCode.textContent = currency;

  textContainer.appendChild(title);
  textContainer.appendChild(currencyCode);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'currency-notification-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => notification.remove();

  content.appendChild(icon);
  content.appendChild(textContainer);
  content.appendChild(closeBtn);
  notification.appendChild(content);

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}
