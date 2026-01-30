import { state } from '../state.js';
import { fetchNotifications, updateNotifications, fetchCurrencies } from '../utils/api.js';
import { createConfirmDialog } from '../components/confirm.js';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../utils/notifications.js';

export function createNotificationsView() {
  let container = null;
  let selectedCurrency = null;
  let currencyList = [];
  const confirmDialog = createConfirmDialog();

  async function init() {
    container = document.querySelector('#app');
  }

  async function render() {
    container.textContent = '';
    showLoader();

    try {
      const notifications = await fetchNotifications();
      const currenciesData = await fetchCurrencies();

      container.textContent = '';

      currencyList = Object.entries(currenciesData)
        .filter(([code]) => code !== 'PLN')
        .map(([code, info]) => ({ code, name: info.name }));

      const notificationPermission = await getNotificationPermission();

      const permissionBanner = renderPermissionBanner(notificationPermission);
      const notificationsTable = renderNotificationsTable(notifications, currenciesData);
      const notificationForm = renderNotificationForm();

      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('h2');
      title.textContent = 'Powiadomienia';
      card.appendChild(title);

      if (permissionBanner) {
        card.appendChild(permissionBanner);
      }

      card.appendChild(notificationsTable);
      card.appendChild(notificationForm);

      container.appendChild(card);

      attachEventListeners(notifications);
    } catch (error) {
      console.error('Błąd ładowania powiadomień:', error);
      container.textContent = '';
      renderError('Nie udało się załadować powiadomień. Spróbuj ponownie później.');
    }
  }

  function renderPermissionBanner(permission) {
    if (permission === 'granted') return null;

    const banner = document.createElement('div');
    banner.className = 'notification-permission-banner';

    if (permission === 'denied') {
      const p = document.createElement('p');
      p.className = 'permission-denied';
      p.textContent = '⚠️ Powiadomienia zablokowane. Odblokuj w ustawieniach przeglądarki.';
      banner.appendChild(p);
    } else if (permission === 'unsupported') {
      const p = document.createElement('p');
      p.className = 'permission-unsupported';
      p.textContent = '⚠️ Twoja przeglądarka (lub urządzenie) nie wspiera powiadomień.';
      banner.appendChild(p);
    } else {
      const p = document.createElement('p');
      p.textContent = 'Włącz powiadomienia, aby otrzymywać alerty o kursach walut.';
      banner.appendChild(p);

      const btn = document.createElement('button');
      btn.id = 'enable-notifications';
      btn.className = 'btn-primary';
      btn.textContent = 'Włącz powiadomienia';
      banner.appendChild(btn);
    }

    return banner;
  }

  function renderNotificationsTable(notifications, currenciesData) {
    const wrapper = document.createElement('div');
    wrapper.className = 'notifications-table';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    ['Waluta', 'Warunek', 'Akcja'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (notifications.length === 0) {
      const row = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'Brak powiadomień';
      row.appendChild(td);
      tbody.appendChild(row);
    } else {
      notifications.forEach((n, idx) => {
        const row = document.createElement('tr');

        const currencyCell = document.createElement('td');
        const currencyName = currenciesData[n.currency_code]?.name || n.currency_code;
        currencyCell.textContent = `${currencyName} (${n.currency_code})`;
        row.appendChild(currencyCell);

        const conditionCell = document.createElement('td');
        const directionText = n.direction === 'above' ? 'powyżej' : 'poniżej';
        conditionCell.textContent = `${directionText} ${n.threshold.toFixed(2)}`;
        row.appendChild(conditionCell);

        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.dataset.idx = idx;
        deleteBtn.textContent = 'Usuń';
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        tbody.appendChild(row);
      });
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  }

  function renderNotificationForm() {
    const formWrapper = document.createElement('div');
    formWrapper.className = 'notification-form';

    const formTitle = document.createElement('h3');
    formTitle.textContent = 'Dodaj powiadomienie';
    formWrapper.appendChild(formTitle);

    const form = document.createElement('form');
    form.id = 'add-notification-form';

    const currencyGroup = document.createElement('div');
    currencyGroup.className = 'form-group';

    const currencyLabel = document.createElement('label');
    currencyLabel.textContent = 'Waluta';
    currencyGroup.appendChild(currencyLabel);

    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'currency-select-wrapper';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'notification-search';
    searchInput.placeholder = 'Szukaj waluty...';
    searchInput.autocomplete = 'off';
    searchInput.required = true;
    selectWrapper.appendChild(searchInput);

    const dropdown = document.createElement('div');
    dropdown.className = 'currency-dropdown hidden';
    dropdown.id = 'currency-dropdown';
    selectWrapper.appendChild(dropdown);

    currencyGroup.appendChild(selectWrapper);
    form.appendChild(currencyGroup);

    const directionGroup = document.createElement('div');
    directionGroup.className = 'form-group';

    const directionLabel = document.createElement('label');
    directionLabel.textContent = 'Kierunek';
    directionGroup.appendChild(directionLabel);

    const directionSelect = document.createElement('select');
    directionSelect.id = 'notification-direction';
    directionSelect.required = true;

    const aboveOption = document.createElement('option');
    aboveOption.value = 'above';
    aboveOption.textContent = 'powyżej';
    directionSelect.appendChild(aboveOption);

    const belowOption = document.createElement('option');
    belowOption.value = 'below';
    belowOption.textContent = 'poniżej';
    directionSelect.appendChild(belowOption);

    directionGroup.appendChild(directionSelect);
    form.appendChild(directionGroup);

    const thresholdGroup = document.createElement('div');
    thresholdGroup.className = 'form-group';

    const thresholdLabel = document.createElement('label');
    thresholdLabel.textContent = 'Próg wartości';
    thresholdGroup.appendChild(thresholdLabel);

    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'number';
    thresholdInput.id = 'notification-threshold';
    thresholdInput.step = '0.01';
    thresholdInput.min = '0.01';
    thresholdInput.required = true;
    thresholdGroup.appendChild(thresholdInput);

    form.appendChild(thresholdGroup);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn-primary';
    submitBtn.textContent = 'Dodaj';
    form.appendChild(submitBtn);

    formWrapper.appendChild(form);

    return formWrapper;
  }

  function attachEventListeners(notifications) {
    const enableBtn = container.querySelector('#enable-notifications');
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
          render();
        }
      });
    }

    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.target.dataset.idx);
        await handleDeleteNotification(idx, notifications);
        render();
      });
    });

    const form = container.querySelector('#add-notification-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddNotification(notifications);
        render();
      });
    }

    setupCurrencyDropdown();
  }

  function setupCurrencyDropdown() {
    const input = document.getElementById('notification-search');
    const dropdown = document.getElementById('currency-dropdown');

    if (!input || !dropdown) return;

    function renderDropdown(query = '') {
      const filtered = currencyList.filter((c) => {
        const q = query.toLowerCase();
        return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      });

      dropdown.textContent = '';

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dropdown-empty';
        empty.textContent = 'Brak wyników';
        dropdown.appendChild(empty);
        return;
      }

      filtered.forEach((c) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.code = c.code;

        const codeSpan = document.createElement('span');
        codeSpan.className = 'dropdown-code';
        codeSpan.textContent = c.code;
        item.appendChild(codeSpan);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'dropdown-name';
        nameSpan.textContent = c.name;
        item.appendChild(nameSpan);

        item.addEventListener('click', () => {
          selectedCurrency = c.code;
          input.value = `${c.name} (${c.code})`;
          dropdown.classList.add('hidden');
        });

        dropdown.appendChild(item);
      });
    }

    input.addEventListener('focus', () => {
      renderDropdown(input.value);
      dropdown.classList.remove('hidden');
    });

    input.addEventListener('input', (e) => {
      selectedCurrency = null;
      renderDropdown(e.target.value);
      dropdown.classList.remove('hidden');
    });

    input.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.add('hidden'), 200);
    });
  }

  async function handleAddNotification(notifications) {
    if (!selectedCurrency) {
      await confirmDialog.alert('Błąd', 'Wybierz walutę z listy');
      return;
    }

    const direction = document.getElementById('notification-direction').value;
    const threshold = parseFloat(document.getElementById('notification-threshold').value);

    notifications.push({
      currency_code: selectedCurrency,
      threshold,
      direction,
    });

    try {
      await updateNotifications(notifications);
      selectedCurrency = null;
    } catch (err) {
      await confirmDialog.alert('Błąd', 'Błąd podczas dodawania powiadomienia: ' + err.message);
    }
  }

  async function handleDeleteNotification(idx, notifications) {
    notifications.splice(idx, 1);
    try {
      await updateNotifications(notifications);
    } catch (err) {
      await confirmDialog.alert('Błąd', 'Błąd podczas usuwania powiadomienia: ' + err.message);
    }
  }

  function destroy() {
    if (container) {
      container.textContent = '';
    }
  }

  function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'loader';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';

    const text = document.createElement('span');
    text.textContent = 'Ładowanie powiadomień...';

    loader.appendChild(spinner);
    loader.appendChild(text);
    container.appendChild(loader);
  }

  function renderError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'warning';
    errorEl.textContent = message;
    container.appendChild(errorEl);
  }

  return {
    init,
    render,
    destroy,
  };
}
