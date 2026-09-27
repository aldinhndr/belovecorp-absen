from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "BeloveAbsen"
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    database_url: str = "mysql+pymysql://root:password@127.0.0.1:3307/belove_absen"
    upload_dir: str = "uploads"
    max_photo_mb: int = 5
    timezone: str = "Asia/Jakarta"
    report_hour: int = 21
    report_minute: int = 0
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    admin_email: str = "aldin@belovecorp.com"
    admin_password: str = "admin123"
    admin_name: str = "Aldin_Hndr"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = BASE_DIR / path
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
