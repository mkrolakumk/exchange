from sqlmodel import SQLModel, Field
from typing import Optional
from src.trades.enums import TradeType
from datetime import datetime

class Trade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, unique=True, description="Unikalny identyfikator transakcji")
    user_id: int = Field(..., foreign_key="user.id", description="Identyfikator użytkownika dokonującego transakcji")
    currency_code: str = Field(..., min_length=3, max_length=3, foreign_key="currency.id", description="Kod waluty zgodny z ISO 4217")
    exchange_rate: float = Field(gt=0, description="Kurs wymiany waluty w momencie transakcji")
    amount: float = Field(gt=0, description="Kwota transakcji")
    trade_type: TradeType = Field(..., description="Typ transakcji: kupno lub sprzedaż")
    timestamp: datetime = Field(default_factory=datetime.now, description="Data i godzina transakcji")