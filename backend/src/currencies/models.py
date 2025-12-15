from sqlmodel import SQLModel, Field
from decimal import Decimal
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class Currency(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True,
                              unique=True, description="Unikalny identyfikator waluty")
    code: str = Field(..., min_length=3, max_length=3,
                      description="Kod waluty zgodny z ISO 4217")
    name: str = Field(..., description="Nazwa waluty")


class Price(BaseModel):
    currency_code: str = Field(..., min_length=3, max_length=3,
                               description="Kod waluty zgodny z ISO 4217")
    buy_price: Decimal = Field(
        gt=0, max_digits=24, decimal_places=10, description="Cena kupna")
    sell_price: Decimal = Field(
        gt=0, max_digits=24, decimal_places=10, description="Cena sprzedaży")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="Data i godzina utworzenia rekordu")
