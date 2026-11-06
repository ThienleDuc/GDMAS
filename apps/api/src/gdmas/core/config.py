from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "GDMAS API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database Settings
    POSTGRES_USER: str = "gdmas_user"
    POSTGRES_PASSWORD: str = "gdmas_secure_password_2026"
    POSTGRES_DB: str = "gdmas_db"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DATABASE_URL: str = "postgresql+psycopg://gdmas_user:gdmas_secure_password_2026@localhost:5432/gdmas_db"

    # CORS Settings
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Worker Settings
    USGS_FEED_URL: str = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    INGESTION_INTERVAL_SECONDS: int = 300
    ANALYSIS_INTERVAL_SECONDS: int = 300
    PREDICTION_INTERVAL_SECONDS: int = 300
    CLUSTERING_INTERVAL_SECONDS: int = 86400

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

