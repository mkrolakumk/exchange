async function renderHistoryView(container) {
  let historyTrades = (await auth.getTrades()) || {};
  let currenciesDB = (await currencies.get())?.['data'] || {};
  let historyToDisplay = [];

  let errorMessage = '';
  if (Object.keys(currenciesDB).length === 0 && Object.keys(historyTrades).length > 0) {
    errorMessage =
      'Przepraszamy, nie możemy teraz wyswietlić Twojej historii transakcji. Spróbuj ponownie później.';
  } else {
    for (let trade of Object.values(historyTrades)) {
      new_obj = {
        type: trade.trade_type == 'BUY' ? 'Kupno' : 'Sprzedaż',
        currency_source_code: trade.currency_code,
        currency_code: 'PLN',
        currency_name: currenciesDB[trade.currency_code]?.['name'] || trade.currency_code,
        date: trade.timestamp,
        amount: Number(trade.amount).toFixed(2),
        rate: Number(trade.exchange_rate).toFixed(4),
        total: (Number(trade.amount) * Number(trade.exchange_rate)).toFixed(2),
      };

      historyToDisplay.push(new_obj);
    }
  }

  if (errorMessage) {
    container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h3>Błąd ładowania historii</h3>
      <p>${errorMessage}</p>
    </div>
  `;
    return;
  }

  if (historyToDisplay.length === 0) {
    container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>Brak historii</h3>
      <p>Nie masz jeszcze żadnych transakcji</p>
      <button class="btn-primary" onclick="currentView='home'; render();">
        Zacznij wymieniać waluty, to takie proste!
      </button>
    </div>
  `;
    return;
  }

  historyToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentTrades = historyToDisplay.slice(0, 30);

  let historyHTML = '<h2 class="balance-title">Twoje wymiany</h2>';
  historyHTML += '<div class="history-list">';

  recentTrades.forEach((trade) => {
    const date = new Date(trade.date);
    const formattedDate = date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isBuy = trade.type === 'Kupno';
    const fromCurrency = isBuy ? 'PLN' : trade.currency_source_code;
    const toCurrency = isBuy ? trade.currency_source_code : 'PLN';
    const fromAmount = isBuy ? trade.total : trade.amount;
    const toAmount = isBuy ? trade.amount : trade.total;
    const pairDescription = isBuy
      ? `${trade.currency_source_code}/PLN - ${trade.currency_name} / Polski Złoty`
      : `${trade.currency_source_code}/PLN - ${trade.currency_name} / Polski Złoty`;

    historyHTML += `
      <div class="history-item">
        <div class="history-type ${isBuy ? 'buy' : 'sell'}">
          ${trade.type}
        </div>
        <div class="history-exchange">
          <div class="history-from">
            <span class="history-amount">${fromAmount}</span>
            <span class="history-currency">${fromCurrency}</span>
          </div>
          <div class="history-arrow">→</div>
          <div class="history-to">
            <span class="history-amount">${toAmount}</span>
            <span class="history-currency">${toCurrency}</span>
          </div>
        </div>
        <div class="history-info">
          <div class="history-name">${pairDescription}</div>
          <div class="history-rate">1 ${trade.currency_source_code} = ${trade.rate} PLN</div>
        </div>
        <div class="history-date">${formattedDate}</div>
      </div>
    `;
  });

  historyHTML += '</div>';
  container.innerHTML = historyHTML;
}
