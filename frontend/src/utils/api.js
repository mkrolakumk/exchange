import { getFromDB, saveToDB } from './db.js';

function getApiBase() {
  const injectedUrl = '__API_URL__';
  const defaultUrl = 'http://localhost:8000';

  if (injectedUrl && !injectedUrl.startsWith('__')) {
    return injectedUrl;
  }

  let envUrl;
  try {
    envUrl = import.meta?.env?.VITE_API_BASE;
  } catch {
    return defaultUrl;
  }

  if (!envUrl) return defaultUrl;

  try {
    const url = new URL(envUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.warn('Nieprawidłowy protokół w VITE_API_BASE, używam domyślnego');
      return defaultUrl;
    }
    return envUrl;
  } catch {
    console.warn('Nieprawidłowy URL w VITE_API_BASE, używam domyślnego');
    return defaultUrl;
  }
}

const API_BASE = getApiBase();

export class NetworkError extends Error {
  constructor(message = 'Brak połączenia z serwerem') {
    super(message);
    this.name = 'NetworkError';
    this.isNetworkError = true;
  }
}

async function handleUnauthorized() {
  const { state } = await import('../state.js');
  try {
    await logoutUser();
  } catch {}
  await state.clearAuth();

  const { updateMenuState } = await import('../components/menu.js');
  updateMenuState(false);

  window.location.hash = '#home';
}

async function apiFetch(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    await saveToDB('backend_status', {
      isOnline: true,
      lastCheck: Date.now(),
    });

    if (response.status === 401 || response.status === 403) {
      await handleUnauthorized();
      throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }

    return response;
  } catch (error) {
    if (error.message === 'Sesja wygasła. Zaloguj się ponownie.') {
      throw error;
    }
    await saveToDB('backend_status', {
      isOnline: false,
      lastCheck: Date.now(),
    });
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new NetworkError();
    }
    throw error;
  }
}

export const backendStatus = {
  async check() {
    try {
      const response = await fetch(`${API_BASE}/status`, {
        signal: AbortSignal.timeout(5000),
      });
      const isOnline = response.ok;
      await saveToDB('backend_status', {
        isOnline,
        lastCheck: Date.now(),
      });
      return isOnline;
    } catch {
      await saveToDB('backend_status', {
        isOnline: false,
        lastCheck: Date.now(),
      });
      return false;
    }
  },

  async getStatus() {
    const status = await getFromDB('backend_status');
    return status || { isOnline: false, lastCheck: 0 };
  },

  async getLastOnlineAge() {
    const status = await this.getStatus();
    return Date.now() - status.lastCheck;
  },
};

export async function registerUser(email, password, firstName, lastName) {
  const response = await apiFetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd rejestracji');
  }
  console.log('Użytkownik zarejestrowany pomyślnie!');
  return response.json();
}

export async function loginUser(email, password) {
  const response = await apiFetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) throw new Error('Błędne dane logowania');
  console.log('Użytkownik zalogowany pomyślnie!');
  return response.json();
}

export async function logoutUser() {
  const response = await apiFetch(`${API_BASE}/users/logout`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Błąd wylogowania');
  console.log('Użytkownik wylogowany pomyślnie!');
  return response.json();
}

export async function getUserMe() {
  const response = await apiFetch(`${API_BASE}/users/me`);
  if (!response.ok) throw new Error('Błąd pobierania danych użytkownika');
  console.log('Dane użytkownika pobrane pomyślnie!');
  return response.json();
}
export async function fetchCurrencies() {
  const response = await apiFetch(`${API_BASE}/currencies/`);
  if (!response.ok) throw new Error('Nie udało się pobrać walut');
  console.log('Waluty pobrane pomyślnie!');
  return response.json();
}

export async function fetchPrices() {
  const response = await apiFetch(`${API_BASE}/currencies/prices`);
  if (!response.ok) throw new Error('Nie udało się pobrać cen');
  console.log('Ceny walut pobrane pomyślnie!');
  return response.json();
}

export async function checkBackendStatus() {
  return await backendStatus.check();
}

export async function fetchBalance() {
  const response = await apiFetch(`${API_BASE}/balance/balance`);
  if (!response.ok) throw new Error('Nie udało się pobrać salda');
  let balance = await response.json();
  console.log('Saldo pobrane pomyślnie!', balance);
  return balance;
}

export async function depositBalance(currencyCode, amount) {
  const response = await apiFetch(
    `${API_BASE}/balance/deposit?amount=${amount}&currency_code=${currencyCode}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd wpłaty');
  }
  console.log('Wpłata wykonana pomyślnie!');
  return response.json();
}

export async function withdrawBalance(currencyCode, amount, bankAccount) {
  const response = await apiFetch(
    `${API_BASE}/balance/withdraw?amount=${amount}&currency_code=${currencyCode}&bank_account=${bankAccount}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd wypłaty');
  }
  console.log('Wypłata wykonana pomyślnie!');
  return response.json();
}

export async function fetchTrades(page = 1) {
  const response = await apiFetch(`${API_BASE}/trades/trades?page=${page}`);
  if (!response.ok) throw new Error('Nie udało się pobrać historii transakcji');
  console.log('Historia transakcji pobrana pomyślnie!');
  return response.json();
}

export async function buyCurrency(currencyCode, amount) {
  const response = await apiFetch(
    `${API_BASE}/trades/buy?currency_code=${currencyCode}&amount=${amount}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd kupna waluty');
  }
  console.log('Waluta kupiona pomyślnie!');
  return response.json();
}

export async function sellCurrency(currencyCode, amount) {
  const response = await apiFetch(
    `${API_BASE}/trades/sell?currency_code=${currencyCode}&amount=${amount}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd sprzedaży waluty');
  }
  console.log('Waluta sprzedana pomyślnie!');
  return response.json();
}

export async function fetchCurrencyHistory(currencyCode, days, signal) {
  const response = await apiFetch(`${API_BASE}/currencies/history/${currencyCode}?n=${days}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error('Błąd pobierania danych historycznych');
  }

  console.log(`Historia ${currencyCode} pobrana pomyślnie!`);
  return response.json();
}

export async function fetchNotifications() {
  const response = await apiFetch(`${API_BASE}/users/preferences/notifications`, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error('Nie udało się pobrać powiadomień');
  console.log('Powiadomienia pobrane pomyślnie!');
  return response.json();
}

export async function updateNotifications(notifications) {
  const response = await apiFetch(`${API_BASE}/users/preferences/notifications`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notifications }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd zapisywania powiadomień');
  }
  console.log('Powiadomienia zapisane pomyślnie!');
  return response.json();
}

export async function detectCurrency(latitude, longitude) {
  const response = await apiFetch(`${API_BASE}/geolocation/detect-currency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!response.ok) throw new Error('Błąd wykrywania waluty');
  console.log('Waluta wykryta pomyślnie!');
  return response.json();
}
