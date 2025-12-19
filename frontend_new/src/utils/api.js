const API_BASE = "http://localhost:8000";

export async function registerUser(email, password, firstName, lastName) {
  const response = await fetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Błąd rejestracji");
  }
  consolee.log("Użytkownik zarejestrowany pomyślnie!");
  return response.json();
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.ok) throw new Error("Błędne dane logowania");
  console.log("Użytkownik zalogowany pomyślnie!");
  return response.json();
}

export async function getUserMe(token) {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Błąd pobierania danych użytkownika");
  console.log("Dane użytkownika pobrane pomyślnie!");
  return response.json();
}
export async function fetchCurrencies() {
  const response = await fetch(`${API_BASE}/currencies/`);
  if (!response.ok) throw new Error("Nie udało się pobrać walut");
  console.log("Waluty pobrane pomyślnie!");
  return response.json();
}

export async function fetchPrices() {
  const response = await fetch(`${API_BASE}/currencies/prices`);
  if (!response.ok) throw new Error("Nie udało się pobrać cen");
  console.log("Ceny walut pobrane pomyślnie!");
  return response.json();
}

export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    console.log("Status backendu sprawdzony pomyślnie!");
    return response.ok;
  } catch (error) {
    console.log("Błąd podczas sprawdzania statusu backendu:", error);
    return false;
  }
}
