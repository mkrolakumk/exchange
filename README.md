# Kantor Internetowy

Aplikacja webowa do wymiany walut z integracją z API Narodowego Banku Polskiego.  Projekt zbudowany jako Progressive Web App (PWA) z możliwością pracy offline.

## Technologie

Projekt składa się z trzech głównych komponentów:

### Backend
- **Python3.13** - język skryptowy, dynamicznie typowany, zorientowany pod programowanie obiektowe
- **FastAPI** - framework sieciowy, wspierający programowanie asynchroniczne  
- **PostgreSQL** - baza danych
- **SQLModel** - framework ORM do obsługi bazy danych
- **asyncpg** - asynchroniczny sterownik silnika PostgreSQL
- **aiohttp** - klient HTTP do komunikacji z NBP API

### Frontend
- **Vanilla JavaScript** - Czysty JavaScript, bez dodatkowych frameworków
- **WebManifest + Service Workers** - umożliwiają napisanie pełnoprawną aplikację webową/mobilną PWA, w tym np. strategie cache'owania, obsługę trybu offline
- **IndexedDB** - asynchroniczna lokalna baza danych, wspierana przez nowoczesne przeglądarki oraz urządzenia mobilne

### Infrastruktura
- **AWS CDK** - Narzędzie AWS (Cloud Development Kit) pozwalające zdefiniować infrastrukturę systemu w postaci kodu Pythona 
- **ECS Fargate** - usługa AWS (Amazon Elastic Container Service) umożliwiająca deploy kontenerów w chmurze
- **RDS PostgreSQL** - usługa AWS (Amazon Relational Database Service) pozwalajaca na zarządzanie relacyjnymi bazami danych w chmurze
- **Application Load Balancer** - usługa AWS rozdzielająca ruch sieciowy pomiędzy komponentami infrastruktury
- **CloudFront** - usługa AWS (Amazon Content Delivery Network) pozwalająca na serwowanie plików statycznych jak również wygenerowanie certyfikatu SSL
- **ECR** - usługa AWS (Amazon Elastic Container Registry) pełniąca funkcję repozytorium obrazów Docker w chmurze AWS

## Architektura

```
┌─────────────────┐
│   CloudFront    │  (CDN + SSL)
└────────┬────────┘
         │
┌────────▼────────┐
│      ALB        │  (Load Balancer)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ ECS  │  │ ECS  │
│Front │  │ Back │
└──────┘  └───┬──┘
              │
         ┌────▼────┐
         │   RDS   │
         │Postgres │
         └─────────┘
```

## Funkcjonalności

- Rejestracja i logowanie użytkowników, zarządzanie sesją z wykorzystaniem ciasteczek sesyjnych i tokena JWT
- Przegląd aktualnych kursów walut (dane z NBP API)
- Historia kursów walut z wykresami
- Wymiana walut (w oparciu o kurs względem PLN)
- Zarządzanie saldem w różnych walutach
- Geolokalizacja i automatyczne wykrywanie waluty lokalnej (z wykorzystaniem API OpenStreetMap)
- Tryb offline z kolejką synchronizacji (wypłata waluty)
- Powiadomienia o zmianach kursów 
- Możliwość korzystania z Kantoru w postaci przeglądania strony WWW
- Możliwość korzystania z Kantoru w postaci instalowalnej aplikacji mobilnej PWA (również na Desktopach), możliwość instalacji aplikacji z poziomu pakietu *.APK 


## Dokumentacja techniczna

Bardziej szczegółowa dokumentacja techniczna znajduje się w folderze `docs/`:

- **[TECHNICAL_README.md](docs/TECHNICAL_README.md)** - instrukcja uruchomienia i deployment

