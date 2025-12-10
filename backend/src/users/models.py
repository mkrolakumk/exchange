from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import EmailStr, BaseModel, Field as pydanticField
from typing import Optional


class UserCreate(SQLModel):
    email: EmailStr = Field(..., description="Adres email użytkownika")
    password: str = Field(nullable=False, description="Hasło użytkownika")
    first_name: str = Field(nullable=False, description="Imię użytkownika")
    last_name: str = Field(nullable=False, description="Nazwisko użytkownika")


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(nullable=False, unique=True,
                            index=True, description="Adres email użytkownika")
    first_name: str = Field(nullable=False, description="Imię użytkownika")
    last_name: str = Field(nullable=False, description="Nazwisko użytkownika")
    hashed_password: str = Field(
        nullable=False, description="Hash hasła użytkownika", exclude=True)
    is_active: bool = Field(
        default=True, description="Określa, czy użytkownik jest aktywny")
    is_superuser: bool = Field(
        default=False, description="Określa, czy użytkownik ma uprawnienia superużytkownika")


class Notification(BaseModel):
    currency_code: str = pydanticField(
        ..., description="Kod waluty, np. 'USD', 'EUR'")
    threshold: float = pydanticField(
        ..., description="Próg wartości dla powiadomienia")
    direction: str = pydanticField(
        ..., description="Kierunek zmiany wartości: 'above' lub 'below'")


class UserPreferences(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False,
                         unique=True, description="ID użytkownika")
    dark_mode: bool = Field(
        default=False, description="Czy użytkownik preferuje tryb ciemny")
    alert_notifications: list[dict] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default='[]'),
        description="Lista powiadomień użytkownika"
    )


class PreferencesUpdate(BaseModel):
    dark_mode: Optional[bool] = None
    alert_notifications: Optional[list[dict]] = None
