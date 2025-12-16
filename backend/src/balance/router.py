from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from src.currencies.utils import get_currency_by_code
from src.balance.models import UserBalance
from src.balance.utils import verify_bank_account_number
from src.users.models import User
from src.db import pg_db
from src.balance.utils import deposit_funds, withdraw_funds, get_user_balance
from src.users.utils import get_current_user
from typing import List

balance_router = APIRouter(prefix="/balance", tags=["balance"])


@balance_router.post("/deposit", response_model=UserBalance)
async def deposit_funds_by_user(amount: Decimal, currency_code: str = "PLN", current_user: User = Depends(get_current_user), session: AsyncSession = Depends(pg_db.get_session)) -> UserBalance:
    """Endpoint do wpłacania środków na konto użytkownika. Domyślnie waluta to PLN, ale można wpłacić w dowolnej obsługiwanej walucie."""
    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Kwota wpłaty musi być większa od zera.")
    currency = await get_currency_by_code(currency_code, session)
    if not currency:
        raise HTTPException(
            status_code=404, detail=f"Nie znaleziono waluty {currency_code}")
    return await deposit_funds(current_user.id, amount, currency_code, session)


@balance_router.post("/withdraw", response_model=UserBalance)
async def withdraw_funds_by_user(amount: Decimal, bank_account: str, currency_code: str, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(pg_db.get_session)) -> UserBalance:
    """Endpoint do wypłacania środków z konta użytkownika."""
    if amount <= 0:
        raise HTTPException(
            status_code=400, detail="Kwota wypłaty musi być większa od zera.")
    if not verify_bank_account_number(bank_account):
        raise HTTPException(
            status_code=400, detail="Nieprawidłowy numer konta bankowego.")
    response = await withdraw_funds(current_user.id, amount, currency_code, session)
    return response


@balance_router.get("/balance", response_model=dict[str, UserBalance])
async def get_balance(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(pg_db.get_session)) -> dict[str, UserBalance]:
    """Endpoint do pobierania salda użytkownika."""
    result = await get_user_balance(current_user.id, session)
    balance = {balance.currency_code: balance for balance in result}
    return balance
