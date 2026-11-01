"""Database configuration and session management for SQLite."""

import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Ensure directory exists for local sqlite files
if settings.DATABASE_URL.startswith("sqlite"):
    # Extract path if it's a file path
    # SQLite URL formats:
    # sqlite:///./data/engineerhub.db
    # sqlite:////absolute/path
    # sqlite://///UNC-SHARE/path
    db_path_str = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
    if db_path_str and not db_path_str.startswith(":memory:"):
        db_file = Path(db_path_str)
        if not db_file.is_absolute():
            db_file = Path.cwd() / db_file
        db_file.parent.mkdir(parents=True, exist_ok=True)

# Engine creation with sqlite specific connection args
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
        "timeout": settings.SQLITE_TIMEOUT_SECONDS,
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Apply SQLite performance and concurrency pragmas on new connections."""
    # Check if this is a sqlite3 connection
    if hasattr(dbapi_connection, "cursor"):
        cursor = dbapi_connection.cursor()
        try:
            # Enable Foreign Key constraints
            cursor.execute("PRAGMA foreign_keys = ON;")
            # Enable Write-Ahead Logging (WAL) for better concurrent read/write performance
            cursor.execute("PRAGMA journal_mode = WAL;")
            # Set busy timeout in milliseconds to prevent immediate 'database locked' errors
            cursor.execute(f"PRAGMA busy_timeout = {settings.SQLITE_BUSY_TIMEOUT_MS};")
            # Set synchronous to NORMAL for WAL mode performance while retaining durability
            cursor.execute("PRAGMA synchronous = NORMAL;")
            # Cache size tuning (approx 8MB cache)
            cursor.execute("PRAGMA cache_size = -8000;")
        except Exception:
            pass
        finally:
            cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding database session with guaranteed closure."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
