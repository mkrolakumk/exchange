import { fetchCurrencies, fetchPrices, checkBackendStatus } from '../utils/api.js';
import { state } from '../state.js';

export function createHomeView() {
  let container;
  let abortController = null;
  let priceInterval = null;
  let currencies = [];
  let priceElements = [];

  function init() {
    container = document.getElementById('app');
    abortController = new AbortController();
    loadInitialData();
    startPriceUpdates();
  }

  function render() {
    container.textContent = '';
    const title = document.createElement('h1');
    title.textContent = 'Pobrane waluty';
    container.appendChild(title);

    const status = document.createElement('p');
    status.id = 'status';
    status.textContent = 'Sprawdzanie statusu...';
    container.appendChild(status);

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
      await state.setCurrencies(currencies);
      await state.setPrices(prices);
      renderData(currencies, prices);
      checkStatus();
    } catch (error) {
      console.error('Błąd:', error);
      renderError('Nie udało się załadować danych');
    }
  }

  function startPriceUpdates() {
    priceInterval = setInterval(async () => {
      try {
        const prices = await fetchPrices();
        await state.setPrices(prices);
        updatePrices(prices);
      } catch (error) {
        console.error('Błąd aktualizacji cen:', error);
      }
    }, 10000);
  }

  async function checkStatus() {
    const isOnline = await checkBackendStatus();
    const status = isOnline ? 'Backend online' : 'Backend offline';
    document.getElementById('status').textContent = status;
  }

  function renderData(currencies, prices) {
    const list = document.getElementById('currency-list');
    list.textContent = '';
    priceElements = [];
    currencies.forEach((currency) => {
      const item = document.createElement('li');
      const price = prices.find((p) => p.currency_code === currency.code);
      const priceSpan = document.createElement('span');
      priceSpan.textContent = price ? price.buy_price : 'N/A';
      item.textContent = `${currency.name} (${currency.code}): `;
      item.appendChild(priceSpan);
      list.appendChild(item);
      priceElements.push(priceSpan);
    });
  }

  function updatePrices(prices) {
    currencies.forEach((currency, index) => {
      const price = prices.find((p) => p.currency_code === currency.code);
      if (priceElements[index]) {
        priceElements[index].textContent = price ? price.buy_price : 'N/A';
      }
    });
  }

  function renderError(message) {
    const error = document.createElement('p');
    error.textContent = message;
    container.appendChild(error);
  }

  return {
    init,
    render,
    destroy,
  };
}
