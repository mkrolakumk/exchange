async function renderPrices() {
  const pricesList = document.getElementById('prices-list');
  const warning = document.getElementById('prices-warning');

  const cached = await prices.get();
  const fresh = await prices.isFresh();
  const status = await backend.getStatus();

  if (!cached || !cached.data) {
    pricesList.innerHTML = '<p>Brak danych - oczekiwanie na połączenie...</p>';
    return;
  }

  if (!status.isOnline || !fresh) {
    const age = await prices.getAge();
    const minutes = Math.floor(age / 60000);
    const timeStr = minutes > 0 ? `${minutes} min temu` : 'przed chwilą';
    warning.textContent = `Dane nieaktualne (${timeStr})`;
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  const data = cached.data;
  if (data.length === 0) {
    pricesList.innerHTML = '<p>Brak kursów walut</p>';
    return;
  }

  pricesList.innerHTML = data
    .map(
      (price) => `
    <div class="price-card">
      <div class="currency-code">${price.currency_code}</div>
      <div class="price-row">
        <span class="label">Kupno:</span>
        <span class="value">${price.buy_price.toFixed(4)} PLN</span>
      </div>
      <div class="price-row">
        <span class="label">Sprzedaż:</span>
        <span class="value">${price.sell_price.toFixed(4)} PLN</span>
      </div>
    </div>
  `
    )
    .join('');
}
