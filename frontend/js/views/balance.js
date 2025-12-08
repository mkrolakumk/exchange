async function renderBalanceView(container) {
  let balance = (await auth.getBalance()) || {};
  let currenciesDB = (await currencies.get())['data'] || {};
  let preferredCurrency = 'PLN'; // TODO: Umożliwić wybór waluty przez użytkownika, automatyczne wykrywanie po geolokalizacji
  let preferredCurrencies = new Set([preferredCurrency, 'USD', 'EUR', 'PLN', 'GBP', 'CHF']);

  for (let [currency, amount] of Object.entries(balance)) {
    if (amount > 0) {
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
  const canDeposit = backendStatus.isOnline;

  let balanceHTML = '<h2 class="balance-title">Twoje Środki</h2><div class="balance-grid">';

  preferredCurrencies.forEach((currency) => {
    const amount = Number(currenciesToDisplay[currency]?.balance || 0);
    const name = currenciesToDisplay[currency]?.name || currency;
    const hasBalance = amount > 0;
    const canWithdraw = canDeposit && hasBalance;

    balanceHTML += `
      <div class="balance-card ${hasBalance ? 'has-balance' : ''}">
        <div class="balance-currency">${currency}</div>
        <div class="balance-name">${name}</div>
        <div class="balance-amount">${amount.toFixed(2)}</div>
        <div class="balance-actions">
          <button class="btn-deposit" data-currency="${currency}" ${
      !canDeposit ? 'disabled' : ''
    }>Wpłać</button>
          <button class="btn-withdraw" data-currency="${currency}" ${
      !canWithdraw ? 'disabled' : ''
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
      const amount = prompt(`Wpłać ${currency}:`);
      if (amount && !isNaN(amount) && Number(amount) > 0) {
        try {
          await depositBalance(currency, Number(amount));
          await fetchBalance();
          renderBalanceView(container);
        } catch (err) {
          alert('Błąd wpłaty: ' + err.message);
        }
      }
    });
  });

  container.querySelectorAll('.btn-withdraw').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const currency = e.target.dataset.currency;
      const amount = prompt(`Wypłać ${currency}:`);
      if (amount && !isNaN(amount) && Number(amount) > 0) {
        alert('Funkcja wypłaty w przygotowaniu');
      }
    });
  });
}
