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

  async isFresh(maxAge = 30000) {
    const age = await this.getAge();
    return age < maxAge;
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
      console.log('Zaktualizowano listę walut: ', data);
    }
  } catch {}
}

async function startRatesFetching() {
  const fetchIfOnline = async () => {
    const status = await backend.getStatus();
    if (status.isOnline) {
      await fetchPrices();
      await fetchCurrencies();
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

async function logout() {
  await auth.clearToken();
  currentView = 'home';
  render();
}

let currentView = 'home';

function setupMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const dropdown = document.getElementById('menu-dropdown');
  const overlay = document.getElementById('menu-overlay');
  const loginBtn = document.getElementById('menu-login');
  const registerBtn = document.getElementById('menu-register');
  const logoutBtn = document.getElementById('menu-logout');
  const homeBtn = document.getElementById('menu-home');
  const balanceBtn = document.getElementById('menu-balance');
  const notificationsBtn = document.getElementById('menu-notifications');

  const toggleMenu = () => {
    const isHidden = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
    menuBtn.classList.toggle('active');
  };

  const closeMenu = () => {
    dropdown.classList.add('hidden');
    overlay.classList.add('hidden');
    menuBtn.classList.remove('active');
  };

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  overlay.addEventListener('click', closeMenu);

  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    showLoginModal();
  });

  registerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    showRegisterModal();
  });

  homeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    currentView = 'home';
    render();
  });

  balanceBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    currentView = 'balance';
    render();
  });

  notificationsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    currentView = 'notifications';
    render();
  });

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    closeMenu();
    await logout();
  });
}

function showModal(content) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const closeBtn = modal.querySelector('.modal-close');

  modalBody.innerHTML = content;
  modal.classList.remove('hidden');

  closeBtn.onclick = () => modal.classList.add('hidden');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

function showLoginModal() {
  showModal(`
    <div class="auth-form">
      <h2>Logowanie</h2>
      <form id="login-form">
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Hasło" required>
        <button type="submit">Zaloguj</button>
      </form>
      <p class="auth-switch">
        Nie masz konta? <a href="#" id="switch-register">Zarejestruj się</a>
      </p>
      <div id="auth-error" class="error-message hidden"></div>
    </div>
  `);

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');

    try {
      await login(email, password);
      await verifyToken();
      document.getElementById('modal').classList.add('hidden');
      render();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('switch-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterModal();
  });
}

function showRegisterModal() {
  showModal(`
    <div class="auth-form">
      <h2>Rejestracja</h2>
      <form id="register-form">
        <input type="text" id="first-name" placeholder="Imię" required>
        <input type="text" id="last-name" placeholder="Nazwisko" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Hasło" required minlength="3">
        <button type="submit">Zarejestruj</button>
      </form>
      <p class="auth-switch">
        Masz już konto? <a href="#" id="switch-login">Zaloguj się</a>
      </p>
      <div id="auth-error" class="error-message hidden"></div>
      <div id="auth-success" class="success-message hidden"></div>
    </div>
  `);

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');

    try {
      await register(email, password, firstName, lastName);
      await login(email, password);
      await verifyToken();
      document.getElementById('modal').classList.add('hidden');
      render();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('switch-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginModal();
  });
}

async function renderPrices() {
  const pricesList = document.getElementById('prices-list');
  const warning = document.getElementById('prices-warning');

  const cached = await prices.get();
  const fresh = await prices.isFresh();
  const status = await backend.getStatus();

  if (!cached || !cached.data) {
    pricesList.innerHTML = '<p>Brak danych - oczekiwanie na połączenie...</p>';
    return;
  }

  if (!status.isOnline || !fresh) {
    const age = await prices.getAge();
    const minutes = Math.floor(age / 60000);
    const timeStr = minutes > 0 ? `${minutes} min temu` : 'przed chwilą';
    warning.textContent = `Dane nieaktualne (${timeStr})`;
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  const data = cached.data;
  if (data.length === 0) {
    pricesList.innerHTML = '<p>Brak kursów walut</p>';
    return;
  }

  pricesList.innerHTML = data
    .map(
      (price) => `
    <div class="price-card">
      <div class="currency-code">${price.currency_code}</div>
      <div class="price-row">
        <span class="label">Kupno:</span>
        <span class="value">${price.buy_price.toFixed(4)} PLN</span>
      </div>
      <div class="price-row">
        <span class="label">Sprzedaż:</span>
        <span class="value">${price.sell_price.toFixed(4)} PLN</span>
      </div>
    </div>
  `
    )
    .join('');
}

async function renderUserSection() {
  const userSection = document.getElementById('user-section');
  const loggedIn = await auth.isLoggedIn();

  if (!loggedIn) {
    userSection.classList.add('hidden');
    return;
  }

  userSection.classList.remove('hidden');

  if (currentView === 'balance') {
    renderBalanceView(userSection);
  } else if (currentView === 'notifications') {
    renderNotificationsView(userSection);
  } else {
    renderHomeView(userSection);
  }
}

async function renderHomeView(container) {
  const user = await auth.getUser();
  container.innerHTML = `
    <div class="card">
      <h2>Witaj, ${user?.first_name || 'Użytkowniku'}!</h2>
      <p>Sprawdź aktualne kursy walut i dokonaj wymiany.</p>
    </div>
  `;
}

function renderBalanceView(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Salda</h2>
      <div class="under-construction">
        <p>🚧 Strona w budowie</p>
        <p class="under-construction-text">Wkrótce będziesz mógł sprawdzić swoje salda w różnych walutach.</p>
      </div>
    </div>
  `;
}

function renderNotificationsView(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Powiadomienia</h2>
      <div class="under-construction">
        <p>🚧 Strona w budowie</p>
        <p class="under-construction-text">Wkrótce otrzymasz powiadomienia o ważnych wydarzeniach.</p>
      </div>
    </div>
  `;
}

async function updateMenuState() {
  const loggedIn = await auth.isLoggedIn();
  const loginBtn = document.getElementById('menu-login');
  const registerBtn = document.getElementById('menu-register');
  const logoutBtn = document.getElementById('menu-logout');
  const homeBtn = document.getElementById('menu-home');
  const balanceBtn = document.getElementById('menu-balance');
  const notificationsBtn = document.getElementById('menu-notifications');

  if (!loginBtn || !registerBtn || !logoutBtn) {
    console.error('Nie znaleziono przycisków menu');
    return;
  }

  if (loggedIn) {
    loginBtn.classList.add('hidden');
    registerBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    homeBtn?.classList.remove('hidden');
    balanceBtn?.classList.remove('hidden');
    notificationsBtn?.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    homeBtn?.classList.add('hidden');
    balanceBtn?.classList.add('hidden');
    notificationsBtn?.classList.add('hidden');
  }
}

async function render() {
  await updateMenuState();
  await renderPrices();
  await renderUserSection();
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
  setupMenu();
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
