async function renderBalanceView(container) {
  let balance = (await auth.getBalance()) || {};
  let currenciesDB = (await currencies.get())['data'] || {};
  let preferredCurrency = await geolocation.getPreferredCurrency();
  let preferredCurrencies = new Set([preferredCurrency, 'USD', 'EUR', 'PLN', 'GBP', 'CHF']);

  for (let [currency, data] of Object.entries(balance)) {
    console.log(`Sprawdzanie salda waluty: ${currency}, balance: ${data.balance}`);
    if (data.balance > 0) {
      console.log(`Dodano do widoku salda walutę z saldem: ${currency} (${data.balance})`);
      preferredCurrencies.add(currency);
    }
  }

  let currenciesToDisplay = {};
  preferredCurrencies.forEach((currency) => {
    if (balance && balance[currency]) {
      currenciesToDisplay[currency] = balance[currency];
      currenciesToDisplay[currency].name = currenciesDB[currency]['name'];
    }
  });

  const backendStatus = await backend.getStatus();
  const isOnline = backendStatus.isOnline;
  const pendingCount = await operationsQueue.count();

  let balanceHTML = '<h2 class="balance-title">Twoje Środki</h2>';

  if (pendingCount > 0) {
    balanceHTML += `<div class="warning">⏳ Masz ${pendingCount} oczekującą operację${
      pendingCount > 1 ? ' operacji' : ''
    }</div>`;
  }

  balanceHTML += '<div class="balance-grid">';

  preferredCurrencies.forEach((currency) => {
    const amount = Number(currenciesToDisplay[currency]?.balance || 0);
    const name = currenciesToDisplay[currency]?.name || currency;
    const hasBalance = amount > 0;

    balanceHTML += `
      <div class="balance-card ${hasBalance ? 'has-balance' : ''}">
        <div class="balance-currency">${currency}</div>
        <div class="balance-name">${name}</div>
        <div class="balance-amount">${amount.toFixed(2)}</div>
        <div class="balance-actions">
          <button class="btn-deposit" data-currency="${currency}">Wpłać</button>
          <button class="btn-withdraw" data-currency="${currency}" ${
      !hasBalance ? 'disabled' : ''
    }>Wypłać</button>
        </div>
      </div>
    `;
  });

  balanceHTML += '</div>';
  container.innerHTML = balanceHTML;

  container.querySelectorAll('.btn-deposit').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const currency = e.target.dataset.currency;
      await handleDeposit(currency, container, isOnline);
    });
  });

  container.querySelectorAll('.btn-withdraw').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const currency = e.target.dataset.currency;
      const currentBalance = Number(currenciesToDisplay[currency]?.balance || 0);
      await handleWithdraw(currency, currentBalance, container, isOnline);
    });
  });
}

async function handleDeposit(currency, container, isOnline) {
  const amountStr = prompt(`Wpłać ${currency}:\n(Max 100 000 ${currency})`);
  if (!amountStr) return;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0 || amount > 100000) {
    alert('Kwota musi być między 0.01 a 100 000');
    return;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) {
    alert('Podaj wartość z maksymalnie 2 miejscami po przecinku');
    return;
  }

  if (!isOnline) {
    const proceed = confirm('Brak połączenia z serwisem. Zakolejkować operację?');
    if (!proceed) return;
    await operationsQueue.add('deposit', currency, amount);
    alert('Operacja zakolejkowana');
    renderBalanceView(container);
    return;
  }

  try {
    await depositBalance(currency, amount);
    await fetchBalance();
    renderBalanceView(container);
  } catch (err) {
    const retry = confirm('Błąd połączenia z serwisem. Zakolejkować operację?');
    if (retry) {
      await operationsQueue.add('deposit', currency, amount);
      alert('Operacja zakolejkowana');
      renderBalanceView(container);
    }
  }
}

async function handleWithdraw(currency, currentBalance, container, isOnline) {
  const amountStr = prompt(
    `Wypłać ${currency}:\n(Max ${currentBalance.toFixed(2)}, 2 miejsca po przecinku)`
  );
  if (!amountStr) return;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0 || amount > currentBalance || amount > 100000) {
    alert(`Kwota musi być między 0.01 a ${Math.min(currentBalance, 100000).toFixed(2)}`);
    return;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) {
    alert('Podaj wartość z maksymalnie 2 miejscami po przecinku');
    return;
  }

  const bankAccount = prompt('Podaj numer konta do wypłaty (26 cyfr):');
  if (!bankAccount) return;

  if (!/^\d{26}$/.test(bankAccount)) {
    alert('Numer konta musi mieć dokładnie 26 cyfr');
    return;
  }

  if (!isOnline) {
    const proceed = confirm('Brak połączenia z serwisem. Zakolejkować operację?');
    if (!proceed) return;
    await operationsQueue.add('withdraw', currency, amount, bankAccount);
    alert('Operacja zakolejkowana');
    renderBalanceView(container);
    return;
  }

  try {
    await withdrawBalance(currency, amount, bankAccount);
    await fetchBalance();
    renderBalanceView(container);
  } catch (err) {
    console.error('Brak połączenia z backendem: ', err);
    const retry = confirm('Brak połączenia z serwisem. Zakolejkować operację?');
    if (retry) {
      await operationsQueue.add('withdraw', currency, amount, bankAccount);
      alert('Operacja zakolejkowana');
      renderBalanceView(container);
    }
  }
}
