import { createRouter } from './router.js';
import { createHomeView } from './views/home.js';
import { createBalanceView } from './views/balance.js';
import { createHistoryView } from './views/history.js';
import { createNotificationsView } from './views/notifications.js';
import { state } from './state.js';
import {
  registerUser,
  loginUser,
  getUserMe,
  checkBackendStatus,
  backendStatus,
} from './utils/api.js';
import { setupMenu, updateMenuState } from './components/menu.js';
import { createAuthModal } from './components/modal.js';
import { startNotificationMonitoring } from './utils/notifications.js';
import { install } from './utils/install.js';
import { onboarding } from './utils/onboarding.js';
import { operationsQueue } from './utils/queue.js';

const router = createRouter();
let authModal;

async function updateConnectionStatus() {
  await checkBackendStatus();
  const status = await backendStatus.getStatus();

  document.body.classList.toggle('offline', !status.isOnline);

  const statusText = document.getElementById('status-text');
  if (!statusText) return;

  if (status.isOnline) {
    statusText.textContent = 'Online';
  } else {
    const age = await backendStatus.getLastOnlineAge();
    const minutes = Math.floor(age / 60000);
    statusText.textContent = minutes > 0 ? `Offline (${minutes} min)` : 'Offline';
  }
}

async function processQueueIfOnline() {
  const status = await backendStatus.getStatus();
  const isLoggedIn = await state.isLoggedIn();

  if (status.isOnline && isLoggedIn) {
    const token = await state.getToken();
    const processed = await operationsQueue.process(token);

    if (processed > 0) {
      console.log(`Przetworzono ${processed} operacji z kolejki`);
      const currentPath = window.location.hash.slice(1) || 'home';
      if (currentPath === 'balance') {
        router.navigate('balance');
      }
    }
  }
}

async function handleAuth(data) {
  if (data.mode === 'register') {
    await registerUser(data.email, data.password, data.firstName, data.lastName);
  }

  const loginResponse = await loginUser(data.email, data.password);
  await state.setToken(loginResponse.access_token);

  const userData = await getUserMe(loginResponse.access_token);
  await state.setUser(userData);

  updateMenuState(true);
  router.navigate('home');
}

async function handleLogout() {
  await state.clearAuth();
  updateMenuState(false);
  router.navigate('home');
}

async function init() {
  const isLoggedIn = await state.isLoggedIn();
  updateMenuState(isLoggedIn);

  authModal = createAuthModal();

  setupMenu((action) => {
    if (action === 'showLogin') {
      authModal.show('login', handleAuth);
    } else if (action === 'showRegister') {
      authModal.show('register', handleAuth);
    } else if (action === 'navigateHome') {
      router.navigate('home');
    } else if (action === 'navigateBalance') {
      router.navigate('balance');
    } else if (action === 'navigateHistory') {
      router.navigate('history');
    } else if (action === 'navigateNotifications') {
      router.navigate('notifications');
    } else if (action === 'logout') {
      handleLogout();
    }
  });

  router.register('home', createHomeView);
  router.register('balance', createBalanceView);
  router.register('history', createHistoryView);
  router.register('notifications', createNotificationsView);
  router.navigate('home');

  if (isLoggedIn) {
    startNotificationMonitoring();
  }

  updateConnectionStatus();
  setInterval(updateConnectionStatus, 30000);
  setInterval(processQueueIfOnline, 20000);

  install.init();

  setTimeout(() => {
    onboarding.start();
  }, 1000);
}

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./src/sw.js');
}
