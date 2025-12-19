export function setupMenu(onStateChange) {
  const menuBtn = document.getElementById("menu-btn");
  const dropdown = document.getElementById("menu-dropdown");
  const overlay = document.getElementById("menu-overlay");
  const loginBtn = document.getElementById("menu-login");
  const registerBtn = document.getElementById("menu-register");
  const logoutBtn = document.getElementById("menu-logout");

  if (!menuBtn || !dropdown || !overlay) return;

  const toggleMenu = () => {
    dropdown.classList.toggle("hidden");
    overlay.classList.toggle("hidden");
    menuBtn.classList.toggle("active");
  };

  const closeMenu = () => {
    dropdown.classList.add("hidden");
    overlay.classList.add("hidden");
    menuBtn.classList.remove("active");
  };

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  overlay.addEventListener("click", closeMenu);

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
      onStateChange("showLogin");
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
      onStateChange("showRegister");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
      onStateChange("logout");
    });
  }
}

export function updateMenuState(isLoggedIn) {
  const loginBtn = document.getElementById("menu-login");
  const registerBtn = document.getElementById("menu-register");
  const logoutBtn = document.getElementById("menu-logout");

  if (!loginBtn || !registerBtn || !logoutBtn) return;

  if (isLoggedIn) {
    loginBtn.classList.add("hidden");
    registerBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    loginBtn.classList.remove("hidden");
    registerBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}
