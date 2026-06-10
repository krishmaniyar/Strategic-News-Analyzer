import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    NEWSAPI_KEY: str = ""
    GNEWS_KEY: str = ""
    MEDIASTACK_KEY: str = ""
    DEMO_MODE: bool = False
    DATABASE_URL: str = "sqlite:///./news.db"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
