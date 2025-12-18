const API_BASE = "http://localhost:8000";

export async function fetchCurrencies() {
  const response = await fetch(`${API_BASE}/currencies/`);
  if (!response.ok) throw new Error("Nie udało się pobrać walut");
  return response.json();
}

export async function fetchPrices() {
  const response = await fetch(`${API_BASE}/currencies/prices`);
  if (!response.ok) throw new Error("Nie udało się pobrać cen");
  return response.json();
}

export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
