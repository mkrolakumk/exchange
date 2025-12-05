from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from src.config import config
from typing import AsyncGenerator

class PostgresDB:
    """Singleton do zarządzania połączeniami z bazą PostgreSQL."""
    _instance = None
    _engine = None
    _session_factory = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PostgresDB, cls).__new__(cls)
        return cls._instance

    async def init(self):
        """Inicjalizacja silnika bazy i fabryki sesji."""
        if self._engine is None:
            self._engine = create_async_engine(config.db.url, echo=False, future=True)
            self._session_factory = sessionmaker(
                self._engine, class_=AsyncSession, expire_on_commit=False
            )
            await self.create_tables()

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Metoda do pobierania sesji bazy."""
        if self._session_factory is None:
            await self.init()
        async with self._session_factory() as session:
            yield session

    async def create_tables(self):
        """Stworzenie tabeli w bazie (w przypadku ich braku)."""
        if self._engine is None:
            await self.init()

        async with self._engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

pg_db = PostgresDB()