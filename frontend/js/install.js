const install = {
  deferredPrompt: null,

  async isPromptDismissed() {
    const dismissed = await dbGet('install_prompt_dismissed');
    return dismissed === true;
  },

  async dismissPrompt() {
    await dbSet('install_prompt_dismissed', true);
  },

  init() {
    window.addEventListener('beforeinstallprompt', async (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      const dismissed = await this.isPromptDismissed();
      if (!dismissed) {
        this.showBanner();
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.hideBanner();
    });
  },

  showBanner() {
    const existing = document.getElementById('install-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = 'install-banner';
    banner.innerHTML = `
      <div class="install-content">
        <div class="install-icon">📱</div>
        <div class="install-text">
          <strong>Dodaj do ekranu głównego</strong>
          <span>Szybki dostęp i tryb offline</span>
        </div>
        <div class="install-actions">
          <button class="install-btn install-btn-primary" id="install-accept">Instaluj</button>
          <button class="install-btn install-btn-secondary" id="install-dismiss">Nie teraz</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('install-accept').addEventListener('click', () => {
      this.promptInstall();
    });

    document.getElementById('install-dismiss').addEventListener('click', async () => {
      await this.dismissPrompt();
      this.hideBanner();
    });
  },

  hideBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.remove();
  },

  async promptInstall() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA zainstalowana');
    }

    this.deferredPrompt = null;
    this.hideBanner();
  },
};
