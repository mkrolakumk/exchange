let searchQuery = '';
let searchTimeout = null;

function filterAndRenderList() {
  const pricesList = document.getElementById('prices-list');
  const pricesTable = pricesList.querySelector('.prices-table');
  const noResults = pricesList.querySelector('.no-results');

  if (!pricesTable) return;

  const allRows = Array.from(pricesTable.querySelectorAll('.price-row'));
  let visibleCount = 0;

  if (!searchQuery) {
    allRows.forEach((row) => {
      row.style.display = '';
      visibleCount++;
    });
  } else {
    const query = searchQuery.toLowerCase();
    allRows.forEach((row) => {
      const code = row.querySelector('.currency-code').textContent.toLowerCase();
      const name = row.querySelector('.currency-name').textContent.toLowerCase();

      if (code.includes(query) || name.includes(query)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });
  }

  if (noResults) {
    noResults.remove();
  }

  if (visibleCount === 0 && searchQuery) {
    const noResultsMsg = document.createElement('p');
    noResultsMsg.className = 'no-results';
    noResultsMsg.textContent = `Brak wyników dla "${searchQuery}"`;
    pricesTable.parentNode.appendChild(noResultsMsg);
  }
}

async function renderPrices() {
  const pricesList = document.getElementById('prices-list');
  const warning = document.getElementById('prices-warning');

  const cached = await prices.get();
  const previous = await prices.getPrevious();
  const fresh = await prices.isFresh();
  const status = await backend.getStatus();
  const currenciesData = await currencies.get();

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

  const currencyMap = currenciesData?.data || {};
  const previousMap = {};
  if (previous?.data) {
    previous.data.forEach((p) => {
      previousMap[p.currency_code] = p;
    });
  }

  let merged = cached.data.map((price, index) => {
    const currency = currencyMap[price.currency_code];
    const prev = previousMap[price.currency_code];

    return {
      index: index + 1,
      code: price.currency_code,
      name: currency?.name || price.currency_code,
      buy: price.buy_price,
      sell: price.sell_price,
      buyChange: prev
        ? price.buy_price > prev.buy_price
          ? 'up'
          : price.buy_price < prev.buy_price
          ? 'down'
          : 'neutral'
        : 'neutral',
      sellChange: prev
        ? price.sell_price > prev.sell_price
          ? 'up'
          : price.sell_price < prev.sell_price
          ? 'down'
          : 'neutral'
        : 'neutral',
    };
  });

  const searchInput = document.getElementById('currency-search');
  const currentValue = searchInput?.value || searchQuery;

  pricesList.innerHTML = `
    <div class="search-container">
      <input 
        type="text" 
        id="currency-search" 
        placeholder="Szukaj waluty po kodzie lub nazwie..."
        value="${currentValue}"
      />
    </div>
    <div class="prices-table">
      ${merged
        .map(
          (c) => `
        <div class="price-row">
          <div class="price-index">${c.index}</div>
          <div class="price-currency">
            <div class="currency-code">${c.code}</div>
            <div class="currency-name">${c.name}</div>
          </div>
          <div class="price-value">
            <div class="price-label">Kupno</div>
            <div class="price-amount ${c.buyChange}">${c.buy.toFixed(4)} PLN</div>
          </div>
          <div class="price-value">
            <div class="price-label">Sprzedaż</div>
            <div class="price-amount ${c.sellChange}">${c.sell.toFixed(4)} PLN</div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  const newSearchInput = document.getElementById('currency-search');
  if (newSearchInput) {
    newSearchInput.addEventListener('input', (e) => {
      const value = e.target.value;
      clearTimeout(searchTimeout);
      searchQuery = value;
      searchTimeout = setTimeout(() => {
        filterAndRenderList();
      }, 200);
      filterAndRenderList();
    });
  }

  if (searchQuery) {
    filterAndRenderList();
  }
}
