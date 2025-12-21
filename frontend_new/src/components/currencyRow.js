import { state } from '../state.js';
import { buyCurrency, sellCurrency } from '../utils/api.js';
import { createConfirmDialog } from './confirm.js';

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

  row.appendChild(indexDiv);
  row.appendChild(currencyDiv);
  row.appendChild(buyPriceDiv);
  row.appendChild(sellPriceDiv);

  if (isLoggedIn) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'price-actions';

    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn-buy';
    buyBtn.textContent = 'Kup';
    buyBtn.dataset.code = currencyCode;
    buyBtn.dataset.rate = priceBuy;

    buyBtn.onclick = async () => {
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
        const token = await state.getToken();
        await buyCurrency(token, currencyCode, amountStr);
        await confirmDialog.alert('Sukces', `Kupiono ${amountStr} ${currencyCode}`);
        if (onTransactionComplete) {
          await onTransactionComplete();
        }
      } catch (error) {
        console.error('Błąd kupna:', error);
        await confirmDialog.alert('Błąd', error.message || 'Nie udało się kupić waluty');
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
      sellBtn.onclick = async () => {
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
          const token = await state.getToken();
          await sellCurrency(token, currencyCode, amountStr);
          await confirmDialog.alert('Sukces', `Sprzedano ${amountStr} ${currencyCode}`);
          if (onTransactionComplete) {
            await onTransactionComplete();
          }
        } catch (error) {
          console.error('Błąd sprzedaży:', error);
          await confirmDialog.alert('Błąd', error.message || 'Nie udało się sprzedać waluty');
        }
      };
    }

    actionsDiv.appendChild(buyBtn);
    actionsDiv.appendChild(sellBtn);
    row.appendChild(actionsDiv);
  }

  wrapper.appendChild(row);

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
