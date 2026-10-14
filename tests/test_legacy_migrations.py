from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.db import models
from app.db.migrations import upgrade_legacy_tables


def test_old_notes_become_readable_without_losing_records(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path}/legacy.db")
    try:
        with engine.begin() as conn:
            conn.execute(text("""CREATE TABLE notes (
                id INTEGER PRIMARY KEY, patient_id INTEGER, provider_id INTEGER,
                visit_id INTEGER, note_type VARCHAR, content TEXT, status VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, signed_at DATETIME
            )"""))
            conn.execute(text("""INSERT INTO notes
                (id, patient_id, provider_id, visit_id, note_type, content, status)
                VALUES (41, 7, 9, 1, 'Progress', 'Preserved legacy note', 'draft')"""))
            conn.execute(text("CREATE TABLE appointments (id INTEGER PRIMARY KEY)"))
            conn.execute(text("INSERT INTO appointments (id) VALUES (12)"))

        upgrade_legacy_tables(engine)
        first_columns = [(c["name"], str(c["type"]), c["nullable"], c["default"])
                         for c in inspect(engine).get_columns("notes")]
        upgrade_legacy_tables(engine)
        assert [(c["name"], str(c["type"]), c["nullable"], c["default"])
                for c in inspect(engine).get_columns("notes")] == first_columns
        with Session(engine) as db:
            note = db.get(models.Note, 41)
            assert note.content == "Preserved legacy note"
            assert note.provider_id == 9
            assert note.transcript is None
            assert note.creation_method == "handwritten"
            assert note.accuracy_score == 100
            assert note.audio_secure_deleted is False
            assert db.query(models.Note).count() == 1
        with engine.connect() as conn:
            assert conn.execute(text("SELECT status FROM appointments WHERE id = 12")).scalar() == "scheduled"
    finally:
        engine.dispose()


def test_failed_database_initialization_is_not_ready(monkeypatch):
    from app import main

    monkeypatch.setattr(main.app.state, "database_ready", True, raising=False)
    def fail_init():
        raise RuntimeError("Simulated schema initialization failure")
    monkeypatch.setattr(main, "init_db", fail_init)
    main.on_startup()
    response = main.readyz()
    assert response.status_code == 503
    assert b"schema_not_ready" in response.body
