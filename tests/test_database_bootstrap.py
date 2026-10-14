import pytest
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.db import bootstrap


def test_temporary_database_restart_is_retried(monkeypatch):
    attempts = []
    delays = []
    def initialize():
        attempts.append(1)
        if len(attempts) < 3:
            raise OperationalError("connect", {}, RuntimeError("database restarting"))
    monkeypatch.setattr(bootstrap, "init_db", initialize)
    monkeypatch.setattr(bootstrap.time, "sleep", delays.append)
    bootstrap.initialize_database(max_attempts=3, retry_delay=2)
    assert len(attempts) == 3
    assert delays == [2, 2]


def test_unavailable_database_stops_startup_after_limit(monkeypatch):
    attempts = []
    def initialize():
        attempts.append(1)
        raise OperationalError("connect", {}, RuntimeError("database unavailable"))
    monkeypatch.setattr(bootstrap, "init_db", initialize)
    monkeypatch.setattr(bootstrap.time, "sleep", lambda _: None)
    with pytest.raises(OperationalError):
        bootstrap.initialize_database(max_attempts=2, retry_delay=0)
    assert len(attempts) == 2


def test_permanent_schema_error_is_not_retried(monkeypatch):
    def initialize():
        raise ProgrammingError("ALTER TABLE", {}, RuntimeError("schema error"))
    def unexpected_retry(_):
        pytest.fail("Permanent schema errors should stop startup immediately")
    monkeypatch.setattr(bootstrap, "init_db", initialize)
    monkeypatch.setattr(bootstrap.time, "sleep", unexpected_retry)
    with pytest.raises(ProgrammingError):
        bootstrap.initialize_database(max_attempts=3, retry_delay=1)
