import { saveToDB, getFromDB } from './db.js';
import { detectCurrency } from './api.js';

export async function checkAndUpdateLocalCurrency() {
  console.log('Sprawdzanie geolokalizacji...');
  try {
    const savedCurrency = await getFromDB('localCurrency');
    console.log('Zapisana waluta:', savedCurrency);

    const position = await new Promise((resolve, reject) => {
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
        {
          timeout: 60000,
          maximumAge: 0,
          enableHighAccuracy: true,
        }
      );
    });

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
  notification.innerHTML = `
    <div class="currency-notification-content">
      <span class="currency-notification-icon">🌍</span>
      <div class="currency-notification-text">
        <div class="currency-notification-title">Wykryto lokalną walutę</div>
        <div class="currency-notification-currency">${currency}</div>
      </div>
      <button class="currency-notification-close" aria-label="Zamknij">×</button>
    </div>
  `;

  document.body.appendChild(notification);

  const closeBtn = notification.querySelector('.currency-notification-close');
  closeBtn.onclick = () => notification.remove();

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}
