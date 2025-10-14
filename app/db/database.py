"""
database.py: Database connection setup for SQLite using SQLAlchemy.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Database URL from configuration
from app.config import settings
DATABASE_URL = settings.get_database_url()

# Configure engine based on database type
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL/other databases configuration
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Import models to register them with Base
from app.db import models  # noqa: F401

def init_db():
    """
    Create all tables in the database.
    """
    Base.metadata.create_all(bind=engine)
    # Lightweight startup migrations for SQLite dev
    try:
        if DATABASE_URL.startswith("sqlite"):
            with engine.connect() as conn:
                # Ensure new columns on appointments table
                cols = set()
                try:
                    result = conn.execute(text("PRAGMA table_info(appointments)"))
                    for row in result:
                        # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
                        cols.add(row[1])
                except Exception:
                    cols = set()

                if "status" not in cols:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN status VARCHAR NOT NULL DEFAULT 'scheduled'"))
                if "checked_in_at" not in cols:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN checked_in_at DATETIME NULL"))
    except Exception:
        # Best-effort; avoid blocking app startup in dev
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
