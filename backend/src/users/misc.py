from passlib.context import CryptContext
from src.config import config
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: int= config.token.access_token_expire_minutes) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.token.secret_key, algorithm=config.token.algorithm)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, config.token.secret_key, algorithms=[config.token.algorithm])
        return payload
    except JWTError:
        return {}
