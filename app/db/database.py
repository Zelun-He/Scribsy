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
    from app.db.migrations import upgrade_legacy_tables
    upgrade_legacy_tables(engine)

def backfill_tenant_namespaces():
    """Normalize legacy namespaces after all required columns exist."""
    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET tenant_id = ('user-' || CAST(id AS TEXT)) WHERE tenant_id IS NULL OR tenant_id = 'default'"))
        conn.execute(text("UPDATE patients SET tenant_id = ('user-' || CAST(user_id AS TEXT)) WHERE tenant_id IS NULL OR tenant_id = 'default'"))
        conn.execute(text("UPDATE notes SET tenant_id = ('user-' || CAST(provider_id AS TEXT)) WHERE tenant_id IS NULL OR tenant_id = 'default'"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
