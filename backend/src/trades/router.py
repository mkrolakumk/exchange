from fastapi import APIRouter, Depends, Query
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from src.users.models import User
from src.users.utils import get_current_user
from typing import List
from src.trades.models import Trade, TradeResponse
from src.trades.utils import buy_currency, sell_currency, get_user_trades
from src.db import pg_db

trade_router = APIRouter(prefix="/trades", tags=["trades"])


@trade_router.post("/buy", response_model=Trade)
async def buy_currency_endpoint(currency_code: str, amount: Decimal, session: AsyncSession = Depends(pg_db.get_session), current_user: User = Depends(get_current_user)) -> Trade:
    """
    Endpoint do zakupu waluty. Tylko za PLN, tylko dla zalogowanych użytkowników.
    """
    trade = await buy_currency(current_user.id, currency_code, amount, session)
    return trade


@trade_router.post("/sell", response_model=Trade)
async def sell_currency_endpoint(currency_code: str, amount: Decimal, session: AsyncSession = Depends(pg_db.get_session), current_user: User = Depends(get_current_user)) -> Trade:
    """
    Endpoint do sprzedaży waluty. Tylko do PLN, tylko dla zalogowanych użytkowników.
    """
    trade = await sell_currency(current_user.id, currency_code, amount, session)
    return trade


@trade_router.get("/trades", response_model=TradeResponse)
async def get_user_trades_endpoint(page: int = Query(1, ge=1, description="Aktualnie wybrana strona"), session: AsyncSession = Depends(pg_db.get_session), current_user: User = Depends(get_current_user)) -> TradeResponse:
    """
    Endpoint do pobierania historii transakcji użytkownika. Tylko dla zalogowanych użytkowników.
    """
    page_size: int = 30
    response = await get_user_trades(user_id=current_user.id, session=session, page=page, page_size=page_size)
    return response
