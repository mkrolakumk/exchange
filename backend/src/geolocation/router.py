from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiohttp
import logging

logger = logging.getLogger(__name__)

geolocation_router = APIRouter(prefix="/geolocation", tags=["geolocation"])

COUNTRY_CODE_TO_CURRENCY = {
    "PL": "PLN",
    "US": "USD",
    "GB": "GBP",
    "DE": "EUR",
    "FR": "EUR",
    "IT": "EUR",
    "ES": "EUR",
    "NL": "EUR",
    "BE": "EUR",
    "AT": "EUR",
    "PT": "EUR",
    "IE": "EUR",
    "FI": "EUR",
    "GR": "EUR",
    "SK": "EUR",
    "SI": "EUR",
    "LT": "EUR",
    "LV": "EUR",
    "EE": "EUR",
    "LU": "EUR",
    "MT": "EUR",
    "CY": "EUR",
    "CH": "CHF",
    "JP": "JPY",
    "CN": "CNY",
    "AU": "AUD",
    "CA": "CAD",
    "SE": "SEK",
    "NO": "NOK",
    "DK": "DKK",
    "CZ": "CZK",
    "HU": "HUF",
    "RO": "RON",
    "BG": "BGN",
    "HR": "EUR",
    "RU": "RUB",
    "UA": "UAH",
    "TR": "TRY",
    "IN": "INR",
    "BR": "BRL",
    "MX": "MXN",
    "AR": "ARS",
    "ZA": "ZAR",
    "KR": "KRW",
    "SG": "SGD",
    "HK": "HKD",
    "NZ": "NZD",
    "TH": "THB",
    "MY": "MYR",
    "ID": "IDR",
    "PH": "PHP",
    "VN": "VND",
    "IL": "ILS",
    "AE": "AED",
    "SA": "SAR",
    "CL": "CLP",
    "CO": "COP",
    "PE": "PEN",
}


class GeolocationRequest(BaseModel):
    latitude: float
    longitude: float


class GeolocationResponse(BaseModel):
    currency: str


@geolocation_router.post("/detect-currency", response_model=GeolocationResponse)
async def detect_currency(request: GeolocationRequest):
    try:
        if not (-90 <= request.latitude <= 90):
            raise HTTPException(
                status_code=400, detail="Nieprawidłowa szerokość geograficzna")
        if not (-180 <= request.longitude <= 180):
            raise HTTPException(
                status_code=400, detail="Nieprawidłowa długość geograficzna")

        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": request.latitude,
            "lon": request.longitude,
            "format": "json",
            "addressdetails": 1,
        }
        headers = {
            "User-Agent": "ExchangeApp/1.0"  # Wymagane przez OSM
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status != 200:
                    logger.warning(
                        f"OSM API zwróciło status {response.status}")
                    return GeolocationResponse(currency="PLN")

                data = await response.json()

                country_code = data.get("address", {}).get("country_code")

                if not country_code:
                    logger.warning("Nie udało się wykryć kodu kraju z OSM")
                    return GeolocationResponse(currency="PLN")

                country_code_upper = country_code.upper()
                currency = COUNTRY_CODE_TO_CURRENCY.get(
                    country_code_upper, "PLN")
                logger.info(
                    f"Wykryto kod kraju: {country_code_upper}, waluta: {currency}")

                return GeolocationResponse(currency=currency)

    except aiohttp.ClientError as e:
        logger.error(f"Błąd komunikacji z OSM API: {e}")
        return GeolocationResponse(currency="PLN")
    except Exception as e:
        logger.error(f"Nieoczekiwany błąd podczas wykrywania waluty: {e}")
        return GeolocationResponse(currency="PLN")
