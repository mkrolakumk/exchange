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
  },

  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  },
};

async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
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
    const error = await response.json().catch(() => ({ detail: 'Błąd logowania' }));
    throw new Error(error.detail || 'Nieprawidłowe dane logowania');
  }

  const data = await response.json();
  await auth.setToken(data.access_token);
  return data;
}

async function logout() {
  await auth.clearToken();
  render();
}

async function render() {
  const main = document.getElementById('main-content');
  const loggedIn = await auth.isLoggedIn();

  if (loggedIn) {
    main.innerHTML = `
      <div class="card">
        <h2>Panel użytkownika</h2>
        <p>Jesteś zalogowany</p>
        <button onclick="logout()">Wyloguj</button>
      </div>
    `;
  } else {
    main.innerHTML = `
      <div class="card">
        <h2>Logowanie</h2>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label>Hasło</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit">Zaloguj</button>
          <div id="login-error" class="error-message hidden"></div>
        </form>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');

      try {
        await login(email, password);
        render();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    });
  }
}

async function updateStatus() {
  const isOnline = await checkBackendHealth();
  document.body.classList.toggle('offline', !isOnline);
  document.getElementById('status').textContent = isOnline ? 'Online' : 'Offline';
}

async function init() {
  await verifyToken();
  render();
  updateStatus();
  setInterval(updateStatus, 10000);
}

init();
