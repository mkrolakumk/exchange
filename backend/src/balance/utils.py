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


def verify_bank_account_number(account_number: str) -> bool:
    if len(account_number) != 26 or not account_number.isdigit():
        return False
    return True


async def get_user_balance(user_id: int, session: AsyncSession) -> List[UserBalance]:
    # Pobranie wszystkich walut dostępnych
    all_currencies = await get_all_currencies(session=session)

    statement = select(UserBalance).where(UserBalance.user_id == user_id)
    result = await session.exec(statement)
    existing_balances = {
        balance.currency_code: balance for balance in result.all()}

    missing_balances = []
    for currency_code, currency in all_currencies.items():
        if currency_code not in existing_balances:
            missing_balances.append(UserBalance(
                user_id=user_id,
                currency_code=currency_code,
                balance=0.0
            ))

    # Jeśli są jakieś sala, to trzeba je dodać do bazy
    if missing_balances:
        session.add_all(missing_balances)
        await session.commit()
        # Odświeżenie dodanych sald
        for balance in missing_balances:
            await session.refresh(balance)

    all_balances = list(existing_balances.values()) + missing_balances

    # Sortowanie wyników malejąco, według salda
    all_balances.sort(key=lambda b: b.balance, reverse=True)
    return all_balances


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
    return balance
