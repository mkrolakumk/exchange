import { state } from '../state.js';

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
}) {
  console.log('Tworzenie wiersza dla:', currencyCode, isLoggedIn);
  const balance = await state.getBalance(currencyCode);
  console.log('Saldo dla użytkownika:', balance, currencyCode, balance[currencyCode]);
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

    const sellBtn = document.createElement('button');
    sellBtn.className = 'btn-sell';
    sellBtn.textContent = 'Sprzedaj';
    sellBtn.dataset.code = currencyCode;
    sellBtn.dataset.rate = priceSell;
    if (balance === 0) {
      sellBtn.disabled = true;
    }

    actionsDiv.appendChild(buyBtn);
    actionsDiv.appendChild(sellBtn);
    row.appendChild(actionsDiv);
  }

  wrapper.appendChild(row);

  return {
    element: wrapper,
    buyPriceElement: buyAmountDiv,
    sellPriceElement: sellAmountDiv,
  };
}
