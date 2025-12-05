FROM python:3.13-slim

# Aktualizacja listy pakietów i zależności systemowych
RUN apt-get update && apt-get install -y \
    build-essential \ 
    libpq-dev \ 
    && rm -rf /var/lib/apt/lists/* 

# Instalacja managera zależności 'uv'
RUN pip install uv

# Ustawienia katalogu roboczego
WORKDIR /app

# Kopia wymaganych plików z zależnościami aplikacji
COPY pyproject.toml .
COPY uv.lock .

# Instalacja zależności aplikacji w wirtualnym środowisku + instalacja produkcyjnego serwera aplikacji gunicorn
RUN uv sync
RUN uv add gunicorn

# Kopiowanie kodu źródłowego aplikacji
COPY src/ ./src/

# Ustawienie zmiennej środowiskowej PATH aby użyć pakietów z .venv (jest w /app/.venv)
ENV PATH="/app/.venv/bin:$PATH"

# Uruchomienie aplikacji za pomocą gunicorna i uvicorn jako worker
# Uruchomienie z katalogu /app, więc moduł to src.app:app
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "src.app:app", "--bind", "0.0.0.0:8000", "--workers", "4"]