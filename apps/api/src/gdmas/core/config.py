from pydantic import field_validator
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
    CORS_ORIGINS: str | list[str] = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Worker Settings
    USGS_FEED_URL: str = (
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    )
    INGESTION_INTERVAL_SECONDS: int = 300
    ANALYSIS_INTERVAL_SECONDS: int = 300
    PREDICTION_INTERVAL_SECONDS: int = 300
    CLUSTERING_INTERVAL_SECONDS: int = 86400

    # --- Cấu hình dữ liệu & mô hình (docs/yeucaubatbuoc.md §6.4) — đưa vào .env để dễ chỉnh ---
    # Cửa sổ lịch sử cho backfill/phân tích/cụm (ngày) — 365 = 1 năm.
    DATA_WINDOW_DAYS: int = 365
    ANALYSIS_WINDOW_DAYS: int = 365
    CLUSTERING_WINDOW_DAYS: int = 365
    CLUSTERING_EPS_KM: float = 150.0
    CLUSTERING_MIN_SAMPLES: int = 5
    # Ngưỡng tối thiểu khi backfill 1 năm qua FDSN (giới hạn 20000 kết quả/query).
    BACKFILL_MIN_MAGNITUDE: float = 2.5
    BACKFILL_QUERY_URL: str = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    PREDICTION_MIN_OBSERVED: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
