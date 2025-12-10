from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from src.db import pg_db
from src.users.models import User, UserPreferences, Notification
from src.users.utils import get_current_user

router = APIRouter(prefix="/users/preferences", tags=["preferences"])


class DarkModeUpdate(BaseModel):
    dark_mode: bool


class NotificationsUpdate(BaseModel):
    notifications: list[Notification]


@router.get("/dark-mode")
async def get_dark_mode(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(pg_db.get_session)
):
    result = await session.exec(
        select(UserPreferences).where(
            UserPreferences.user_id == current_user.id)
    )
    prefs = result.first()

    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        session.add(prefs)
        await session.commit()
        await session.refresh(prefs)

    return {"dark_mode": prefs.dark_mode}


@router.put("/dark-mode")
async def set_dark_mode(
    data: DarkModeUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(pg_db.get_session)
):
    result = await session.exec(
        select(UserPreferences).where(
            UserPreferences.user_id == current_user.id)
    )
    prefs = result.first()

    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        session.add(prefs)

    prefs.dark_mode = data.dark_mode

    session.add(prefs)
    await session.commit()
    await session.refresh(prefs)

    return {"dark_mode": prefs.dark_mode}


@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(pg_db.get_session)
) -> list[Notification]:
    result = await session.exec(
        select(UserPreferences).where(
            UserPreferences.user_id == current_user.id)
    )
    prefs = result.first()

    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        session.add(prefs)
        await session.commit()
        await session.refresh(prefs)

    return prefs.alert_notifications


@router.put("/notifications")
async def set_notifications(
    data: NotificationsUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(pg_db.get_session)
) -> list[Notification]:
    result = await session.exec(
        select(UserPreferences).where(
            UserPreferences.user_id == current_user.id)
    )
    prefs = result.first()

    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        session.add(prefs)
        await session.commit()
        await session.refresh(prefs)

    prefs.alert_notifications = [n.model_dump() for n in data.notifications]

    session.add(prefs)
    await session.commit()
    await session.refresh(prefs)

    return prefs.alert_notifications
