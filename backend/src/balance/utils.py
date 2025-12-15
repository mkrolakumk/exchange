from src.users.models import User
from fastapi import HTTPException
from sqlmodel import select
from decimal import Decimal
from src.currencies.utils import get_all_currencies
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import pg_db
from src.balance.models import UserBalance
from asyncio import sleep
from typing import List


async def get_user_balance(user_id: int, session: AsyncSession) -> List[UserBalance]:
    all_currencies = await get_all_currencies()
    balances = []
    for currency in all_currencies.values():
        statement = select(UserBalance).where(
            (UserBalance.user_id == user_id) & (
                UserBalance.currency_code == currency.code)
        )
        result = await session.exec(statement)
        balance = result.first()
        if not balance:
            balance = UserBalance(
                user_id=user_id, currency_code=currency.code, balance=0.0)
            session.add(balance)
            await session.commit()
            await session.refresh(balance)
        balances.append(balance)
    balances.sort(key=lambda currency: currency.balance, reverse=True)
    return balances


async def get_user_balance_by_currency_code(user_id: int, currency_code: str, session: AsyncSession) -> UserBalance:
    statement = select(UserBalance).where(
        (UserBalance.user_id == user_id) & (
            UserBalance.currency_code == currency_code)
    )
    result = await session.exec(statement)
    balance = result.first()
    if not balance:
        balance = UserBalance(
            user_id=user_id, currency_code=currency_code, balance=0.0)
        session.add(balance)
        await session.commit()
        await session.refresh(balance)
    return balance


async def deposit_funds(user_id: int, amount: Decimal, currency_code: str, session: AsyncSession) -> UserBalance:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono użytkownika")
    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Kwota wpłaty musi być dodatnia")
    balance = await get_user_balance_by_currency_code(user_id, currency_code, session)
    balance.balance += amount
    session.add(balance)
    await session.commit()
    await session.refresh(balance)
    return balance


async def withdraw_funds(user_id: int, amount: Decimal, currency_code: str, session: AsyncSession) -> UserBalance:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail="Nie znaleziono użytkownika")
    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Kwota wypłaty musi być dodatnia")
    balance_response = await get_user_balance(user_id, session)
    balance = next(
        (b for b in balance_response if b.currency_code == currency_code), None)
    if not balance:
        raise HTTPException(
            status_code=404, detail=f"Nie znaleziono salda dla waluty {currency_code}")
    if balance.balance < amount:
        raise HTTPException(status_code=400, detail="Niewystarczające środki")
    balance.balance -= amount
    session.add(balance)
    await session.commit()
    await session.refresh(balance)
    await sleep(2)  # symulacja zlecenia przelewu, poza transakcją bazy danych
    return balance
