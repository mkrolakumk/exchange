async function renderHomeView(container) {
  const user = await auth.getUser();
  container.innerHTML = `
    <div class="card">
      <h2>Witaj, ${user?.first_name || 'Użytkowniku'}!</h2>
      <p>Sprawdź aktualne kursy walut i dokonaj wymiany.</p>
    </div>
  `;
}
