# Dokumentacja Techniczna - Kantor Internetowy

Ten dokument zawiera informacje jak uruchomić projekt lokalnie oraz jak wdrożyć go na AWS.

## Spis treści

- [Wymagania](#wymagania)
- [Uruchomienie lokalne](#uruchomienie-lokalne)
- [Deployment na AWS](#deployment-na-aws)
- [Zmienne środowiskowe](#zmienne-środowiskowe)

## Wymagania

### Lokalny development
- Docker i Docker Compose
- Plik `.env` z konfiguracją (szablon: `.env.example`)

### Deployment na AWS
- Konto AWS z uprawnieniami administratora
- Repozytorium GitHub wraz ze skonfigurowanymi Secretami

## Uruchomienie lokalne

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/mkrolakumk/exchange.git
cd exchange
```

### 2. Konfiguracja zmiennych środowiskowych

Skopiuj plik `.env.example` i dostosuj wartości:

```bash
cp .env.example .env
```

Domyślna konfiguracja w `.env`:

```dotenv
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres

# Porty
DB_PORT=5432
BACKEND_PORT=8000
FRONTEND_PORT=8001

# Backend Database Connection
DB__HOST=postgres
DB__PORT=5432
DB__USER=postgres
DB__PASSWORD=postgres
DB__DATABASE=postgres

# JWT Tokens
TOKEN__SECRET_KEY=sekretny_klucz
TOKEN__ALGORITHM=HS256
TOKEN__ACCESS_TOKEN_EXPIRE_MINUTES=2880

# API NBP - nie podlega zmianie, wykesportowany celem uniknięcia hardcodowania zmiennych
CURRENCY_API__ADDRESS=https://api.nbp.pl/api/

# Routing (dla AWS, lokalnie puste)
API_ROOT_PATH=
API_URL=/api
```

### 3. Uruchomienie aplikacji

Z głównego folderu projektu:

```bash
docker compose up -d --build
```

Przy domyślnych wartościach zmiennych środowiskowych Kantor Internetowy będzie dostępny pod adresami:
- Frontend: http://localhost:8001
- Backend API: http://localhost:8000
- Backend API Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### 4. Zatrzymanie aplikacji

```bash
docker compose down
```

Aby usunąć również dane z bazy (wolumenów):

```bash
docker compose down -v
```

## Deployment na AWS

Deployment odbywa się automatycznie poprzez wykorzystanie zadań zdefiniowanych w GitHub Workflows. Wdrożenie aplikacji odbywa się poprzez wykorzystanie sekcji Github Actions .

### Konfiguracja GitHub Secrets

W ustawieniach repozytorium GitHub (`Settings` → `Secrets and variables` → `Actions`) należy ustawić następujące sekrety:

| Secret | Opis |
|--------|------|
| `AWS_ACCESS_KEY_ID` | Access Key ID użytkownika AWS z uprawnieniami administratora |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key użytkownika AWS |
| `AWS_ACCOUNT_ID` | 12-cyfrowy numer konta AWS (np. 123456789012) |

### Workflow deployment

Projekt zawiera trzy workflow GitHub Actions:

#### 1. `deploy-full.yml` - Pełny deployment

Pełny deployment aplikacji na AWS:

```yaml
# Uruchomienie: z zakładki Github Actions
```

**Działanie:**
1. Sprawdzanie czy infrastruktura już istnieje
2. Jeśli nie - tworzy całą infrastrukturę CDK (VPC, RDS, ECS, ALB, CloudFront)
3. Budowa obrazów dla backendu i frontendu
4. Wypchnięcie zbudowanych obrazów do AWS ECR
5. Uruchomienie serwisów ECS z nowymi obrazami
6. Stabilizacja deploymentu
7. Ważnym artefaktem tego procesu jest adres IP przydzielony przez AWS, pod którym będzie dostępny serwis Kantoru Internetowego. Posłuży on również do budowy aplikacji APK.

#### 2. `build-apk.yml` - Build aplikacji Android

Buduje plik APK z aplikacji PWA:

```yaml
# Uruchomienie: z zakładki Github Actions
# Wymagany parametr: backend_url (adres API backendu)
```

**Kiedy uruchomić:**
- Po wykonaniu `deploy-full.yml` i uzyskaniu URL CloudFront
- Gdy zaistnieje potrzeba wygenerowania aplikacji mobilnej w postaci pakietu *.APK

**Co trzeba podać:**
- `backend_url` - pełny URL do API backendu (np. `https://<cloudfront-domain>/api`)
- URL można znaleźć w logach workflow `deploy-full.yml` po wdrożeniu na AWS

**Efekt:**
- Wygenerowany plik APK dostępny w artefaktach workflow (zakładka Actions → ID job run (ID zadan) → Artifacts → `kantor-apk`)

#### 3. `destroy-all.yml` - Usunięcie infrastruktury

Usuwa całą infrastrukturę AWS:

```yaml
# Uruchomienie: z zakładki Github Actions
# UWAGA: Nieodwracalne usunięcie całej infrastruktury!
```

### Proces deployment krok po kroku

1. **Fork/clone repozytorium** do swojego konta GitHub

2. **Dodaj secrets** w GitHub (opisane powyżej)

3. **Uruchom workflow `deploy-full.yml`:**
   - Przejdź do zakładki `Actions`
   - Wybierz workflow `Deploy Full`
   - Kliknij `Run workflow`
   - Poczekaj 15-20 minut

4. **Po zakończeniu deployment:**
   - W logach workflow znajdziesz URL CloudFront
   - Aplikacja dostępna pod: `https://<cloudfront-domain>`
   - Backend API: `https://<cloudfront-domain>/api`

### Aktualizacja istniejącej aplikacji

Jeśli infrastruktura już istnieje, workflow automatycznie:
- Zbuduje nowe obrazy Docker
- Wypchnie je do ECR
- Zrestartuje serwisy ECS
- Nie zmienia infrastruktury (szybsze ~5-10 minut)

## Zmienne środowiskowe

### Zmienne lokalne (`.env`)

#### Baza danych PostgreSQL
- `POSTGRES_USER` - nazwa użytkownika PostgreSQL (domyślnie: postgres)
- `POSTGRES_PASSWORD` - hasło do PostgreSQL
- `POSTGRES_DB` - nazwa bazy danych

#### Porty
- `DB_PORT` - port PostgreSQL na hoście (domyślnie: 5432)
- `BACKEND_PORT` - port backendu (nieużywany w compose,backend jest internal)
- `FRONTEND_PORT` - port frontendu na hoście (domyślnie: 8001)

#### Połączenie backendu z bazą
- `DB__HOST` - host bazy danych (nazwa serwisu w Docker Compose)
- `DB__PORT` - port bazy danych wewnątrz sieci Docker
- `DB__USER` - użytkownik do połączenia z bazą
- `DB__PASSWORD` - hasło do bazy
- `DB__DATABASE` - nazwa bazy danych

#### Autentykacja JWT
- `TOKEN__SECRET_KEY` - klucz do podpisywania tokenów JWT (zmień na produkcji!)
- `TOKEN__ALGORITHM` - algorytm szyfrowania (HS256)
- `TOKEN__ACCESS_TOKEN_EXPIRE_MINUTES` - czas ważności tokenu w minutach

#### API zewnętrzne
- `CURRENCY_API__ADDRESS` - adres API NBP do pobierania kursów walut

#### Routing (dla AWS)
- `API_ROOT_PATH` - prefix ścieżki API (dla AWS ALB routing, lokalnie puste)
- `API_URL` - URL do backendu (dla frontendu)

### Zmienne w AWS

W deploymencie AWS zmienne są ustawiane w dwóch miejscach:

1. **Secrets Manager** - wrażliwe dane (hasła do bazy)
2. **ECS Task Definition** - pozostałe zmienne środowiskowe

Konfiguracja znajduje się w `infra/stacks/compute_stack.py`.

