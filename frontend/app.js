const API_BASE = 'http://localhost:8000';

const auth = {
  async getToken() {
    return await dbGet('token');
  },

  async setToken(token) {
    await dbSet('token', token);
  },

  async clearToken() {
    await dbDelete('token');
    await dbDelete('user');
    await dbDelete('trades');
  },

  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  },

  async getUser() {
    return await dbGet('user');
  },

  async setUser(user) {
    await dbSet('user', user);
  },

  async getTrades() {
    return await dbGet('trades');
  },

  async setTrades(trades) {
    await dbSet('trades', trades);
  },
};

const prices = {
  async get() {
    return await dbGet('prices');
  },

  async set(data) {
    await dbSet('prices', {
      data,
      timestamp: Date.now(),
    });
  },

  async getAge() {
    const cached = await this.get();
    if (!cached) return Infinity;
    return Date.now() - cached.timestamp;
  },
};

const currencies = {
  async get() {
    return await dbGet('currencies');
  },

  async set(data) {
    await dbSet('currencies', {
      data,
      timestamp: Date.now(),
    });
  },
};

const backend = {
  async getStatus() {
    const status = await dbGet('backend_status');
    return status || { isOnline: false, lastCheck: 0, lastOnline: 0 };
  },

  async setStatus(isOnline) {
    const now = Date.now();
    const current = await this.getStatus();
    await dbSet('backend_status', {
      isOnline,
      lastCheck: now,
      lastOnline: isOnline ? now : current.lastOnline,
    });
  },

  async getLastOnlineAge() {
    const status = await this.getStatus();
    return Date.now() - status.lastOnline;
  },
};

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

async function fetchPrices() {
  try {
    const response = await fetch(`${API_BASE}/currencies/prices`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      await prices.set(data);
      console.log('Zaktualizowano ceny walut: ', data);
    }
  } catch {}
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
      console.log('Zaktualizowano listę walut: ', data);
    }
  } catch {}
}

async function startRatesFetching() {
  if (await checkBackendHealth()) {
    fetchPrices();
    fetchCurrencies();
  }

  setInterval(async () => {
    if (await checkBackendHealth()) {
      fetchPrices();
    }
  }, 3000);

  setInterval(async () => {
    if (await checkBackendHealth()) {
      fetchCurrencies();
    }
  }, 30000);
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

async function logout() {
  await auth.clearToken();
  render();
}

function renderLogin() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="auth-container">
      <h2>Logowanie</h2>
      <form id="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Hasło" required>
        <button type="submit">Zaloguj</button>
      </form>
      <p class="auth-switch">
        Nie masz konta? <a href="#" id="show-register">Zarejestruj się</a>
      </p>
      <div id="error" class="error"></div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error');

    try {
      await login(email, password);
      render();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    renderRegister();
  });
}

function renderRegister() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="auth-container">
      <h2>Rejestracja</h2>
      <form id="register-form">
        <input type="text" id="first-name" placeholder="Imię" required>
        <input type="text" id="last-name" placeholder="Nazwisko" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Hasło" required minlength="3">
        <button type="submit">Zarejestruj</button>
      </form>
      <p class="auth-switch">
        Masz już konto? <a href="#" id="show-login">Zaloguj się</a>
      </p>
      <div id="error" class="error"></div>
      <div id="success" class="success"></div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error');
    const successEl = document.getElementById('success');

    try {
      await register(email, password, firstName, lastName);
      await login(email, password);
      render();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    renderLogin();
  });
}

async function renderDashboard() {
  const main = document.getElementById('main-content');
  const user = await auth.getUser();

  main.innerHTML = `
    <div class="dashboard">
      <h2>Witaj, ${user?.first_name || 'Użytkowniku'}!</h2>
      <button id="logout-btn">Wyloguj</button>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);
}

async function render() {
  const loggedIn = await auth.isLoggedIn();

  if (loggedIn) {
    await renderDashboard();
  } else {
    renderLogin();
  }
}

async function updateStatus() {
  await checkBackendHealth();
  const status = await backend.getStatus();
  document.body.classList.toggle('offline', !status.isOnline);

  if (status.isOnline) {
    document.getElementById('status').textContent = 'Online';
  } else {
    const age = await backend.getLastOnlineAge();
    const minutes = Math.floor(age / 60000);
    document.getElementById('status').textContent =
      minutes > 0 ? `Offline (${minutes} min)` : 'Offline';
  }
}

async function init() {
  await verifyToken();
  render();
  updateStatus();
  setInterval(updateStatus, 10000);

  setInterval(async () => {
    if ((await checkBackendHealth()) && (await auth.isLoggedIn())) {
      fetchTrades();
    }
  }, 10000);

  startRatesFetching();
}

init();
