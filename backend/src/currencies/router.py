from fastapi import APIRouter, HTTPException, Query, Depends
from src.currencies.models import Currency, Price
from typing import List
from src.currencies.utils import get_all_currencies, get_list_of_currency_prices, fetch_historical_rates
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import pg_db

currency_router = APIRouter(prefix="/currencies", tags=["currencies"])


@currency_router.get("/", response_model=dict[str, Currency])
async def get_currencies(session: AsyncSession = Depends(pg_db.get_session)) -> List[Currency]:
    """Funkcja pobiera listę walut z bazy danych."""
    currencies = await get_all_currencies(session=session)
    if not currencies:
        raise HTTPException(
            status_code=503, detail="Nie udało się pobrać listy walut.")
    return currencies


@currency_router.get("/prices", response_model=List[Price])
async def get_currency_prices() -> List[Price]:
    """Funkcja pobiera aktualne ceny walut."""
    prices = await get_list_of_currency_prices()
    if not prices:
        raise HTTPException(
            status_code=503, detail="Nie udało się pobrać listy cen walut.")
    return prices


@currency_router.get("/history/{currency_code}", response_model=List[Price])
async def get_currency_history(
        currency_code: str,
        n: int = Query(default=10, ge=1, le=255,
                       description="Liczba ostatnich notowań do pobrania (1-255)")
) -> List[Price]:
    """
    Funkcja pobiera N ostatnich kursów historycznych dla danej waluty.

    Args:
            currency_code: Kod waluty (np. USD, EUR, GBP)
            n: Liczba ostatnich notowań do pobrania (domyślnie 10, maksymalnie 366)

    Returns:
            Lista obiektów Price z historycznymi kursami
    """
    currency_code = currency_code.upper()

    try:
        historical_prices = await fetch_historical_rates(currency_code, n)
        return historical_prices
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Nie udało się pobrać historycznych kursów dla waluty {currency_code}"
        )
