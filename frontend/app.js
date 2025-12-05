if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

const API_BASE = 'http://localhost:8000'; // Lokalny adres backendu

async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE}/status`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function updateStatus() {
    const isOnline = await checkBackendHealth();
    document.body.classList.toggle('offline', !isOnline);
    document.getElementById('status').textContent = "Status Kantoru: " + (isOnline ? 'Online' : 'Offline');
}

updateStatus();
setInterval(updateStatus, 10000);