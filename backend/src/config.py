from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel

class DatabaseSettings(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str

    @property
    def url(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

class TokenSettings(BaseModel):
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

class CurrencyAPISettings(BaseModel):
    address: str

class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, env_nested_delimiter="__")

    db: DatabaseSettings
    token: TokenSettings
    currency_api: CurrencyAPISettings

config = Config()