from fastapi import APIRouter, Depends
from fastapi import HTTPException
from src.users.models import UserCreate, User
from src.users.utils import create_user_in_db, get_user_by_email, authenticate_user, get_current_user
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db import pg_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")
user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)) -> User:
    """Funkcja zwraca dane aktualnie zalogowanego użytkownika."""
    return current_user


@user_router.post("/register", response_model=User)
async def register(user_data: UserCreate, session: AsyncSession = Depends(pg_db.get_session)) -> User:
    """Funkcja rejestruje nowego użytkownika w bazie danych."""
    user_by_email: User | None = await get_user_by_email(user_data.email, session)
    if user_by_email:
        raise HTTPException(
            status_code=409, detail="Konto z tym adresem emailem już istnieje!")

    return await create_user_in_db(user_data, session)


@user_router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(pg_db.get_session)):
    """Funkcja loguje użytkownika i zwraca token dostępu."""
    return await authenticate_user(email=form_data.username, password=form_data.password, session=session)
