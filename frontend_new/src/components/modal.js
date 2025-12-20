export function createAuthModal() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = modal.querySelector('.close');
  const form = document.getElementById('auth-form');
  const title = document.getElementById('modal-title');
  const submitBtn = document.getElementById('submit-btn');
  const registerFields = document.getElementById('register-fields');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const firstNameInput = document.getElementById('first-name');
  const lastNameInput = document.getElementById('last-name');
  const authSwitchText = document.getElementById('auth-switch-text');
  const authSwitchLink = document.getElementById('auth-switch-link');

  let currentMode = 'login';
  let onSubmitCallback = null;

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function validatePassword(password) {
    return password.length >= 8 && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    form.insertBefore(errorDiv, submitBtn);
    setTimeout(() => errorDiv.remove(), 3000);
  }

  function switchMode(mode) {
    currentMode = mode;
    if (mode === 'register') {
      title.textContent = 'Zarejestruj się';
      submitBtn.textContent = 'Zarejestruj się';
      registerFields.classList.remove('hidden');
      firstNameInput.required = true;
      lastNameInput.required = true;
      authSwitchText.textContent = 'Masz już konto? ';
      authSwitchLink.textContent = 'Zaloguj się';
    } else {
      title.textContent = 'Zaloguj się';
      submitBtn.textContent = 'Zaloguj się';
      registerFields.classList.add('hidden');
      firstNameInput.required = false;
      lastNameInput.required = false;
      authSwitchText.textContent = 'Nie masz jeszcze konta? ';
      authSwitchLink.textContent = 'Zarejestruj się';
    }
  }

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchMode(currentMode === 'login' ? 'register' : 'login');
    form.reset();

    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach((msg) => msg.remove());
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateEmail(email)) {
      showError('Nieprawidłowy adres email');
      return;
    }

    if (currentMode === 'register') {
      if (!validatePassword(password)) {
        showError('Hasło musi mieć min. 8 znaków, cyfrę i znak specjalny');
        return;
      }

      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();

      if (!firstName || !lastName) {
        showError('Imię i nazwisko są wymagane');
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Ładowanie...';

    try {
      if (onSubmitCallback) {
        await onSubmitCallback({
          mode: currentMode,
          email,
          password,
          firstName: firstNameInput.value.trim(),
          lastName: lastNameInput.value.trim(),
        });
        modal.classList.add('hidden');
        form.reset();
      }
    } catch (error) {
      showError(error.message || 'Wystąpił błąd');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'login' ? 'Zaloguj się' : 'Zarejestruj się';
    }
  });

  return {
    show(mode, callback) {
      switchMode(mode);
      onSubmitCallback = callback;
      modal.classList.remove('hidden');
    },
    hide() {
      modal.classList.add('hidden');
    },
  };
}
