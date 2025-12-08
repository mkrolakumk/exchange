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

  async getBalance() {
    return await dbGet('balance');
  },

  async setBalance(balance) {
    await dbSet('balance', balance);
  },
};

const prices = {
  async get() {
    return await dbGet('prices');
  },

  async getPrevious() {
    return await dbGet('prices_previous');
  },

  async set(data) {
    const current = await this.get();
    if (current?.data) {
      await dbSet('prices_previous', current);
    }
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
