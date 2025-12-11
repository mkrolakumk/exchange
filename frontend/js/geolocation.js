const geolocation = {
  async getPosition() {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { timeout: 10000, maximumAge: 0, enableHighAccuracy: false }
      );
    });
  },

  async getCountryFromCoords(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: { 'Accept-Language': 'en' },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.address?.country_code?.toUpperCase();
    } catch {
      return null;
    }
  },

  async getCurrencyForCountry(countryCode) {
    const currencyMap = {
      PL: 'PLN',
      US: 'USD',
      GB: 'GBP',
      DE: 'EUR',
      FR: 'EUR',
      IT: 'EUR',
      ES: 'EUR',
      NL: 'EUR',
      BE: 'EUR',
      AT: 'EUR',
      PT: 'EUR',
      IE: 'EUR',
      FI: 'EUR',
      GR: 'EUR',
      CH: 'CHF',
      JP: 'JPY',
      CN: 'CNY',
      AU: 'AUD',
      CA: 'CAD',
      SE: 'SEK',
      NO: 'NOK',
      DK: 'DKK',
      CZ: 'CZK',
      HU: 'HUF',
      RO: 'RON',
      BG: 'BGN',
      HR: 'HRK',
      RU: 'RUB',
      UA: 'UAH',
      TR: 'TRY',
      IN: 'INR',
      BR: 'BRL',
      MX: 'MXN',
      AR: 'ARS',
      ZA: 'ZAR',
      KR: 'KRW',
      SG: 'SGD',
      HK: 'HKD',
      NZ: 'NZD',
      TH: 'THB',
      MY: 'MYR',
      ID: 'IDR',
      PH: 'PHP',
      IL: 'ILS',
    };
    return currencyMap[countryCode] || 'PLN';
  },

  async getPreferredCurrency() {
    const cached = await dbGet('preferred_currency');
    if (cached?.currency) {
      return cached.currency;
    }
    return 'PLN';
  },

  async checkAndNotifyCurrencyChange() {
    const position = await this.getPosition();
    if (!position) {
      const cached = await dbGet('preferred_currency');
      if (!cached) {
        await dbSet('preferred_currency', { currency: 'PLN', timestamp: Date.now() });
      }
      return null;
    }

    const { latitude, longitude } = position.coords;
    const countryCode = await this.getCountryFromCoords(latitude, longitude);
    const currency = countryCode ? await this.getCurrencyForCountry(countryCode) : 'PLN';

    const cached = await dbGet('preferred_currency');
    const oldCurrency = cached?.currency;

    if (oldCurrency !== currency) {
      await dbSet('preferred_currency', { currency, timestamp: Date.now() });
      const currenciesDB = (await currencies.get())?.['data'] || {};
      const currencyName = currenciesDB[currency]?.['name'] || currency;
      return { currency, currencyName, isFirst: !oldCurrency };
    }

    return null;
  },
};
