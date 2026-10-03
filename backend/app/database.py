import logging
import os
from typing import Generator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_database_url_raw: str | None = os.getenv("DATABASE_URL")

if not _database_url_raw:
    logger.critical("DATABASE_URL environment variable is not set. Application cannot start.")
    raise ValueError("DATABASE_URL environment variable is not set. Cannot establish database connection.")

if _database_url_raw.startswith("postgres://"):
    _database_url_raw = _database_url_raw.replace("postgres://", "postgresql+psycopg2://", 1)
elif _database_url_raw.startswith("postgresql://"):
    _database_url_raw = _database_url_raw.replace("postgresql://", "postgresql+psycopg2://", 1)

parsed_url = urlparse(_database_url_raw)
query_params = parse_qs(parsed_url.query)

if parsed_url.scheme.startswith("postgresql"):
    query_params["sslmode"] = ["require"]
    parsed_url = parsed_url._replace(query=urlencode(query_params, doseq=True))
    DATABASE_URL: str = urlunparse(parsed_url)
else:
    logger.warning(
        "Database scheme is not PostgreSQL (%s). Skipping sslmode=require enforcement.",
        parsed_url.scheme,
    )
    DATABASE_URL = _database_url_raw


# Log the sanitized URL for security (hide password)
logger.info(f"Connecting to database using URL (sanitized): {DATABASE_URL.split('://')[0]}://******@{''.join(DATABASE_URL.split('://')[1:])}")

# 3. Connection Resilience (Pooling):
# Konfigurasikan SQLAlchemy Engine dengan pengaturan Connection Pooling tingkat lanjut:
# - pool_pre_ping=True (Validasi soket TCP sebelum transaksi)
# - Batasi pool_size agar tidak membanjiri koneksi DBaaS. (e.g., 10 connections)
# - Atur pool_recycle di bawah batas waktu putus koneksi bawaan server. (e.g., 1800 seconds = 30 minutes)
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=1800,
        pool_use_lifo=True,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 10,
            "options": "-c timezone=Asia/Jakarta",
        },
    )
    logger.info("Database engine created.")
except OperationalError as e:
    logger.critical(f"Failed to connect to the database at startup: {e}")
    raise ConnectionError(f"Failed to connect to the database at startup: {e}") from e
except Exception as e:
    logger.critical(f"An unexpected error occurred during database engine setup: {e}")
    raise


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def ensure_schema() -> None:
    with engine.begin() as conn:
        cols = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'random_items'"
            )
        ).fetchall()
        names = {row[0] for row in cols}
        if "qr_token" not in names:
            conn.execute(
                text("ALTER TABLE random_items ADD COLUMN qr_token VARCHAR(64) NULL UNIQUE")
            )
        
        # Remove unique constraint on user_day if exists
        try:
            conn.execute(text("ALTER TABLE schedules DROP CONSTRAINT IF EXISTS uq_schedule_user_day"))
        except Exception as e:
            logger.warning("Could not drop constraint: %s", e)

        # Add shift_index column to attendances if not exists
        att_cols = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'attendances'"
            )
        ).fetchall()
        att_names = {row[0] for row in att_cols}
        if "shift_index" not in att_names:
            conn.execute(
                text("ALTER TABLE attendances ADD COLUMN shift_index INTEGER NOT NULL DEFAULT 0")
            )


def get_db() -> Generator[Session, None, None]:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()