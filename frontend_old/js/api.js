async function handleUnauthorized() {
  await auth.clearToken();
  window.dispatchEvent(new CustomEvent('unauthorized'));
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    await handleUnauthorized();
    throw new Error('Unauthorized');
  }

  return response;
}

async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const isOnline = response.ok;
    await backend.setStatus(isOnline);
    return isOnline;
  } catch {
    await backend.setStatus(false);
    return false;
  }
}

async function fetchTrades() {
  try {
    const token = await auth.getToken();
    if (!token) return;

    const response = await apiFetch(`${API_BASE}/trades/trades`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const trades = await response.json();
      await auth.setTrades(trades);
      console.log('Zaktualizowano historię transakcji: ', trades);
    }
  } catch (err) {
    console.error('Błąd podczas pobierania transakcji: ', err);
  }
}

async function fetchBalance() {
  try {
    const token = await auth.getToken();
    if (!token) return;

    const response = await apiFetch(`${API_BASE}/balance/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const balance = await response.json();
      await auth.setBalance(balance);
      console.log('Zaktualizowano środki: ', balance);
    }
  } catch (err) {
    console.error('Błąd podczas pobierania środków: ', err);
  }
}

async function depositBalance(currency_code, amount) {
  try {
    const token = await auth.getToken();
    if (!token) throw new Error('Brak tokena');

    const response = await apiFetch(
      `${API_BASE}/balance/deposit?amount=${amount}&currency_code=${currency_code}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd podczas dodawania środków');
    }

    return await response.json();
  } catch (err) {
    console.error('Błąd podczas dodawania środków: ', err);
    throw err;
  }
}

async function withdrawBalance(currency_code, amount, bank_account) {
  try {
    const token = await auth.getToken();
    if (!token) throw new Error('Brak tokena');

    const response = await apiFetch(
      `${API_BASE}/balance/withdraw?amount=${amount}&currency_code=${currency_code}&bank_account=${bank_account}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd podczas zlecania wypłaty środków');
    }

    return await response.json();
  } catch (err) {
    console.error('Błąd podczas zlecania wypłaty środków: ', err);
    throw err;
  }
}

async function fetchPrices() {
  try {
    const response = await apiFetch(`${API_BASE}/currencies/prices`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const data = await response.json();
      await prices.set(data);
      await updatePrices();

      if (await auth.isLoggedIn()) {
        await checkNotificationConditions();
      }

      return true;
    }
    return false;
  } catch (err) {
    console.error('Błąd pobierania cen:', err);
    return false;
  }
}

async function fetchCurrencies() {
  try {
    const response = await apiFetch(`${API_BASE}/currencies/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      await currencies.set(data);
    }
  } catch {}
}

async function startRatesFetching() {
  const status = await backend.getStatus();
  if (status.isOnline) {
    await fetchCurrencies();
  }

  const fetchIfOnline = async () => {
    const status = await backend.getStatus();
    if (status.isOnline) {
      await fetchPrices();
    }
  };

  await fetchIfOnline();

  setInterval(async () => {
    await fetchIfOnline();
  }, 10000);
}

async function verifyToken() {
  const loggedIn = await auth.isLoggedIn();
  if (!loggedIn) return false;

  try {
    const token = await auth.getToken();
    const response = await apiFetch(`${API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const user = await response.json();
    await auth.setUser(user);
    return true;
  } catch {
    return false;
  }
}

async function login(email, password) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await apiFetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Błąd logowania');
  }

  const data = await response.json();
  await auth.setToken(data.access_token);
  return data;
}

async function register(email, password, firstName, lastName) {
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

  return await response.json();
}

async function fetchPreferences() {
  try {
    const token = await auth.getToken();
    if (!token) return;

    const response = await apiFetch(`${API_BASE}/users/preferences/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      await preferences.set(data);
    }
  } catch (err) {
    console.error('Błąd podczas pobierania preferencji:', err);
  }
}

async function updateNotifications(notifications) {
  try {
    const token = await auth.getToken();
    if (!token) throw new Error('Brak tokena');

    const response = await apiFetch(`${API_BASE}/users/preferences/notifications`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notifications }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd podczas zapisywania powiadomień');
    }

    const data = await response.json();
    await preferences.set(data);
    return data;
  } catch (err) {
    console.error('Błąd podczas zapisywania powiadomień:', err);
    throw err;
  }
}

async function buyCurrency(currencyCode, amount) {
  try {
    const token = await auth.getToken();
    if (!token) throw new Error('Brak tokena');

    const response = await apiFetch(
      `${API_BASE}/trades/buy?currency_code=${currencyCode}&amount=${amount}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd podczas kupna waluty');
    }

    const data = await response.json();
    console.log(`Kupiono ${amount} ${currencyCode} po kursie ${data.exchange_rate}`);
    return data;
  } catch (err) {
    console.error('Błąd podczas kupna waluty:', err);
    throw err;
  }
}

async function sellCurrency(currencyCode, amount) {
  try {
    const token = await auth.getToken();
    if (!token) throw new Error('Brak tokena');

    const response = await apiFetch(
      `${API_BASE}/trades/sell?currency_code=${currencyCode}&amount=${amount}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Błąd podczas sprzedaży waluty');
    }

    const data = await response.json();
    console.log(`Sprzedano ${amount} ${currencyCode} po kursie ${data.exchange_rate}`);
    return data;
  } catch (err) {
    console.error('Błąd podczas sprzedaży waluty:', err);
    throw err;
  }
}
