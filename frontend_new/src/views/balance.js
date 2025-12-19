import { state } from '../state.js';
import { createConfirmDialog } from '../components/confirm.js';
import {
  fetchCurrencies,
  fetchBalance as apiFetchBalance,
  depositBalance as apiDepositBalance,
  withdrawBalance as apiWithdrawBalance,
} from '../utils/api.js';

export function createBalanceView() {
  let container = null;
  let abortController = null;
  let eventListeners = [];
  const confirmDialog = createConfirmDialog();

  async function init() {
    container = document.getElementById('app');
    abortController = new AbortController();

    const isLoggedIn = await state.isLoggedIn();
    if (!isLoggedIn) {
      renderUnauthorized();
      return;
    }
  }

  async function render() {
    clearContainer();
    clearEventListeners();

    try {
      const token = await state.getToken();
      const [balanceData, currenciesData] = await Promise.all([
        apiFetchBalance(token),
        fetchCurrencies(),
      ]);

      const currencies = prepareDisplayCurrencies(balanceData, currenciesData);
      renderBalanceView(currencies, balanceData);
    } catch (error) {
      console.error('Błąd ładowania danych:', error);
      renderError('Nie udało się załadować danych. Spróbuj ponownie później.');
    }
  }

  function destroy() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    clearEventListeners();
    clearContainer();
  }

  function prepareDisplayCurrencies(balanceData, currenciesData) {
    const preferredCurrency = 'PLN'; // będzie z geolokalizacji
    const preferredSet = new Set([preferredCurrency, 'USD', 'EUR', 'GBP', 'CHF']);

    Object.entries(balanceData).forEach(([code, data]) => {
      if (data.balance > 0) {
        preferredSet.add(code);
      }
    });

    const result = [];
    preferredSet.forEach((code) => {
      const balance = balanceData[code]?.balance || 0;
      const currencyInfo = currenciesData[code];

      if (currencyInfo) {
        result.push({
          code,
          name: currencyInfo.name,
          balance: Number(balance),
          hasBalance: balance > 0,
        });
      }
    });

    return result;
  }

  function validateAmount(amountStr) {
    if (!amountStr) {
      return { valid: false, message: 'Kwota jest wymagana' };
    }

    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return { valid: false, message: 'Kwota musi być większa od 0' };
    }

    if (amount > 100000) {
      return { valid: false, message: 'Kwota nie może przekraczać 100 000' };
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) {
      return { valid: false, message: 'Maksymalnie 2 miejsca po przecinku' };
    }

    return { valid: true, value: amount };
  }

  function validateBankAccount(account) {
    if (!account) {
      return { valid: false, message: 'Numer konta jest wymagany' };
    }

    if (!/^\d{26}$/.test(account)) {
      return {
        valid: false,
        message: 'Numer konta musi mieć dokładnie 26 cyfr',
      };
    }

    return { valid: true };
  }

  async function handleDeposit(currency) {
    const amountStr = await confirmDialog.prompt(
      `Wpłać ${currency}`,
      `Wprowadź kwotę do wpłaty (max 100 000 ${currency})`,
      {
        inputType: 'number',
        placeholder: '0.00',
        step: '0.01',
        min: '0.01',
        max: '100000',
        validator: validateAmount,
      }
    );

    if (amountStr === null) return;

    try {
      const token = await state.getToken();
      await apiDepositBalance(token, currency, amountStr);
      await confirmDialog.alert('Sukces', `Wpłacono ${amountStr} ${currency}`);
      await render();
    } catch (error) {
      console.error('Błąd wpłaty:', error);
      await confirmDialog.alert('Błąd', error.message || 'Nie udało się wykonać wpłaty');
    }
  }

  async function handleWithdraw(currency, currentBalance) {
    const amountStr = await confirmDialog.prompt(
      `Wypłać ${currency}`,
      `Masz: ${currentBalance.toFixed(2)} ${currency}. Wprowadź kwotę do wypłaty:`,
      {
        inputType: 'number',
        placeholder: '0.00',
        step: '0.01',
        min: '0.01',
        max: currentBalance.toString(),
        validator: (val) => {
          const amountValidation = validateAmount(val);
          if (!amountValidation.valid) return amountValidation;

          if (amountValidation.value > currentBalance) {
            return {
              valid: false,
              message: `Niewystarczające środki (masz: ${currentBalance.toFixed(2)})`,
            };
          }

          return { valid: true, value: amountValidation.value };
        },
      }
    );

    if (amountStr === null) return;

    const bankAccount = await confirmDialog.prompt(
      'Numer konta',
      'Podaj numer konta do wypłaty (26 cyfr):',
      {
        inputType: 'text',
        placeholder: '00000000000000000000000000',
        maxLength: 26,
        pattern: '[0-9]{26}',
        validator: validateBankAccount,
      }
    );

    if (bankAccount === null) return;

    try {
      const token = await state.getToken();
      await apiWithdrawBalance(token, currency, amountStr, bankAccount);
      await confirmDialog.alert('Sukces', `Wypłacono ${amountStr} ${currency}`);
      await render();
    } catch (error) {
      console.error('Błąd wypłaty:', error);
      await confirmDialog.alert('Błąd', error.message || 'Nie udało się wykonać wypłaty');
    }
  }

  function createBalanceCard(currency) {
    const card = document.createElement('div');
    card.className = `balance-card${currency.hasBalance ? ' has-balance' : ''}`;

    const codeEl = document.createElement('div');
    codeEl.className = 'balance-currency';
    codeEl.textContent = currency.code;

    const nameEl = document.createElement('div');
    nameEl.className = 'balance-name';
    nameEl.textContent = currency.name;

    const amountEl = document.createElement('div');
    amountEl.className = 'balance-amount';
    amountEl.textContent = currency.balance.toFixed(2);

    const actionsEl = document.createElement('div');
    actionsEl.className = 'balance-actions';

    const depositBtn = document.createElement('button');
    depositBtn.className = 'btn-deposit';
    depositBtn.textContent = 'Wpłać';
    depositBtn.type = 'button';

    const withdrawBtn = document.createElement('button');
    withdrawBtn.className = 'btn-withdraw';
    withdrawBtn.textContent = 'Wypłać';
    withdrawBtn.type = 'button';
    withdrawBtn.disabled = !currency.hasBalance;

    const depositHandler = () => handleDeposit(currency.code);
    const withdrawHandler = () => handleWithdraw(currency.code, currency.balance);

    depositBtn.addEventListener('click', depositHandler);
    withdrawBtn.addEventListener('click', withdrawHandler);

    eventListeners.push(
      { element: depositBtn, event: 'click', handler: depositHandler },
      { element: withdrawBtn, event: 'click', handler: withdrawHandler }
    );

    actionsEl.appendChild(depositBtn);
    actionsEl.appendChild(withdrawBtn);

    card.appendChild(codeEl);
    card.appendChild(nameEl);
    card.appendChild(amountEl);
    card.appendChild(actionsEl);

    return card;
  }

  function renderBalanceView(currencies, balanceData) {
    const title = document.createElement('h2');
    title.className = 'balance-title';
    title.textContent = 'Twoje Środki';

    const grid = document.createElement('div');
    grid.className = 'balance-grid';

    currencies.forEach((currency) => {
      const card = createBalanceCard(currency);
      grid.appendChild(card);
    });

    container.appendChild(title);
    container.appendChild(grid);
  }

  function renderUnauthorized() {
    const message = document.createElement('div');
    message.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '🔒';

    const title = document.createElement('h3');
    title.textContent = 'Dostęp wymagany';

    const description = document.createElement('p');
    description.textContent = 'Zaloguj się, aby zobaczyć swoje środki.';

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

  function clearContainer() {
    if (container) {
      container.textContent = '';
    }
  }

  function clearEventListeners() {
    eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    eventListeners = [];
  }

  return {
    init,
    render,
    destroy,
  };
}
