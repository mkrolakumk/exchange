from sqlmodel import SQLModel, Field
from pydantic import EmailStr
from typing import Optional

class UserCreate(SQLModel):
    email: EmailStr = Field(..., description="Adres email użytkownika")
    password: str = Field(nullable=False, description="Hasło użytkownika")
    first_name: str = Field(nullable=False, description="Imię użytkownika")
    last_name: str = Field(nullable=False, description="Nazwisko użytkownika")

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(nullable=False, unique=True, index=True, description="Adres email użytkownika")
    first_name: str = Field(nullable=False, description="Imię użytkownika")
    last_name: str = Field(nullable=False, description="Nazwisko użytkownika")
    hashed_password: str = Field(nullable=False, description="Hash hasła użytkownika", exclude=True)
    is_active: bool = Field(default=True, description="Określa, czy użytkownik jest aktywny")
    is_superuser: bool = Field(default=False, description="Określa, czy użytkownik ma uprawnienia superużytkownika")