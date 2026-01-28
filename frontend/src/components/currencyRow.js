import { state } from '../state.js';
import { buyCurrency, sellCurrency, fetchCurrencyHistory, backendStatus } from '../utils/api.js';
import { createConfirmDialog } from './confirm.js';
import { drawChart } from '../utils/chart.js';

function getChange(curr, prev) {
  if (!prev) return 'neutral';
  return curr > prev ? 'up' : curr < prev ? 'down' : 'neutral';
}

export async function createCurrencyRow({
  lp,
  currencyCode,
  currencyName,
  priceBuy,
  previousPriceBuy,
  priceSell,
  previousPriceSell,
  isLoggedIn = false,
  onTransactionComplete = null,
}) {
  const confirmDialog = createConfirmDialog();
  let balance = 0;
  let sellBtn = null;
  let isExpanded = false;
  let chartContainer = null;
  let currentAbortController = null;
  if (isLoggedIn) {
    balance = await state.getBalance(currencyCode);
  }
  const wrapper = document.createElement('li');
  wrapper.className = 'price-wrapper';
  wrapper.dataset.code = currencyCode;

  const row = document.createElement('div');
  row.className = 'price-row';

  const indexDiv = document.createElement('div');
  indexDiv.className = 'price-index';
  indexDiv.textContent = lp;

  const currencyDiv = document.createElement('div');
  currencyDiv.className = 'price-currency';

  const codeDiv = document.createElement('div');
  codeDiv.className = 'currency-code';
  codeDiv.textContent = currencyCode;

  const nameDiv = document.createElement('div');
  nameDiv.className = 'currency-name';
  nameDiv.textContent = currencyName;

  currencyDiv.appendChild(codeDiv);
  currencyDiv.appendChild(nameDiv);

  if (balance > 0) {
    const balanceDiv = document.createElement('div');
    balanceDiv.className = 'user-balance';
    balanceDiv.textContent = `Posiadasz: ${balance.toFixed(2)}`;
    currencyDiv.appendChild(balanceDiv);
  }

  const buyPriceDiv = document.createElement('div');
  buyPriceDiv.className = 'price-value';

  const buyLabelDiv = document.createElement('div');
  buyLabelDiv.className = 'price-label';
  buyLabelDiv.textContent = 'Kupno';

  const buyAmountDiv = document.createElement('div');
  buyAmountDiv.className = 'price-amount';
  buyAmountDiv.textContent = priceBuy ? `${Number(priceBuy).toFixed(4)} PLN` : 'N/A';

  if (priceBuy && previousPriceBuy) {
    const change = getChange(priceBuy, previousPriceBuy);
    buyAmountDiv.classList.add(change);
  }

  buyPriceDiv.appendChild(buyLabelDiv);
  buyPriceDiv.appendChild(buyAmountDiv);

  const sellPriceDiv = document.createElement('div');
  sellPriceDiv.className = 'price-value';

  const sellLabelDiv = document.createElement('div');
  sellLabelDiv.className = 'price-label';
  sellLabelDiv.textContent = 'Sprzedaż';

  const sellAmountDiv = document.createElement('div');
  sellAmountDiv.className = 'price-amount';
  sellAmountDiv.textContent = priceSell ? `${Number(priceSell).toFixed(4)} PLN` : 'N/A';

  if (priceSell && previousPriceSell) {
    const change = getChange(priceSell, previousPriceSell);
    sellAmountDiv.classList.add(change);
  }

  sellPriceDiv.appendChild(sellLabelDiv);
  sellPriceDiv.appendChild(sellAmountDiv);

  const expandDiv = document.createElement('div');
  expandDiv.className = 'price-expand';

  const expandIcon = document.createElement('span');
  expandIcon.className = 'expand-icon';
  expandIcon.textContent = '▼';

  expandDiv.appendChild(expandIcon);

  row.appendChild(indexDiv);
  row.appendChild(currencyDiv);
  row.appendChild(buyPriceDiv);
  row.appendChild(sellPriceDiv);

  if (isLoggedIn) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'price-actions';
    actionsDiv.addEventListener('click', (e) => e.stopPropagation());
    actionsDiv.addEventListener('touchstart', (e) => e.stopPropagation());

    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn-buy';
    buyBtn.textContent = 'Kup';
    buyBtn.dataset.code = currencyCode;
    buyBtn.dataset.rate = priceBuy;

    buyBtn.onclick = async (e) => {
      e.stopPropagation();

      const status = await backendStatus.getStatus();
      if (!status.isOnline) {
        await confirmDialog.alert(
          'Brak połączenia',
          'Nie można kupić waluty - brak połączenia z serwerem. Spróbuj ponownie później.'
        );
        return;
      }

      const amountStr = await confirmDialog.prompt(
        `Kup ${currencyCode}`,
        `Wprowadź kwotę ${currencyCode} do kupienia (po ${Number(priceBuy).toFixed(
          4
        )} PLN za jednostkę):`,
        {
          inputType: 'number',
          placeholder: '0.00',
          step: '0.01',
          min: '0.01',
          max: '100000',
          validator: (value) => {
            if (!value) return { valid: false, message: 'Kwota jest wymagana' };
            const amount = parseFloat(value);
            if (isNaN(amount) || amount <= 0) {
              return { valid: false, message: 'Kwota musi być większa od 0' };
            }
            if (amount > 100000) {
              return { valid: false, message: 'Kwota nie może przekraczać 100 000' };
            }
            if (!/^\d+(\.\d{1,2})?$/.test(value)) {
              return { valid: false, message: 'Maksymalnie 2 miejsca po przecinku' };
            }
            return { valid: true, value: amount };
          },
        }
      );

      if (amountStr === null) return;

      try {
        await buyCurrency(currencyCode, amountStr);
        await confirmDialog.alert('Sukces', `Kupiono ${amountStr} ${currencyCode}`);
        if (onTransactionComplete) {
          await onTransactionComplete();
        }
      } catch (error) {
        console.error('Błąd kupna:', error);
        let errorMessage = 'Nie udało się wykonać transakcji';
        if (
          error.isNetworkError ||
          error.message.includes('Brak połączenia') ||
          error.message.includes('Serwer tymczasowo niedostępny')
        ) {
          errorMessage =
            'Brak połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        await confirmDialog.alert('Błąd', errorMessage);
      }
    };

    sellBtn = document.createElement('button');
    sellBtn.className = 'btn-sell';
    sellBtn.textContent = 'Sprzedaj';
    sellBtn.dataset.code = currencyCode;
    sellBtn.dataset.rate = priceSell;
    if (balance === 0) {
      sellBtn.disabled = true;
    } else {
      sellBtn.onclick = async (e) => {
        e.stopPropagation();

        const status = await backendStatus.getStatus();
        if (!status.isOnline) {
          await confirmDialog.alert(
            'Brak połączenia',
            'Nie można sprzedać waluty - brak połączenia z serwerem. Spróbuj ponownie później.'
          );
          return;
        }

        const amountStr = await confirmDialog.prompt(
          `Sprzedaj ${currencyCode}`,
          `Masz: ${balance.toFixed(2)} ${currencyCode}. Wprowadź kwotę do sprzedaży (po ${Number(
            priceSell
          ).toFixed(4)} PLN za jednostkę):`,
          {
            inputType: 'number',
            placeholder: '0.00',
            step: '0.01',
            min: '0.01',
            max: balance.toString(),
            validator: (value) => {
              if (!value) return { valid: false, message: 'Kwota jest wymagana' };
              const amount = parseFloat(value);
              if (isNaN(amount) || amount <= 0) {
                return { valid: false, message: 'Kwota musi być większa od 0' };
              }
              if (amount > balance) {
                return { valid: false, message: 'Niewystarczające środki' };
              }
              if (!/^\d+(\.\d{1,2})?$/.test(value)) {
                return { valid: false, message: 'Maksymalnie 2 miejsca po przecinku' };
              }
              return { valid: true, value: amount };
            },
          }
        );

        if (amountStr === null) return;

        try {
          await sellCurrency(currencyCode, amountStr);
          await confirmDialog.alert('Sukces', `Sprzedano ${amountStr} ${currencyCode}`);
          if (onTransactionComplete) {
            await onTransactionComplete();
          }
        } catch (error) {
          console.error('Błąd sprzedaży:', error);
          let errorMessage = 'Nie udało się wykonać transakcji';
          if (
            error.isNetworkError ||
            error.message.includes('Brak połączenia') ||
            error.message.includes('Serwer tymczasowo niedostępny')
          ) {
            errorMessage =
              'Brak połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          await confirmDialog.alert('Błąd', errorMessage);
        }
      };
    }

    actionsDiv.appendChild(buyBtn);
    actionsDiv.appendChild(sellBtn);
    row.appendChild(actionsDiv);
  }

  row.appendChild(expandDiv);

  row.onclick = (e) => {
    if (e.target.closest('.btn-buy, .btn-sell')) return;
    toggleChart();
  };

  wrapper.appendChild(row);

  async function loadChart(days = 7) {
    if (!chartContainer) return;

    const controlsDiv = chartContainer.querySelector('.chart-controls');
    const canvasContainer = chartContainer.querySelector('.chart-container');

    controlsDiv.querySelectorAll('.chart-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.days) === days);
    });

    canvasContainer.textContent = 'Wczytywanie...';

    try {
      if (currentAbortController) {
        currentAbortController.abort();
      }

      currentAbortController = new AbortController();

      const data = await fetchCurrencyHistory(currencyCode, days, currentAbortController.signal);

      if (!data) return;

      if (data.error || data.length === 0) {
        canvasContainer.textContent = 'Brak danych dla wybranego okresu';
        return;
      }

      canvasContainer.textContent = '';
      const canvas = document.createElement('canvas');
      canvas.id = `chart-${currencyCode}`;
      canvasContainer.appendChild(canvas);

      drawChart(canvas, data);
    } catch (error) {
      console.error('Błąd ładowania wykresu:', error);
      canvasContainer.textContent = 'Błąd ładowania danych';
    }
  }

  function toggleChart() {
    if (isExpanded) {
      isExpanded = false;
      expandIcon.textContent = '▼';
      if (chartContainer) {
        chartContainer.remove();
        chartContainer = null;
      }
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
      }
    } else {
      isExpanded = true;
      expandIcon.textContent = '▲';

      chartContainer = document.createElement('div');
      chartContainer.className = 'chart-wrapper';

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'chart-controls';

      const periods = [
        { days: 7, label: 'Tydzień' },
        { days: 30, label: 'Miesiąc' },
        { days: 180, label: 'Pół roku' },
      ];

      periods.forEach(({ days, label }) => {
        const btn = document.createElement('button');
        btn.className = 'chart-btn';
        btn.textContent = label;
        btn.dataset.days = days;
        btn.onclick = (e) => {
          e.stopPropagation();
          loadChart(days);
        };
        controlsDiv.appendChild(btn);
      });

      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'chart-container';

      chartContainer.appendChild(controlsDiv);
      chartContainer.appendChild(canvasContainer);
      wrapper.appendChild(chartContainer);

      loadChart(7);
    }
  }

  async function updateBalance() {
    if (!isLoggedIn) return;

    try {
      const newBalance = await state.getBalance(currencyCode);
      const existingBalanceDiv = currencyDiv.querySelector('.user-balance');

      if (newBalance > 0) {
        if (existingBalanceDiv) {
          existingBalanceDiv.textContent = `Posiadasz: ${newBalance.toFixed(2)}`;
        } else {
          const balanceDiv = document.createElement('div');
          balanceDiv.className = 'user-balance';
          balanceDiv.textContent = `Posiadasz: ${newBalance.toFixed(2)}`;
          currencyDiv.appendChild(balanceDiv);
        }
        if (sellBtn) {
          sellBtn.disabled = false;
        }
      } else {
        if (existingBalanceDiv) {
          existingBalanceDiv.remove();
        }
        if (sellBtn) {
          sellBtn.disabled = true;
        }
      }
    } catch (error) {
      console.error(`Błąd aktualizacji salda ${currencyCode}:`, error);
    }
  }

  return {
    element: wrapper,
    buyPriceElement: buyAmountDiv,
    sellPriceElement: sellAmountDiv,
    updateBalance,
  };
}
