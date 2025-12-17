from sqlmodel import SQLModel, Field
from decimal import Decimal
from sqlalchemy import Enum
from typing import Optional
from src.trades.enums import TradeType
from datetime import datetime
from pydantic import field_validator, field_serializer, BaseModel, Field as pydanticField


class Trade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True,
                              unique=True, description="Unikalny identyfikator transakcji")
    user_id: int = Field(..., foreign_key="user.id",
                         description="Identyfikator użytkownika dokonującego transakcji")
    currency_code: str = Field(..., min_length=3, max_length=3,
                               foreign_key="currency.id", description="Kod waluty zgodny z ISO 4217")
    exchange_rate: Decimal = Field(
        gt=0, max_digits=24, decimal_places=10, description="Kurs wymiany waluty w momencie transakcji")
    amount: Decimal = Field(gt=0, max_digits=24,
                            decimal_places=10, description="Kwota transakcji")
    trade_type: TradeType = Field(sa_type=Enum(TradeType),
                                  description="Typ transakcji: kupno lub sprzedaż")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="Data i godzina transakcji")

    @field_validator('trade_type')
    def validate_trade_type(cls, v):
        if isinstance(v, str):
            if v not in [e.value for e in TradeType]:
                raise ValueError(
                    'Nieprawidłowy typ transakcji. Dostępne typy: BUY, SELL')
            return TradeType(v)
        elif isinstance(v, TradeType):
            return v
        else:
            raise ValueError(
                'Nieprawidłowy typ transakcji. Dostępne typy: BUY, SELL')

    @field_serializer('trade_type')
    def serialize_trade_type(self, value):
        return value.value


class TradeResponse(BaseModel):
    trades: list[Trade] = pydanticField(
        description="Lista transakcji użytkownika")
    total: int = pydanticField(ge=0, description="Całkowita liczba transakcji")
    page: int = pydanticField(ge=1, description="Aktualnie wybrana strona")
    page_size: int = pydanticField(
        ge=1, description="Liczba transakcji na stronę")
