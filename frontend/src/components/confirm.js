export function createConfirmDialog() {
  let modalElement = null;
  let resolveCallback = null;

  function createElement() {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const title = document.createElement('h3');
    title.className = 'confirm-title';
    title.id = 'confirm-title';

    const message = document.createElement('p');
    message.className = 'confirm-message';
    message.id = 'confirm-message';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'confirm-input-wrapper hidden';

    const input = document.createElement('input');
    input.className = 'confirm-input';
    input.type = 'text';
    input.id = 'confirm-input';

    inputWrapper.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn confirm-btn-cancel';
    cancelBtn.textContent = 'Anuluj';
    cancelBtn.type = 'button';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn confirm-btn-primary';
    confirmBtn.textContent = 'OK';
    confirmBtn.type = 'button';

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(inputWrapper);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    return {
      overlay,
      title,
      message,
      input,
      inputWrapper,
      cancelBtn,
      confirmBtn,
    };
  }

  function show(config) {
    return new Promise((resolve) => {
      resolveCallback = resolve;

      if (modalElement) {
        modalElement.overlay.remove();
      }

      modalElement = createElement();
      const { overlay, title, message, input, inputWrapper, cancelBtn, confirmBtn } = modalElement;

      title.textContent = config.title || 'Potwierdzenie';
      message.textContent = config.message || '';

      if (config.inputType) {
        inputWrapper.classList.remove('hidden');
        input.type = config.inputType;
        input.value = config.defaultValue || '';
        input.placeholder = config.placeholder || '';
        input.required = config.required !== false;

        if (config.min !== undefined) input.min = config.min;
        if (config.max !== undefined) input.max = config.max;
        if (config.step !== undefined) input.step = config.step;
        if (config.pattern) input.pattern = config.pattern;
        if (config.maxLength) input.maxLength = config.maxLength;

        setTimeout(() => input.focus(), 100);
      } else {
        inputWrapper.classList.add('hidden');
      }

      confirmBtn.textContent = config.confirmText || 'OK';
      cancelBtn.textContent = config.cancelText || 'Anuluj';

      const handleCancel = () => {
        cleanup();
        resolve(null);
      };

      const handleConfirm = () => {
        if (config.inputType) {
          const value = input.value.trim();
          if (config.validator) {
            const validation = config.validator(value);
            if (!validation.valid) {
              showValidationError(validation.message);
              return;
            }
          }
          cleanup();
          resolve(value);
        } else {
          cleanup();
          resolve(true);
        }
      };

      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
        } else if (e.key === 'Enter' && !config.inputType) {
          handleConfirm();
        }
      };

      cancelBtn.addEventListener('click', handleCancel);
      confirmBtn.addEventListener('click', handleConfirm);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
      });
      document.addEventListener('keydown', handleKeydown);

      if (config.inputType) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
          }
        });
      }

      overlay._cleanup = () => {
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
        document.removeEventListener('keydown', handleKeydown);
      };

      document.body.appendChild(overlay);
    });
  }

  function showValidationError(message) {
    const { message: messageEl } = modalElement;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'confirm-error';
    errorDiv.textContent = message;

    const existing = messageEl.parentElement.querySelector('.confirm-error');
    if (existing) existing.remove();

    messageEl.parentElement.insertBefore(errorDiv, messageEl.nextSibling);
  }

  function cleanup() {
    if (modalElement) {
      if (modalElement.overlay._cleanup) {
        modalElement.overlay._cleanup();
      }
      modalElement.overlay.remove();
      modalElement = null;
    }
  }

  async function alert(title, message) {
    return show({
      title,
      message,
      cancelText: null,
    });
  }

  async function confirm(title, message) {
    return show({
      title,
      message,
    });
  }

  async function prompt(title, message, config = {}) {
    return show({
      title,
      message,
      inputType: config.inputType || 'text',
      placeholder: config.placeholder,
      defaultValue: config.defaultValue,
      validator: config.validator,
      min: config.min,
      max: config.max,
      step: config.step,
      pattern: config.pattern,
      maxLength: config.maxLength,
      required: config.required,
    });
  }

  return {
    show,
    alert,
    confirm,
    prompt,
  };
}
