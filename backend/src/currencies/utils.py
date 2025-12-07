import asyncio
import aiohttp
from src.config import config
from src.currencies.models import Currency, Price
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from fastapi import HTTPException, Depends
from typing import List
from src.db import pg_db
import random
from datetime import datetime

base_url = f"{config.currency_api.address}/exchangerates/"
percent_margin: float = 0.01  # 1% marża


def simulate_currency_fluctuation_from_mid(base_price: float) -> tuple[float, float]:
    """Symuluje wahania cen walut. Zapewnia to, że ceny kupna i sprzedaży różnią się od ceny średniej oraz są niezerowe."""
    fluctuation = random.uniform(-0.005, 0.005) * base_price
    adjusted_mid = base_price + fluctuation

    if base_price < 0.001:
        decimal_places = 8
    else:
        decimal_places = 4

    buy_price = round(adjusted_mid * (1 - percent_margin), decimal_places)
    sell_price = round(adjusted_mid * (1 + percent_margin), decimal_places)

    buy_price = max(buy_price, 0.00000001)
    sell_price = max(sell_price, 0.00000001)

    return buy_price, sell_price


def simulate_currency_fluctuation_from_bid_ask(bid: float, ask: float) -> tuple[float, float]:
    """Symuluje wahania cen walut na podstawie cen bid i ask."""
    mid_price = (bid + ask) / 2
    return simulate_currency_fluctuation_from_mid(mid_price)


async def fetch_raw_currencies_from_api() -> List[dict]:
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
        tasks = []
        for table in ['A', 'B', 'C']:
            url = f"{base_url}tables/{table}/?format=json"
            tasks.append(session.get(url))
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        results = [response.json() if not isinstance(
            response, Exception) else None for response in responses]
        results = await asyncio.gather(*results, return_exceptions=True)

        rates = []
        for result in results:
            if isinstance(result, Exception) or not result:
                continue
            rates.extend(result[0].get("rates", []))
            if not rates:
                raise HTTPException(
                    status_code=503, detail="Nie udało się pobrać listy walut. Spróbuj ponownie później.")
        return rates


async def get_list_of_currency_prices() -> List[Price]:
    rates = await fetch_raw_currencies_from_api()
    prices = []
    seen_codes = set()

    for rate in rates:
        code = rate['code']
        if code in seen_codes:
            continue
        seen_codes.add(code)

        if 'mid' in rate:
            buy_price, sell_price = simulate_currency_fluctuation_from_mid(
                rate['mid'])
            price = Price(
                currency_code=code, buy_price=buy_price, sell_price=sell_price)
            prices.append(price)
        elif 'bid' in rate and 'ask' in rate:
            buy_price, sell_price = simulate_currency_fluctuation_from_bid_ask(
                rate['bid'], rate['ask'])
            price = Price(
                currency_code=code, buy_price=buy_price, sell_price=sell_price)
            prices.append(price)
    return prices


async def fetch_list_of_currencies() -> List[Currency]:
    rates = await fetch_raw_currencies_from_api()
    currencies = []
    currencies_codes = set()
    for rate in rates:
        try:
            currency = Currency(id=rate['code'], code=rate["code"],
                                name=rate["currency"].title())
            if currency.code not in currencies_codes:
                currencies_codes.add(currency.code)
                currencies.append(currency)
        except KeyError:
            continue
    currencies = sorted(currencies, key=lambda currency: currency.code)
    await save_currencies_to_db(currencies)
    return currencies


async def save_currencies_to_db(currencies: List[Currency]) -> None:
    async for session in pg_db.get_session():
        try:
            # Dodanie PLN, nie ma jej w API NBP
            currencies.append(
                Currency(id="PLN", code="PLN", name="Polski Złoty"))
            for currency in currencies:
                existing = await session.exec(
                    select(Currency).where(Currency.code == currency.code)
                )

                if not existing.one_or_none():
                    session.add(currency)

            await session.commit()
        except Exception as _exc:
            await session.rollback()
            raise _exc


async def get_all_currencies() -> dict[str, Currency]:
    async for session in pg_db.get_session():
        statement = select(Currency)
        result = await session.exec(statement)
        currencies = {currency.id: currency for currency in result.all()}
        return currencies


async def get_currency_by_code(code: str, session: AsyncSession) -> Currency:
    statement = select(Currency).where(Currency.code == code)
    result = await session.exec(statement)
    return result.one_or_none()


async def fetch_historical_rates(currency_code: str, last_n: int) -> List[Price]:
    """
    Pobiera N ostatnich kursów historycznych dla danej waluty z API NBP.

    Args:
        currency_code: Kod waluty (np. USD, EUR)
        last_n: Liczba ostatnich notowań do pobrania (1-366)

    Returns:
        Lista obiektów Price z kursami historycznymi

    Raises:
        HTTPException: 400 jeśli waluta nie istnieje lub dane niedostępne
    """
    # Próba pobrania z różnych tabel NBP (A, B, C)
    prices = []
    for table in ['A', 'B', 'C']:
        try:
            url = f"{base_url}rates/{table}/{currency_code}/last/{last_n}/?format=json"
            async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        rates = data.get('rates', [])

                        for rate in rates:
                            # Dla tabel A i B używamy 'mid'
                            if 'mid' in rate:
                                buy_price, sell_price = simulate_currency_fluctuation_from_mid(
                                    rate['mid'])
                                # Konwersja daty YYYY-MM-DD na datetime
                                effective_date = datetime.strptime(
                                    rate.get('effectiveDate'), '%Y-%m-%d')
                                price = Price(
                                    currency_code=currency_code,
                                    buy_price=buy_price,
                                    sell_price=sell_price,
                                    timestamp=effective_date
                                )
                                prices.append(price)
                            # Dla tabeli C używamy 'bid' i 'ask'
                            elif 'bid' in rate and 'ask' in rate:
                                buy_price, sell_price = simulate_currency_fluctuation_from_bid_ask(
                                    rate['bid'], rate['ask'])
                                # Konwersja daty YYYY-MM-DD na datetime
                                effective_date = datetime.strptime(
                                    rate.get('effectiveDate'), '%Y-%m-%d')
                                price = Price(
                                    currency_code=currency_code,
                                    buy_price=buy_price,
                                    sell_price=sell_price,
                                    timestamp=effective_date
                                )
                                prices.append(price)

                        if prices:
                            return prices
                    elif response.status == 404:
                        continue
                    else:
                        continue
        except Exception:
            continue

    # Jeśli nie znaleziono w żadnej tabeli
    if not prices:
        raise HTTPException(
            status_code=400,
            detail=f"Nie znaleziono kursów dla waluty {currency_code} lub dane są niedostępne"
        )

    return prices
