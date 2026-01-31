import { createRouter } from './router.js';
import { createHomeView } from './views/home.js';
import { createBalanceView } from './views/balance.js';
import { createHistoryView } from './views/history.js';
import { createNotificationsView } from './views/notifications.js';
import { state } from './state.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserMe,
  checkBackendStatus,
  backendStatus,
  fetchBalance,
} from './utils/api.js';
import { setupMenu, updateMenuState } from './components/menu.js';
import { createAuthModal } from './components/modal.js';
import { startNotificationMonitoring, stopNotificationMonitoring } from './utils/notifications.js';
import { install } from './utils/install.js';
import { onboarding } from './utils/onboarding.js';
import { operationsQueue } from './utils/queue.js';

const router = createRouter();
let authModal;
let previousOnlineStatus = true;

async function updateConnectionStatus() {
  await checkBackendStatus();
  const status = await backendStatus.getStatus();

  document.body.classList.toggle('offline', !status.isOnline);

  if (previousOnlineStatus === false && status.isOnline === true) {
    const currentPath = window.location.hash.slice(1) || 'home';
    router.navigate(currentPath);

    const isLoggedIn = await state.isLoggedIn();
    if (isLoggedIn) {
      startNotificationMonitoring();
    }
  }

  previousOnlineStatus = status.isOnline;

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
    const processed = await operationsQueue.process();

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

  await loginUser(data.email, data.password);

  const userData = await getUserMe();
  await state.setUser(userData);

  try {
    await fetchBalance();
  } catch (error) {
    console.error('Błąd pobierania salda po zalogowaniu:', error);
  }

  updateMenuState(true);
  startNotificationMonitoring();
  router.navigate('home');
}

async function handleLogout() {
  await logoutUser();
  await state.clearAuth();
  stopNotificationMonitoring();
  updateMenuState(false);
  router.navigate('home');
}

async function init() {
  const isLoggedIn = await state.isLoggedIn();
  updateMenuState(isLoggedIn);

  authModal = createAuthModal();

  const headerTitle = document.querySelector('header h1');
  if (headerTitle) {
    headerTitle.addEventListener('click', () => {
      window.location.reload();
    });
  }

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
  setInterval(updateConnectionStatus, 5000);
  setInterval(processQueueIfOnline, 5000);

  install.init();

  setTimeout(() => {
    onboarding.start();
  }, 1000);
}

init();
