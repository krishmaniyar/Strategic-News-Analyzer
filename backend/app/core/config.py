import json
import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    environment: str = "development"
    log_level: str = "INFO"

    # Supabase Settings (Supporting direct names and root .env aliases)
    supabase_url: str = Field(default="", validation_alias="supabase_url")
    supabase_anon_key: str = Field(default="", validation_alias="anon_key")
    supabase_service_role_key: str = Field(default="", validation_alias="service_role")
    database_url: str = Field(default="", validation_alias="database_url")

    # Groq Configurations
    groq_api_key: str = ""
    groq_daily_token_budget: int = 500_000

    # Ollama Local LLM
    ollama_base_url: str = "http://localhost:11434"

    # Redis Configurations
    redis_url: str = "redis://localhost:6379/0"

    # Ingestion API Keys (Supporting both backend and root .env styles)
    newsapi_key: str = Field(default="", validation_alias="news_api")
    gnews_key: str = Field(default="", validation_alias="gnews_api")
    mediastack_key: str = Field(default="", validation_alias="mediastack_api")
    gdelt_enabled: bool = True

    # Ingestion schedule configs
    ingestion_interval_minutes: int = 15
    clustering_interval_minutes: int = 30

    # CORS Configuration
    cors_origins: Union[str, List[str]] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",          # Ignore other system env variables and password fields
        case_sensitive=False
    )

settings = Settings()
