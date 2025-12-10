from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from src.users.router import user_router
from src.users.preferences import router as preferences_router
from src.currencies.router import currency_router
from src.balance.router import balance_router
from src.trades.router import trade_router
from src.currencies.utils import fetch_list_of_currencies
from fastapi.middleware.cors import CORSMiddleware
from src.db import pg_db
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import logging
import os

logger = logging.getLogger(__name__)


async def startup_fetch_currencies():
    """Bezpieczne pobieranie walut przy starcie - nie crashuje aplikacji jeśli się nie uda."""
    try:
        logger.info("🔄 Fetching currencies from NBP API...")
        await fetch_list_of_currencies()
        logger.info("✅ Currencies fetched and saved to database successfully")
    except Exception as e:
        logger.error(f"⚠️ Failed to fetch currencies at startup: {e}")
        logger.error(
            "⚠️ Application will continue - currencies can be fetched via API endpoint")

# Use root_path for AWS deployment (ALB routes /api/* to backend)
# Locally it's empty, so backend runs on /
app = FastAPI(root_path=os.getenv("API_ROOT_PATH", ""))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(user_router)
app.include_router(preferences_router)
app.include_router(currency_router)
app.include_router(balance_router)
app.include_router(trade_router)
app.add_event_handler("startup", startup_fetch_currencies)


@app.get("/status", response_model=bool)
async def get_app_status(session: AsyncSession = Depends(pg_db.get_session)) -> bool:
    """Funkcja sprawdza status aplikacji poprzez wykonanie prostego zapytania do bazy danych."""
    result = await session.exec(select(1))
    status = result.first() == 1
    if not status:
        return JSONResponse(status_code=503, content={"detail": "Baza danych jest niedostępna."})
    return status
