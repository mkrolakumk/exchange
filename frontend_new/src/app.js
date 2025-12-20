import { createRouter } from './router.js';
import { createHomeView } from './views/home.js';
import { createBalanceView } from './views/balance.js';
import { createHistoryView } from './views/history.js';
import { state } from './state.js';
import { registerUser, loginUser, getUserMe } from './utils/api.js';
import { setupMenu, updateMenuState } from './components/menu.js';
import { createAuthModal } from './components/modal.js';

const router = createRouter();
let authModal;

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
    } else if (action === 'logout') {
      handleLogout();
    }
  });

  router.register('home', createHomeView);
  router.register('balance', createBalanceView);
  router.register('history', createHistoryView);
  router.navigate('home');
}

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./src/sw.js');
}
