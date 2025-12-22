import { state } from '../state.js';

const API_BASE = 'http://localhost:8000';

export async function registerUser(email, password, firstName, lastName) {
  const response = await fetch(`${API_BASE}/users/register`, {
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
  const response = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) throw new Error('Błędne dane logowania');
  console.log('Użytkownik zalogowany pomyślnie!');
  return response.json();
}

export async function getUserMe(token) {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Błąd pobierania danych użytkownika');
  console.log('Dane użytkownika pobrane pomyślnie!');
  return response.json();
}
export async function fetchCurrencies() {
  const response = await fetch(`${API_BASE}/currencies/`);
  if (!response.ok) throw new Error('Nie udało się pobrać walut');
  console.log('Waluty pobrane pomyślnie!');
  return response.json();
}

export async function fetchPrices() {
  const response = await fetch(`${API_BASE}/currencies/prices`);
  if (!response.ok) throw new Error('Nie udało się pobrać cen');
  console.log('Ceny walut pobrane pomyślnie!');
  return response.json();
}

export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    console.log('Status backendu sprawdzony pomyślnie!');
    return response.ok;
  } catch (error) {
    console.log('Błąd podczas sprawdzania statusu backendu:', error);
    return false;
  }
}

export async function fetchBalance(token) {
  const response = await fetch(`${API_BASE}/balance/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Nie udało się pobrać salda');
  let balance = await response.json();
  await state.setBalanceData(balance);
  console.log('Saldo pobrane pomyślnie!', balance);
  return balance;
}

export async function depositBalance(token, currencyCode, amount) {
  const response = await fetch(
    `${API_BASE}/balance/deposit?amount=${amount}&currency_code=${currencyCode}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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

export async function withdrawBalance(token, currencyCode, amount, bankAccount) {
  const response = await fetch(
    `${API_BASE}/balance/withdraw?amount=${amount}&currency_code=${currencyCode}&bank_account=${bankAccount}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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

export async function fetchTrades(token, page = 1) {
  const response = await fetch(`${API_BASE}/trades/trades?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Nie udało się pobrać historii transakcji');
  console.log('Historia transakcji pobrana pomyślnie!');
  return response.json();
}

export async function buyCurrency(token, currencyCode, amount) {
  const response = await fetch(
    `${API_BASE}/trades/buy?currency_code=${currencyCode}&amount=${amount}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd kupna waluty');
  }
  await fetchBalance(token);
  console.log('Waluta kupiona pomyślnie!');
  return response.json();
}

export async function sellCurrency(token, currencyCode, amount) {
  const response = await fetch(
    `${API_BASE}/trades/sell?currency_code=${currencyCode}&amount=${amount}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd sprzedaży waluty');
  }
  await fetchBalance(token);
  console.log('Waluta sprzedana pomyślnie!');
  return response.json();
}

export async function fetchCurrencyHistory(currencyCode, days, signal) {
  const response = await fetch(`${API_BASE}/currencies/history/${currencyCode}?n=${days}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error('Błąd pobierania danych historycznych');
  }

  console.log(`Historia ${currencyCode} pobrana pomyślnie!`);
  return response.json();
}

export async function fetchNotifications(token) {
  const response = await fetch(`${API_BASE}/users/preferences/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error('Nie udało się pobrać powiadomień');
  console.log('Powiadomienia pobrane pomyślnie!');
  return response.json();
}

export async function updateNotifications(token, notifications) {
  const response = await fetch(`${API_BASE}/users/preferences/notifications`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
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
  const response = await fetch(`${API_BASE}/geolocation/detect-currency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!response.ok) throw new Error('Błąd wykrywania waluty');
  console.log('Waluta wykryta pomyślnie!');
  return response.json();
}
