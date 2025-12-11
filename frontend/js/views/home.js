async function renderHomeView(container) {
  const user = await auth.getUser();

  const currencyChange = await geolocation.checkAndNotifyCurrencyChange();
  let notification = '';
  if (currencyChange) {
    const msg = currencyChange.isFirst
      ? `Ustawiliśmy Twoją domyślną walutę na ${currencyChange.currency} (${currencyChange.currencyName})`
      : `Wykryliśmy zmianę lokalizacji. Twoja domyślna waluta to teraz ${currencyChange.currency} (${currencyChange.currencyName}). Życzymy udanych wymian!`;
    notification = `<div class="info-banner">✔️ ${msg}</div>`;
  }

  container.innerHTML = `
    ${notification}
    <div class="card">
      <h2>Witaj, ${user?.first_name || 'Użytkowniku'}!</h2>
      <p>Sprawdź aktualne kursy walut i dokonaj wymiany.</p>
    </div>
  `;
}
