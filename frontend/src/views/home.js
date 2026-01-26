import { fetchCurrencies, fetchPrices, checkBackendStatus, backendStatus } from '../utils/api.js';
import { state } from '../state.js';
import { createCurrencyRow } from '../components/currencyRow.js';
import { checkAndUpdateLocalCurrency } from '../utils/geolocation.js';

export function createHomeView() {
  let container;
  let abortController = null;
  let priceInterval = null;
  let currencies = [];
  let priceElements = { buy: [], sell: [] };
  let currencyRows = new Map();
  let searchQuery = '';
  let searchTimeout = null;
  let wrappers = [];

  function init() {
    container = document.getElementById('app');
    abortController = new AbortController();
    loadInitialData();
    startPriceUpdates();
    checkAndUpdateLocalCurrency();
  }

  function render() {
    container.textContent = '';
    const title = document.createElement('h1');
    title.textContent = 'Waluty świata';
    container.appendChild(title);

    const status = document.createElement('p');
    status.id = 'status';
    status.className = 'hidden';
    status.textContent = 'Sprawdzanie statusu...';
    container.appendChild(status);

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'currency-search';
    searchInput.placeholder = 'Szukaj waluty po kodzie lub nazwie...';
    searchInput.oninput = (e) => {
      clearTimeout(searchTimeout);
      searchQuery = e.target.value;
      searchTimeout = setTimeout(filterList, 200);
    };
    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);

    const list = document.createElement('ul');
    list.id = 'currency-list';
    container.appendChild(list);
  }

  function destroy() {
    if (abortController) {
      abortController.abort();
    }
    if (priceInterval) {
      clearInterval(priceInterval);
    }
  }

  async function loadInitialData() {
    try {
      const currenciesObj = await fetchCurrencies();
      currencies = Object.values(currenciesObj);
      const prices = await fetchPrices();
      const previousPrices = (await state.getPreviousPrices()) || [];
      await state.setCurrencies(currencies);
      await state.setPrices(prices);
      renderData(currencies, prices, previousPrices);
      checkStatus();
    } catch (error) {
      console.error('Błąd:', error);
      const message = error.isNetworkError
        ? 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.'
        : 'Nie udało się załadować danych';
      renderError(message);
    }
  }

  function startPriceUpdates() {
    priceInterval = setInterval(async () => {
      try {
        if (currencies.length === 0) {
          await loadInitialData();
          return;
        }

        const prices = await fetchPrices();
        const previousPrices = (await state.getPreviousPrices()) || [];
        await state.setPrices(prices);
        updatePrices(prices, previousPrices);
      } catch (error) {
        console.error('Błąd aktualizacji cen:', error);
      }
    }, 900);
  }

  async function checkStatus() {
    await checkBackendStatus();
    const status = await backendStatus.getStatus();
    const statusText = status.isOnline ? 'Online' : 'Offline';
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = statusText;
      statusEl.className = status.isOnline ? 'online' : 'offline';
    }
  }

  async function renderData(currencies, prices, previousPrices = []) {
    const list = document.getElementById('currency-list');
    list.textContent = '';
    priceElements = { buy: [], sell: [] };
    currencyRows.clear();
    wrappers = [];

    const isLoggedIn = await state.isLoggedIn();

    for (const [index, currency] of currencies.entries()) {
      if (currency.code === 'PLN') continue;

      const price = prices.find((p) => p.currency_code === currency.code);
      const prevPrice = previousPrices.find((p) => p.currency_code === currency.code);

      const row = await createCurrencyRow({
        lp: index + 1,
        currencyCode: currency.code,
        currencyName: currency.name,
        priceBuy: price?.sell_price,
        previousPriceBuy: prevPrice?.sell_price,
        priceSell: price?.buy_price,
        previousPriceSell: prevPrice?.buy_price,
        isLoggedIn,
        onTransactionComplete: async () => {
          const rowData = currencyRows.get(currency.code);
          if (rowData) await rowData.row.updateBalance();
        },
      });

      list.appendChild(row.element);
      priceElements.buy.push(row.buyPriceElement);
      priceElements.sell.push(row.sellPriceElement);
      currencyRows.set(currency.code, {
        row,
        searchCode: currency.code.toLowerCase(),
        searchName: currency.name.toLowerCase(),
      });
      wrappers.push(row.element);
    }

    const searchInput = document.getElementById('currency-search');
    if (searchInput && searchQuery) {
      searchInput.value = searchQuery;
      filterList();
    }
  }

  function updatePrices(prices, prevPrices = []) {
    const getChange = (curr, prev) => {
      if (!prev) return 'neutral';
      return curr > prev ? 'up' : curr < prev ? 'down' : 'neutral';
    };

    currencies.forEach((currency, index) => {
      const price = prices.find((p) => p.currency_code === currency.code);
      const prevPrice = prevPrices.find((p) => p.currency_code === currency.code);

      if (priceElements.buy[index]) {
        priceElements.buy[index].textContent = price
          ? `${Number(price.sell_price).toFixed(4)} PLN`
          : 'N/A';

        priceElements.buy[index].className = 'price-amount';
        if (price && prevPrice) {
          const buyChange = getChange(price.sell_price, prevPrice.sell_price);
          priceElements.buy[index].classList.add(buyChange);
        }
      }

      if (priceElements.sell[index]) {
        priceElements.sell[index].textContent = price
          ? `${Number(price.buy_price).toFixed(4)} PLN`
          : 'N/A';

        priceElements.sell[index].className = 'price-amount';
        if (price && prevPrice) {
          const sellChange = getChange(price.buy_price, prevPrice.buy_price);
          priceElements.sell[index].classList.add(sellChange);
        }
      }
    });
  }

  function filterList() {
    const list = document.getElementById('currency-list');
    if (!list) return;

    let visible = 0;
    const query = searchQuery.toLowerCase();

    currencyRows.forEach((data, code) => {
      const wrapper = data.row.element;

      if (!searchQuery) {
        wrapper.style.display = '';
        visible++;
        return;
      }

      if (data.searchCode.includes(query) || data.searchName.includes(query)) {
        wrapper.style.display = '';
        visible++;
      } else {
        wrapper.style.display = 'none';
      }
    });

    const existing = list.parentNode.querySelector('.no-results');
    if (existing) existing.remove();

    if (visible === 0 && searchQuery) {
      const msg = document.createElement('p');
      msg.className = 'no-results';
      msg.textContent = `Brak wyników dla "${searchQuery}"`;
      list.parentNode.appendChild(msg);
    }
  }

  function renderError(message) {
    container.textContent = '';
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
