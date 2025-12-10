async function renderNotificationsView(container) {
  const prefs = await preferences.get();
  const notifications = prefs?.data || [];
  const allCurrencies = await currencies.get();
  const currenciesData = allCurrencies?.data || {};

  const rows = notifications
    .map((n, idx) => {
      const currencyName = currenciesData[n.currency_code]?.name || n.currency_code;
      const directionText = n.direction === 'above' ? 'powyżej' : 'poniżej';
      return `
      <tr>
        <td>${currencyName} (${n.currency_code})</td>
        <td>${directionText} ${n.threshold.toFixed(2)}</td>
        <td><button class="btn-delete" data-idx="${idx}">Usuń</button></td>
      </tr>
    `;
    })
    .join('');

  const currencyList = Object.entries(currenciesData)
    .filter(([code]) => code !== 'PLN')
    .map(([code, info]) => ({ code, name: info.name }));

  container.innerHTML = `
    <div class="card">
      <h2>Powiadomienia</h2>
      
      <div class="notifications-table">
        <table>
          <thead>
            <tr>
              <th>Waluta</th>
              <th>Warunek</th>
              <th>Akcja</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3">Brak powiadomień</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="notification-form">
        <h3>Dodaj powiadomienie</h3>
        <form id="add-notification-form">
          <div class="form-group">
            <label>Waluta</label>
            <div class="currency-select-wrapper">
              <input 
                type="text" 
                id="notification-search" 
                placeholder="Szukaj waluty..." 
                autocomplete="off"
                required
              />
              <div class="currency-dropdown hidden" id="currency-dropdown"></div>
            </div>
          </div>
          <div class="form-group">
            <label>Kierunek</label>
            <select id="notification-direction" required>
              <option value="above">powyżej</option>
              <option value="below">poniżej</option>
            </select>
          </div>
          <div class="form-group">
            <label>Próg wartości</label>
            <input type="number" id="notification-threshold" step="0.01" min="0.01" required />
          </div>
          <button type="submit" class="btn-primary">Dodaj</button>
        </form>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(e.target.dataset.idx);
      await handleDeleteNotification(idx);
      renderNotificationsView(container);
    });
  });

  const form = container.querySelector('#add-notification-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAddNotification();
    renderNotificationsView(container);
  });

  setupCurrencyDropdown(currencyList);
}

let selectedCurrency = null;

function setupCurrencyDropdown(currencyList) {
  const input = document.getElementById('notification-search');
  const dropdown = document.getElementById('currency-dropdown');

  function renderDropdown(query = '') {
    const filtered = currencyList.filter((c) => {
      const q = query.toLowerCase();
      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-empty">Brak wyników</div>';
      return;
    }

    const itemsHtml = filtered
      .map(
        (c) => `
        <div class="dropdown-item" data-code="${c.code}">
          <span class="dropdown-code">${c.code}</span>
          <span class="dropdown-name">${c.name}</span>
        </div>
      `
      )
      .join('');

    dropdown.innerHTML = `
      ${itemsHtml}
      ${
        filtered.length > 5
          ? `<div class="dropdown-info">${filtered.length} wyników - przewiń aby zobaczyć więcej</div>`
          : ''
      }
    `;

    dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
      item.onclick = () => {
        const code = item.dataset.code;
        const currency = currencyList.find((c) => c.code === code);
        selectedCurrency = code;
        input.value = `${currency.name} (${code})`;
        dropdown.classList.add('hidden');
      };
    });
  }

  input.onfocus = () => {
    renderDropdown(input.value);
    dropdown.classList.remove('hidden');
  };

  input.oninput = (e) => {
    selectedCurrency = null;
    renderDropdown(e.target.value);
    dropdown.classList.remove('hidden');
  };

  input.onblur = () => {
    setTimeout(() => dropdown.classList.add('hidden'), 200);
  };

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

async function handleAddNotification() {
  if (!selectedCurrency) {
    alert('Wybierz walutę z listy');
    return;
  }

  const direction = document.getElementById('notification-direction').value;
  const threshold = parseFloat(document.getElementById('notification-threshold').value);

  const prefs = await preferences.get();
  const notifications = prefs?.data || [];

  notifications.push({ currency_code: selectedCurrency, threshold, direction });

  try {
    await updateNotifications(notifications);
    selectedCurrency = null;
  } catch (err) {
    alert('Błąd podczas dodawania powiadomienia: ' + err.message);
  }
}

async function handleDeleteNotification(idx) {
  const prefs = await preferences.get();
  const notifications = prefs?.data || [];

  notifications.splice(idx, 1);

  try {
    await updateNotifications(notifications);
  } catch (err) {
    alert('Błąd podczas usuwania powiadomienia: ' + err.message);
  }
}
