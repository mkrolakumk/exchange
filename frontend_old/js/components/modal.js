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
