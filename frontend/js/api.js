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

    const response = await fetch(`${API_BASE}/trades/trades`, {
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

async function fetchBalances() {
  try {
    const token = await auth.getToken();
    if (!token) return;

    const response = await fetch(`${API_BASE}/balance/balance`, {
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

async function fetchPrices() {
  try {
    const response = await fetch(`${API_BASE}/currencies/prices`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const data = await response.json();
      await prices.set(data);
      await renderPrices();
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
    const response = await fetch(`${API_BASE}/currencies/`, {
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
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      await auth.clearToken();
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

  const response = await fetch(`${API_BASE}/users/login`, {
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

  return await response.json();
}
