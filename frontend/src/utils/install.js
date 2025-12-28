import { getFromDB, saveToDB } from './db.js';

const install = {
  deferredPrompt: null,
  banner: null,
  acceptHandler: null,
  dismissHandler: null,

  async isPromptDismissed() {
    const dismissed = await getFromDB('install_prompt_dismissed');
    return dismissed === true;
  },

  async dismissPrompt() {
    await saveToDB('install_prompt_dismissed', true);
  },

  init() {
    window.addEventListener('beforeinstallprompt', async (e) => {
      console.log('Wykryto możliwość instalacji PWA');
      e.preventDefault();
      this.deferredPrompt = e;

      const dismissed = await this.isPromptDismissed();
      console.log('Banner odrzucony wcześniej:', dismissed);
      if (!dismissed) {
        this.showBanner();
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA zainstalowana');
      this.deferredPrompt = null;
      this.hideBanner();
    });

    window.installDebug = () => {
      console.log('Wymuszenie pokazania bannera instalacji');
      this.showBanner();
    };
  },

  showBanner() {
    if (this.banner) return;

    this.banner = document.createElement('div');
    this.banner.id = 'install-banner';
    this.banner.className = 'install-banner';

    const content = document.createElement('div');
    content.className = 'install-content';

    const icon = document.createElement('div');
    icon.className = 'install-icon';
    icon.textContent = '📱';

    const textContainer = document.createElement('div');
    textContainer.className = 'install-text';

    const strong = document.createElement('strong');
    strong.textContent = 'Dodaj do ekranu głównego';

    const span = document.createElement('span');
    span.textContent = 'Szybki dostęp i tryb offline';

    textContainer.appendChild(strong);
    textContainer.appendChild(span);

    const actions = document.createElement('div');
    actions.className = 'install-actions';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'install-btn install-btn-primary';
    acceptBtn.id = 'install-accept';
    acceptBtn.textContent = 'Instaluj';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'install-btn install-btn-secondary';
    dismissBtn.id = 'install-dismiss';
    dismissBtn.textContent = 'Nie teraz';

    actions.appendChild(acceptBtn);
    actions.appendChild(dismissBtn);

    content.appendChild(icon);
    content.appendChild(textContainer);
    content.appendChild(actions);

    this.banner.appendChild(content);
    document.body.appendChild(this.banner);

    this.acceptHandler = () => this.promptInstall();
    this.dismissHandler = async () => {
      await this.dismissPrompt();
      this.hideBanner();
    };

    acceptBtn.addEventListener('click', this.acceptHandler);
    dismissBtn.addEventListener('click', this.dismissHandler);
  },

  hideBanner() {
    if (!this.banner) return;

    const acceptBtn = this.banner.querySelector('#install-accept');
    const dismissBtn = this.banner.querySelector('#install-dismiss');

    if (acceptBtn && this.acceptHandler) {
      acceptBtn.removeEventListener('click', this.acceptHandler);
    }
    if (dismissBtn && this.dismissHandler) {
      dismissBtn.removeEventListener('click', this.dismissHandler);
    }

    this.banner.remove();
    this.banner = null;
    this.acceptHandler = null;
    this.dismissHandler = null;
  },

  async promptInstall() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;

    this.deferredPrompt = null;
    this.hideBanner();
  },
};

export { install };
