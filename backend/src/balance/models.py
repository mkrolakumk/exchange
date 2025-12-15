from sqlmodel import SQLModel, Field
from decimal import Decimal
from typing import Optional
from src.trades.enums import TradeType
from datetime import datetime


class UserBalance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, unique=True,
                              description="Unikalny identyfikator salda użytkownika")
    user_id: int = Field(..., foreign_key="user.id",
                         description="Identyfikator użytkownika")
    currency_code: str = Field(..., min_length=3, max_length=3,
                               foreign_key="currency.id", description="Kod waluty zgodny z ISO 4217")
    balance: Decimal = Field(ge=0, max_digits=24, decimal_places=10,
                             description="Saldo użytkownika w danej walucie")
