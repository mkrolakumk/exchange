import asyncio
import logging
from src.db import pg_db
from src.balance.models import UserBalance
from src.currencies.models import Currency
from src.users.models import User, UserPreferences
from src.trades.models import Trade

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


async def initialize_database():
    logger.info("Inicjalizacja bazy danych i tworzenie tabel...")
    try:
        await pg_db.create_tables()
        logger.info("Baza danych zainicjalizowana pomyślnie.")
    except Exception as _exc:
        logger.error(f"Błąd podczas inicjalizacji bazy danych: {_exc}")


def main():
    asyncio.run(initialize_database())


if __name__ == "__main__":
    main()
