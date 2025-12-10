let searchQuery = '';
let searchTimeout = null;
let expandedCurrency = null;
let currentChartData = {};

async function fetchHistory(code, days) {
  const status = await backend.getStatus();
  if (!status.isOnline) return { error: 'Brak połączenia' };

  try {
    const response = await fetch(`${API_BASE}/currencies/history/${code}?n=${days}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? await response.json() : { error: 'Błąd pobierania' };
  } catch {
    return { error: 'Błąd połączenia' };
  }
}

function drawChart(canvas, data) {
  if (!canvas || !data || data.length === 0) return;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 280;

  const w = canvas.width;
  const h = canvas.height;
  const pad = 50;

  ctx.clearRect(0, 0, w, h);

  const prices = data.map((d) => (d.buy_price + d.sell_price) / 2);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad + ((h - pad * 2) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();

    const price = max - (range / 5) * i;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(price.toFixed(4), pad - 8, y + 4);
  }

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();

  prices.forEach((price, i) => {
    const x = pad + ((w - pad * 2) / (prices.length - 1)) * i;
    const y = pad + (h - pad * 2) - ((price - min) / range) * (h - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = '#2563eb';
  prices.forEach((price, i) => {
    const x = pad + ((w - pad * 2) / (prices.length - 1)) * i;
    const y = pad + (h - pad * 2) - ((price - min) / range) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

async function loadChart(code, days) {
  const wrapper = document.querySelector(`.price-wrapper[data-code="${code}"]`);
  if (!wrapper) return;

  let details = wrapper.querySelector('.price-details');

  if (!details) {
    details = document.createElement('div');
    details.className = 'price-details';
    wrapper.appendChild(details);
  }

  details.innerHTML = `
    <div class="chart-controls">
      <button class="chart-btn ${days === 7 ? 'active' : ''}" data-days="7">Tydzień</button>
      <button class="chart-btn ${days === 30 ? 'active' : ''}" data-days="30">Miesiąc</button>
      <button class="chart-btn ${days === 180 ? 'active' : ''}" data-days="180">Pół roku</button>
    </div>
    <div class="chart-container">
      <canvas id="chart-${code}"></canvas>
    </div>
  `;

  const data = await fetchHistory(code, days);
  const container = details.querySelector('.chart-container');

  if (data.error) {
    container.innerHTML = `<p class="chart-error">${data.error}</p>`;
    return;
  }

  currentChartData[code] = data;
  const canvas = document.getElementById(`chart-${code}`);
  drawChart(canvas, data);

  details.querySelectorAll('.chart-btn').forEach((btn) => {
    btn.onclick = async () => {
      const newDays = parseInt(btn.dataset.days);
      details.querySelectorAll('.chart-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const newData = await fetchHistory(code, newDays);
      if (newData.error) {
        container.innerHTML = `<p class="chart-error">${newData.error}</p>`;
      } else {
        currentChartData[code] = newData;
        container.innerHTML = `<canvas id="chart-${code}"></canvas>`;
        drawChart(document.getElementById(`chart-${code}`), newData);
      }
    };
  });
}

function toggleExpand(code) {
  const wrapper = document.querySelector(`.price-wrapper[data-code="${code}"]`);
  if (!wrapper) return;

  if (expandedCurrency === code) {
    expandedCurrency = null;
    const details = wrapper.querySelector('.price-details');
    if (details) details.remove();
    const icon = wrapper.querySelector('.expand-icon');
    if (icon) icon.textContent = '▼';
    delete currentChartData[code];
  } else {
    if (expandedCurrency) {
      const prevWrapper = document.querySelector(`.price-wrapper[data-code="${expandedCurrency}"]`);
      if (prevWrapper) {
        const prevDetails = prevWrapper.querySelector('.price-details');
        if (prevDetails) prevDetails.remove();
        const prevIcon = prevWrapper.querySelector('.expand-icon');
        if (prevIcon) prevIcon.textContent = '▼';
        delete currentChartData[expandedCurrency];
      }
    }

    expandedCurrency = code;
    const icon = wrapper.querySelector('.expand-icon');
    if (icon) icon.textContent = '▲';
    loadChart(code, 7);
  }
}

function filterList() {
  const table = document.querySelector('.prices-table');
  if (!table) return;

  const wrappers = Array.from(table.querySelectorAll('.price-wrapper'));
  let visible = 0;

  wrappers.forEach((wrapper) => {
    const row = wrapper.querySelector('.price-row');
    if (!row) return;

    if (!searchQuery) {
      wrapper.style.display = '';
      visible++;
      return;
    }

    const code = row.querySelector('.currency-code')?.textContent.toLowerCase() || '';
    const name = row.querySelector('.currency-name')?.textContent.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    if (code.includes(query) || name.includes(query)) {
      wrapper.style.display = '';
      visible++;
    } else {
      wrapper.style.display = 'none';
    }
  });

  const existing = table.parentNode.querySelector('.no-results');
  if (existing) existing.remove();

  if (visible === 0 && searchQuery) {
    const msg = document.createElement('p');
    msg.className = 'no-results';
    msg.textContent = `Brak wyników dla "${searchQuery}"`;
    table.parentNode.appendChild(msg);
  }
}

async function renderPrices() {
  const list = document.getElementById('prices-list');
  const warning = document.getElementById('prices-warning');

  const cached = await prices.get();
  const previous = await prices.getPrevious();
  const fresh = await prices.isFresh();
  const status = await backend.getStatus();
  const currenciesData = await currencies.get();

  if (!cached?.data) {
    list.innerHTML = '<p>Brak danych - oczekiwanie na połączenie...</p>';
    return;
  }

  if (!status.isOnline || !fresh) {
    const age = await prices.getAge();
    const minutes = Math.floor(age / 60000);
    warning.textContent = `Dane nieaktualne (${
      minutes > 0 ? `${minutes} min temu` : 'przed chwilą'
    })`;
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  const currencyMap = currenciesData?.data || {};
  const prevMap = {};
  if (previous?.data) {
    previous.data.forEach((p) => (prevMap[p.currency_code] = p));
  }

  const merged = cached.data.map((price, idx) => {
    const currency = currencyMap[price.currency_code];
    const prev = prevMap[price.currency_code];

    const getChange = (curr, prev) => {
      if (!prev) return 'neutral';
      return curr > prev ? 'up' : curr < prev ? 'down' : 'neutral';
    };

    return {
      index: idx + 1,
      code: price.currency_code,
      name: currency?.name || price.currency_code,
      buy: price.buy_price,
      sell: price.sell_price,
      buyChange: getChange(price.buy_price, prev?.buy_price),
      sellChange: getChange(price.sell_price, prev?.sell_price),
    };
  });

  const searchInput = document.getElementById('currency-search');
  const currentValue = searchInput?.value || searchQuery;

  list.innerHTML = `
    <div class="search-container">
      <input type="text" id="currency-search" placeholder="Szukaj waluty po kodzie lub nazwie..." value="${currentValue}"/>
    </div>
    <div class="prices-table">
      ${merged
        .map(
          (c) => `
        <div class="price-wrapper" data-code="${c.code}">
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
            <div class="price-expand">
              <span class="expand-icon">▼</span>
            </div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  const input = document.getElementById('currency-search');
  if (input) {
    input.oninput = (e) => {
      clearTimeout(searchTimeout);
      searchQuery = e.target.value;
      if (expandedCurrency) {
        expandedCurrency = null;
        currentChartData = {};
      }
      searchTimeout = setTimeout(filterList, 200);
      filterList();
    };
  }

  document.querySelectorAll('.price-row').forEach((row) => {
    row.onclick = () => {
      const wrapper = row.closest('.price-wrapper');
      if (wrapper) toggleExpand(wrapper.dataset.code);
    };
  });

  if (expandedCurrency && currentChartData[expandedCurrency]) {
    const wrapper = document.querySelector(`.price-wrapper[data-code="${expandedCurrency}"]`);
    if (wrapper) {
      const icon = wrapper.querySelector('.expand-icon');
      if (icon) icon.textContent = '▲';
      loadChart(expandedCurrency, 7);
    }
  }

  if (searchQuery) filterList();
}

async function updatePrices() {
  const table = document.querySelector('.prices-table');
  if (!table) {
    renderPrices();
    return;
  }

  const cached = await prices.get();
  const previous = await prices.getPrevious();
  const fresh = await prices.isFresh();
  const status = await backend.getStatus();
  const warning = document.getElementById('prices-warning');

  if (!cached?.data) return;

  if (!status.isOnline || !fresh) {
    const age = await prices.getAge();
    const minutes = Math.floor(age / 60000);
    warning.textContent = `Dane nieaktualne (${
      minutes > 0 ? `${minutes} min temu` : 'przed chwilą'
    })`;
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }

  const prevMap = {};
  if (previous?.data) {
    previous.data.forEach((p) => (prevMap[p.currency_code] = p));
  }

  cached.data.forEach((price) => {
    const wrapper = document.querySelector(`.price-wrapper[data-code="${price.currency_code}"]`);
    if (!wrapper) return;

    const prev = prevMap[price.currency_code];
    const getBuyChange = () => {
      if (!prev) return 'neutral';
      return price.buy_price > prev.buy_price
        ? 'up'
        : price.buy_price < prev.buy_price
        ? 'down'
        : 'neutral';
    };
    const getSellChange = () => {
      if (!prev) return 'neutral';
      return price.sell_price > prev.sell_price
        ? 'up'
        : price.sell_price < prev.sell_price
        ? 'down'
        : 'neutral';
    };

    const buyAmount = wrapper.querySelector('.price-value:nth-child(3) .price-amount');
    const sellAmount = wrapper.querySelector('.price-value:nth-child(4) .price-amount');

    if (buyAmount) {
      buyAmount.textContent = `${price.buy_price.toFixed(4)} PLN`;
      buyAmount.className = `price-amount ${getBuyChange()}`;
    }

    if (sellAmount) {
      sellAmount.textContent = `${price.sell_price.toFixed(4)} PLN`;
      sellAmount.className = `price-amount ${getSellChange()}`;
    }
  });
}
