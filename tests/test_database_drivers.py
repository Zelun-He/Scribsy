"""Catch missing PostgreSQL drivers before a Railway deployment boots."""
import pytest
from sqlalchemy import create_engine

from app.config import settings


@pytest.mark.parametrize(
    ("url", "driver"),
    [
        ("postgres://user:password@localhost/scribsy", "psycopg"),
        ("postgresql://user:password@localhost/scribsy", "psycopg"),
        ("postgresql+psycopg://user:password@localhost/scribsy", "psycopg"),
        ("postgresql+psycopg2://user:password@localhost/scribsy", "psycopg2"),
    ],
)
def test_postgresql_driver_can_load(monkeypatch, url, driver):
    monkeypatch.setenv("DATABASE_URL", url)
    # Engine construction imports the selected driver without accessing a server.
    engine = create_engine(settings.get_database_url())
    try:
        assert engine.dialect.dbapi.__name__ == driver
    finally:
        engine.dispose()
