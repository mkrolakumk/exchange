import { fetchCurrencies, fetchPrices, checkBackendStatus, fetchBalance } from '../utils/api.js';
import { state } from '../state.js';
import { createCurrencyRow } from '../components/currencyRow.js';

export function createHomeView() {
  let container;
  let abortController = null;
  let priceInterval = null;
  let currencies = [];
  let priceElements = { buy: [], sell: [] };

  function init() {
    container = document.getElementById('app');
    abortController = new AbortController();
    loadInitialData();
    startPriceUpdates();
  }

  function render() {
    container.textContent = '';
    const title = document.createElement('h1');
    title.textContent = 'Waluty świata';
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
      const previousPrices = (await state.getPreviousPrices()) || [];
      await state.setCurrencies(currencies);
      await state.setPrices(prices);
      renderData(currencies, prices, previousPrices);
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
        const previousPrices = (await state.getPreviousPrices()) || [];
        await state.setPrices(prices);
        updatePrices(prices, previousPrices);
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

  async function renderData(currencies, prices, previousPrices = []) {
    const list = document.getElementById('currency-list');
    list.textContent = '';
    priceElements = { buy: [], sell: [] };

    const isLoggedIn = await state.isLoggedIn();
    if (isLoggedIn) {
      await fetchBalance(await state.getToken());
    }

    for (const [index, currency] of currencies.entries()) {
      if (currency.code === 'PLN') continue;

      const price = prices.find((p) => p.currency_code === currency.code);
      const prevPrice = previousPrices.find((p) => p.currency_code === currency.code);

      const row = await createCurrencyRow({
        lp: index + 1,
        currencyCode: currency.code,
        currencyName: currency.name,
        priceBuy: price?.buy_price,
        previousPriceBuy: prevPrice?.buy_price,
        priceSell: price?.sell_price,
        previousPriceSell: prevPrice?.sell_price,
        isLoggedIn,
      });

      list.appendChild(row.element);
      priceElements.buy.push(row.buyPriceElement);
      priceElements.sell.push(row.sellPriceElement);
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
          ? `${Number(price.buy_price).toFixed(4)} PLN`
          : 'N/A';

        priceElements.buy[index].className = 'price-amount';
        if (price && prevPrice) {
          const buyChange = getChange(price.buy_price, prevPrice.buy_price);
          priceElements.buy[index].classList.add(buyChange);
        }
      }

      if (priceElements.sell[index]) {
        priceElements.sell[index].textContent = price
          ? `${Number(price.sell_price).toFixed(4)} PLN`
          : 'N/A';

        priceElements.sell[index].className = 'price-amount';
        if (price && prevPrice) {
          const sellChange = getChange(price.sell_price, prevPrice.sell_price);
          priceElements.sell[index].classList.add(sellChange);
        }
      }
    });
  }

  return {
    init,
    render,
    destroy,
  };
}
