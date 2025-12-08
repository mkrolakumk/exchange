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
  const historyBtn = document.getElementById('menu-history');

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

  historyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    currentView = 'history';
    render();
  });

  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    closeMenu();
    await logout();
  });
}

async function updateMenuState() {
  const loggedIn = await auth.isLoggedIn();
  const loginBtn = document.getElementById('menu-login');
  const registerBtn = document.getElementById('menu-register');
  const logoutBtn = document.getElementById('menu-logout');
  const homeBtn = document.getElementById('menu-home');
  const balanceBtn = document.getElementById('menu-balance');
  const notificationsBtn = document.getElementById('menu-notifications');
  const historyBtn = document.getElementById('menu-history');

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
    historyBtn?.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    homeBtn?.classList.add('hidden');
    balanceBtn?.classList.add('hidden');
    notificationsBtn?.classList.add('hidden');
    historyBtn?.classList.add('hidden');
  }
}
