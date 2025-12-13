async function logout() {
  await auth.clearToken();
  currentView = 'home';
  render();
}

let currentView = 'home';

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
  } else if (currentView === 'history') {
    renderHistoryView(userSection);
  } else {
    renderHomeView(userSection);
  }
}

async function render() {
  await updateMenuState();
  await renderPrices();
  await renderUserSection();
  await showView(currentView);
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
      fetchBalance();
      fetchPreferences();
      processQueuePeriodically();
    }
  }, 2000);

  startRatesFetching();

  install.init();

  setTimeout(async () => {
    await onboarding.start();
  }, 1000);

  window.addEventListener('unauthorized', () => {
    currentView = 'home';
    render();
  });
}

init();
