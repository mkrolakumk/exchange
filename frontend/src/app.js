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
} from './utils/api.js';
import { setupMenu, updateMenuState } from './components/menu.js';
import { createAuthModal } from './components/modal.js';
import { startNotificationMonitoring } from './utils/notifications.js';
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

function checkConnectionQuality() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const banner = document.getElementById('slow-connection-banner');

  if (!connection) return;

  const slowTypes = ['slow-2g', '2g', '3g'];
  const isSlow = slowTypes.includes(connection.effectiveType) || !navigator.onLine;

  if (isSlow && !banner) {
    const newBanner = document.createElement('div');
    newBanner.id = 'slow-connection-banner';
    newBanner.className = 'slow-connection-warning';
    newBanner.innerHTML =
      '<p>⚠️ Wykryto wolne łącze. Nie jesteśmy w stanie zagwarantować aktualności danych.</p>';
    document.body.insertBefore(newBanner, document.body.firstChild);
    document.body.style.paddingTop = '120px';
  } else if (!isSlow && banner) {
    banner.remove();
    document.body.style.paddingTop = '80px';
  }
}

async function handleAuth(data) {
  if (data.mode === 'register') {
    await registerUser(data.email, data.password, data.firstName, data.lastName);
  }

  await loginUser(data.email, data.password);

  const userData = await getUserMe();
  await state.setUser(userData);

  updateMenuState(true);
  router.navigate('home');
}

async function handleLogout() {
  await logoutUser();
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
  setInterval(updateConnectionStatus, 5000);
  setInterval(processQueueIfOnline, 20000);

  checkConnectionQuality();
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    connection.addEventListener('change', checkConnectionQuality);
  }

  install.init();

  setTimeout(() => {
    onboarding.start();
  }, 1000);
}

init();
