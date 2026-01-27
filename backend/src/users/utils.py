from src.users.models import User, UserCreate
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status, Depends, Request, Response
from sqlmodel import select
from typing import Optional
from src.users.misc import get_password_hash, decode_access_token, verify_password, create_access_token
from src.db import pg_db


async def get_user_by_email(email: str, session: AsyncSession) -> Optional[User]:
    statement = select(User).where(User.email == email)
    result = await session.exec(statement)
    return result.first()


async def create_user_in_db(user_create: UserCreate, session: AsyncSession) -> User:
    hashed_password = get_password_hash(user_create.password)
    new_user = User(
        first_name=user_create.first_name,
        last_name=user_create.last_name,
        email=user_create.email,
        hashed_password=hashed_password,
    )
    session.add(new_user)
    await session.flush()
    await session.commit()

    await session.refresh(new_user)
    return new_user


async def get_current_user(request: Request, session: AsyncSession = Depends(pg_db.get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nie można zweryfikować danych logowania.",
    )
    token = request.cookies.get("session_token")
    if not token:
        raise credentials_exception

    decoded_token = decode_access_token(token)
    if not decoded_token:
        raise credentials_exception

    email: str = decoded_token.get("sub")
    if not email:
        raise credentials_exception

    statement = select(User).where(User.email == email)
    result = await session.exec(statement)
    user = result.first()
    if user is None:
        raise credentials_exception
    return user


async def authenticate_user(email: str, password: str, response: Response, session: AsyncSession) -> User:
    user = await get_user_by_email(email, session)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=400, detail="Nieprawidłowy email lub hasło")

    access_token = create_access_token(data={"sub": user.email})
    response.set_cookie(
        key="session_token",
        value=access_token,
        httponly=True,
        max_age=86400,
        samesite="lax",
        secure=True
    )
    return user
