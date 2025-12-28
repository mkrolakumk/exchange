async function showView(view) {
  const pricesSection = document.getElementById('prices-section');
  const userSection = document.getElementById('user-section');
  const loggedIn = await auth.isLoggedIn();

  if (!loggedIn) {
    pricesSection.classList.remove('hidden');
    userSection.classList.add('hidden');
  } else {
    userSection.classList.remove('hidden');

    if (view === 'home') {
      pricesSection.classList.remove('hidden');
    } else {
      pricesSection.classList.add('hidden');
    }
  }
}
