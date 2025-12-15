from src.users.models import User
from fastapi import HTTPException
from sqlmodel import select
from decimal import Decimal
from src.currencies.utils import get_currency_by_code, get_list_of_currency_prices
from src.currencies.models import Currency
from src.balance.utils import get_user_balance
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import pg_db
from src.balance.models import UserBalance
from src.trades.enums import TradeType
from src.trades.models import Trade
from asyncio import sleep
from typing import List
from datetime import datetime


async def buy_currency(user_id: int, currency_code: str, amount: Decimal, session: AsyncSession) -> Trade:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono użytkownika")
    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Kwota musi być większa niż 0")
    if not await get_currency_by_code(currency_code, session):
        raise HTTPException(status_code=404, detail="Nie znaleziono waluty")
    user_balances = await get_user_balance(user_id, session)
    user_balance_src: UserBalance | None = list(
        filter(lambda x: x.currency_code == "PLN", user_balances))
    user_balance_dst: UserBalance | None = list(
        filter(lambda x: x.currency_code == currency_code, user_balances))
    if not user_balance_src:
        raise HTTPException(status_code=400, detail="Brak środków w PLN")
    if not user_balance_dst:
        raise HTTPException(
            status_code=400, detail=f"Błąd odczytu salda dla waluty {currency_code}")
    balance = user_balance_src[0].balance
    curriences_prices = await get_list_of_currency_prices()
    currency: Currency | None = list(
        filter(lambda x: x.currency_code == currency_code, curriences_prices))
    if not currency:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono ceny waluty")
    buy_value = currency[0].sell_price * amount
    if balance < buy_value:
        raise HTTPException(status_code=400, detail="Niewystarczające środki")
    trade = Trade(user_id=user_id, currency_code=currency_code, amount=amount,
                  exchange_rate=currency[0].sell_price, trade_type=TradeType.BUY)
    session.add(trade)

    # Aktualizacja salda
    user_balance_src[0].balance -= buy_value
    user_balance_dst[0].balance += amount

    session.add(user_balance_src[0])
    session.add(user_balance_dst[0])
    # Wykonanie operacji w bazie
    await session.commit()

    return trade


async def sell_currency(user_id: int, currency_code: str, amount: Decimal, session: AsyncSession) -> Trade:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono użytkownika")
    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Kwota musi być większa niż 0")
    if not await get_currency_by_code(currency_code, session):
        raise HTTPException(status_code=404, detail="Nie znaleziono waluty")
    user_balances = await get_user_balance(user_id, session)
    user_balance_src: UserBalance | None = list(
        filter(lambda x: x.currency_code == currency_code, user_balances))
    user_balance_dst: UserBalance | None = list(
        filter(lambda x: x.currency_code == "PLN", user_balances))
    if not user_balance_dst:
        raise HTTPException(
            status_code=400, detail="Błąd odczytu salda dla waluty PLN")
    if not user_balance_src:
        raise HTTPException(
            status_code=400, detail=f"Brak środków w {currency_code}")

    balance = user_balance_src[0].balance
    curriences_prices = await get_list_of_currency_prices()
    currency: Currency | None = list(
        filter(lambda x: x.currency_code == currency_code, curriences_prices))
    if not currency:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono ceny waluty")
    sell_value = currency[0].buy_price * amount
    if balance < amount:
        raise HTTPException(status_code=400, detail="Niewystarczające środki")

    trade = Trade(user_id=user_id, currency_code=currency_code, amount=amount,
                  exchange_rate=currency[0].buy_price, trade_type=TradeType.SELL)
    session.add(trade)

    # Aktualizacja salda
    user_balance_src[0].balance -= amount
    user_balance_dst[0].balance += sell_value

    session.add(user_balance_src[0])
    session.add(user_balance_dst[0])
    # Wykonanie operacji w bazie
    await session.commit()

    return trade


async def get_user_trades(user_id: int, session: AsyncSession) -> List[Trade]:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono użytkownika")
    statement = select(Trade).where(
        Trade.user_id == user_id).order_by(Trade.timestamp.desc())
    results = await session.exec(statement)
    trades = results.all()
    return trades
