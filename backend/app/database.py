import os
from typing import Generator
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from sqlalchemy.exc import OperationalError
import logging

# Configure logging for better visibility during startup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Zero-Trust Secrets: Dilarang keras menulis kredensial koneksi (hardcode) di dalam berkas.
# URL basis data wajib ditarik dari variabel lingkungan secara dinamis menggunakan modul bawaan OS.
# Jika URL tidak ditemukan, lemparkan galat (exception) yang menghentikan peluncuran sistem.
_database_url_raw: str | None = os.getenv("DATABASE_URL")

if not _database_url_raw:
    logger.critical("DATABASE_URL environment variable is not set. Application cannot start.")
    raise ValueError("DATABASE_URL environment variable is not set. Cannot establish database connection.")

# 2. Transport Encryption: Anda wajib menambahkan parameter pencegahan Man-in-the-Middle (MitM).
# Pastikan URL koneksi yang akan digunakan dikonfigurasi untuk memaksakan TLS/SSL (contoh parameter: sslmode=require).
# Parse the URL to add/ensure sslmode=require
parsed_url = urlparse(_database_url_raw)
query_params = parse_qs(parsed_url.query)

if parsed_url.scheme.startswith("postgresql"): # Only apply sslmode for PostgreSQL connections
    query_params["sslmode"] = ["require"]
    # Reconstruct the query string
    parsed_url = parsed_url._replace(query=urlencode(query_params, doseq=True))
    DATABASE_URL: str = urlunparse(parsed_url)
else:
    # For non-PostgreSQL databases, use the URL as is, assuming TLS is handled by the driver or not required.
    # However, the prompt specifically mentions PostgreSQL context.
    logger.warning(f"Database scheme is not PostgreSQL ({parsed_url.scheme}). Skipping sslmode=require enforcement.")
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
        pool_pre_ping=True,      # Validasi soket TCP sebelum transaksi
        pool_size=10,            # Batasi pool_size agar tidak membanjiri koneksi DBaaS
        max_overflow=5,          # Allow up to 5 additional connections if needed
        pool_recycle=1800,       # Atur pool_recycle di bawah batas waktu putus koneksi bawaan server (30 menit)
        # pool_timeout=30,       # Default is 30 seconds, usually sufficient
    )
    # Attempt a connection to validate the engine configuration early
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    logger.info("Database connection pool initialized and connection tested successfully.")
except OperationalError as e:
    logger.critical(f"Failed to connect to the database at startup: {e}")
    raise ConnectionError(f"Failed to connect to the database at startup: {e}") from e
except Exception as e:
    logger.critical(f"An unexpected error occurred during database engine setup: {e}")
    raise


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# 4. Dependency Injection: Buat fungsi generator `get_db()` menggunakan blok `try...finally` murni
# untuk menjamin pelepasan (release) sesi basis data kembali ke dalam pool, terlepas dari apakah
# kueri berhasil atau menghasilkan galat internal (Error 500).
def get_db() -> Generator[Session, None, None]:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()