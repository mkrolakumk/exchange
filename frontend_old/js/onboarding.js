const onboarding = {
  async isCompleted() {
    const completed = await dbGet('onboarding_completed');
    return completed === true;
  },

  async markCompleted() {
    await dbSet('onboarding_completed', true);
  },

  createTooltip(text, targetEl, buttons) {
    const tooltip = document.createElement('div');
    tooltip.className = 'onboarding-tooltip';

    const content = document.createElement('div');
    content.className = 'tooltip-content';
    content.textContent = text;

    const actions = document.createElement('div');
    actions.className = 'tooltip-actions';

    buttons.forEach((btn) => {
      const button = document.createElement('button');
      button.className = `tooltip-btn ${btn.primary ? 'tooltip-btn-primary' : ''}`;
      button.textContent = btn.text;
      button.onclick = btn.onClick;
      actions.appendChild(button);
    });

    tooltip.appendChild(content);
    tooltip.appendChild(actions);

    if (targetEl) {
      targetEl.classList.add('onboarding-highlight');
    }

    return tooltip;
  },

  removeTooltip(tooltip, targetEl) {
    if (tooltip && tooltip.parentNode) {
      tooltip.remove();
    }
    if (targetEl) {
      targetEl.classList.remove('onboarding-highlight');
    }
  },

  async start() {
    const completed = await this.isCompleted();
    if (completed) return;

    setTimeout(() => this.step1(), 800);
  },

  step1() {
    const pricesSection = document.getElementById('prices-section');
    const tooltip = this.createTooltip(
      'To ekran główny. Zobaczysz tutaj aktualne kursy wszystkich walut',
      pricesSection,
      [
        {
          text: 'Rozumiem',
          primary: true,
          onClick: () => {
            this.removeTooltip(tooltip, pricesSection);
            this.step2();
          },
        },
      ]
    );
    document.body.appendChild(tooltip);
  },

  step2() {
    const menuBtn = document.getElementById('menu-btn');
    const tooltip = this.createTooltip(
      'To pasek boczny. Kliknij by zalogować się lub korzystaj z Kantoru jako niezalogowany',
      menuBtn,
      [
        {
          text: 'Rozumiem',
          onClick: () => {
            this.removeTooltip(tooltip, menuBtn);
            this.markCompleted();
          },
        },
        {
          text: 'Idziemy dalej',
          primary: true,
          onClick: () => {
            this.removeTooltip(tooltip, menuBtn);
            menuBtn.click();
            setTimeout(() => this.step3(), 300);
          },
        },
      ]
    );
    document.body.appendChild(tooltip);
  },

  step3() {
    const loginBtn = document.getElementById('menu-login');
    const tooltip = this.createTooltip(
      'To ekran logowania. Jeśli masz już konto - zaloguj się, jeśli nie → zarejestruj się błyskawicznie',
      loginBtn,
      [
        {
          text: 'Gratulacje! 🎉',
          primary: true,
          onClick: async () => {
            this.removeTooltip(tooltip, loginBtn);
            await this.markCompleted();
            const loggedIn = await auth.isLoggedIn();
            if (!loggedIn) {
              loginBtn.click();
            }
          },
        },
      ]
    );
    document.body.appendChild(tooltip);
  },
};
