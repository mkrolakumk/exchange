import { state } from '../state.js';
import { fetchCurrencies, fetchTrades, backendStatus } from '../utils/api.js';

export function createHistoryView() {
  let container = null;
  let abortController = null;
  let currentPage = 1;
  let totalPages = 1;
  let isLoading = false;

  async function init() {
    container = document.getElementById('app');
    abortController = new AbortController();
  }

  async function render() {
    await loadPage(currentPage);
  }

  function destroy() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    clearContainer();
  }

  async function loadPage(page) {
    if (isLoading) return;
    isLoading = true;

    clearContainer();
    renderTitle();
    showLoader();

    try {
      const [tradesData, currenciesData] = await Promise.all([
        fetchTrades(page),
        fetchCurrencies(),
      ]);

      currentPage = page;
      totalPages = Math.ceil(tradesData.total / tradesData.page_size);

      clearContainer();
      renderTitle();

      const status = await backendStatus.getStatus();
      if (!status.isOnline) {
        renderOfflineBanner();
      }

      if (tradesData.total === 0) {
        renderEmptyState();
      } else {
        const formattedTrades = tradesData.trades.map((trade) =>
          formatTradeData(trade, currenciesData)
        );
        renderTrades(formattedTrades);
        isLoading = false;
        renderPagination(tradesData);
      }
    } catch (error) {
      console.error('Błąd ładowania historii:', error.isNetworkError, error);

      if (error.isNetworkError) {
        const cached = await state.getTrades();
        const cachedCurrencies = await state.getCurrencies();

        console.log('Cache transakcji:', cached);
        console.log('Cache walut:', cachedCurrencies);

        if (cached?.trades?.length > 0) {
          clearContainer();
          renderTitle();
          renderOfflineBanner();

          const formattedTrades = cached.trades.map((trade) =>
            formatTradeData(trade, cachedCurrencies || {})
          );
          renderTrades(formattedTrades);
          isLoading = false;

          if (cached.total) {
            renderPagination(cached);
          }
        } else {
          clearContainer();
          renderTitle();
          renderOfflineBanner();
          renderEmptyState();
        }
      } else {
        clearContainer();
        renderError('Nie udało się załadować historii. Spróbuj ponownie później.');
      }
      isLoading = false;
    }
  }

  function formatTradeData(trade, currencies) {
    const isBuy = trade.trade_type === 'BUY';
    const currencyName = currencies[trade.currency_code]?.name || trade.currency_code;
    const amount = Number(trade.amount);
    const rate = Number(trade.exchange_rate);
    const total = amount * rate;

    return {
      type: isBuy ? 'Kupno' : 'Sprzedaż',
      typeClass: isBuy ? 'buy' : 'sell',
      currencyCode: trade.currency_code,
      currencyName,
      date: trade.timestamp,
      amount: amount.toFixed(2),
      rate: rate.toFixed(4),
      total: total.toFixed(2),
      fromCurrency: isBuy ? 'PLN' : trade.currency_code,
      toCurrency: isBuy ? trade.currency_code : 'PLN',
      fromAmount: isBuy ? total.toFixed(2) : amount.toFixed(2),
      toAmount: isBuy ? amount.toFixed(2) : total.toFixed(2),
    };
  }

  function createTradeItem(trade) {
    const item = document.createElement('div');
    item.className = 'history-item';

    const typeEl = document.createElement('div');
    typeEl.className = `history-type ${trade.typeClass}`;
    typeEl.textContent = trade.type;

    const exchangeEl = document.createElement('div');
    exchangeEl.className = 'history-exchange';

    const fromEl = document.createElement('div');
    fromEl.className = 'history-from';
    const fromAmount = document.createElement('span');
    fromAmount.className = 'history-amount';
    fromAmount.textContent = trade.fromAmount;
    const fromCurrency = document.createElement('span');
    fromCurrency.className = 'history-currency';
    fromCurrency.textContent = trade.fromCurrency;
    fromEl.appendChild(fromAmount);
    fromEl.appendChild(fromCurrency);

    const arrow = document.createElement('div');
    arrow.className = 'history-arrow';
    arrow.textContent = '→';

    const toEl = document.createElement('div');
    toEl.className = 'history-to';
    const toAmount = document.createElement('span');
    toAmount.className = 'history-amount';
    toAmount.textContent = trade.toAmount;
    const toCurrency = document.createElement('span');
    toCurrency.className = 'history-currency';
    toCurrency.textContent = trade.toCurrency;
    toEl.appendChild(toAmount);
    toEl.appendChild(toCurrency);

    exchangeEl.appendChild(fromEl);
    exchangeEl.appendChild(arrow);
    exchangeEl.appendChild(toEl);

    const infoEl = document.createElement('div');
    infoEl.className = 'history-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'history-name';
    nameEl.textContent = `${trade.currencyCode}/PLN - ${trade.currencyName} / Polski Złoty`;
    const rateEl = document.createElement('div');
    rateEl.className = 'history-rate';
    rateEl.textContent = `1 ${trade.currencyCode} = ${trade.rate} PLN`;
    infoEl.appendChild(nameEl);
    infoEl.appendChild(rateEl);

    const dateEl = document.createElement('div');
    dateEl.className = 'history-date';
    const date = new Date(trade.date);
    dateEl.textContent = date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    item.appendChild(typeEl);
    item.appendChild(exchangeEl);
    item.appendChild(infoEl);
    item.appendChild(dateEl);

    return item;
  }

  function renderTitle() {
    const title = document.createElement('h2');
    title.className = 'balance-title';
    title.textContent = 'Twoje wymiany';
    container.appendChild(title);
  }

  function renderTrades(trades) {
    const list = document.createElement('div');
    list.className = 'history-list';

    trades.forEach((trade) => {
      const item = createTradeItem(trade);
      list.appendChild(item);
    });

    container.appendChild(list);
  }

  function renderPagination(data) {
    const { page, page_size, total } = data;
    const fromItem = (page - 1) * page_size + 1;
    const toItem = Math.min(page * page_size, total);
    const calculatedTotalPages = Math.ceil(total / page_size);

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '← Poprzednia';
    prevBtn.disabled = page <= 1 || isLoading;
    prevBtn.onclick = () => loadPage(page - 1);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'pagination-info';

    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-page';
    pageInfo.textContent = `Strona ${page} z ${calculatedTotalPages}`;

    const itemInfo = document.createElement('span');
    itemInfo.className = 'pagination-items';
    itemInfo.textContent = `(${fromItem}-${toItem} z ${total})`;

    infoDiv.appendChild(pageInfo);
    infoDiv.appendChild(itemInfo);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Następna →';
    nextBtn.disabled = page >= calculatedTotalPages || isLoading;
    nextBtn.onclick = () => loadPage(page + 1);

    paginationDiv.appendChild(prevBtn);
    paginationDiv.appendChild(infoDiv);
    paginationDiv.appendChild(nextBtn);

    container.appendChild(paginationDiv);
  }

  function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'loader';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';

    const text = document.createElement('span');
    text.textContent = 'Ładowanie transakcji...';

    loader.appendChild(spinner);
    loader.appendChild(text);
    container.appendChild(loader);
  }

  function renderEmptyState() {
    const message = document.createElement('div');
    message.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '📊';

    const title = document.createElement('h3');
    title.textContent = 'Brak historii';

    const description = document.createElement('p');
    description.textContent = 'Nie masz jeszcze żadnych transakcji';

    message.appendChild(icon);
    message.appendChild(title);
    message.appendChild(description);
    container.appendChild(message);
  }

  function renderError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'warning';
    errorEl.textContent = message;
    container.appendChild(errorEl);
  }

  function renderOfflineBanner() {
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.textContent = 'Jesteś offline - pokazuję zapisane dane';
    container.appendChild(banner);
  }

  function clearContainer() {
    if (container) {
      container.textContent = '';
    }
  }

  return {
    init,
    render,
    destroy,
  };
}
