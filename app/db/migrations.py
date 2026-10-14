"""Add newer note fields without replacing legacy tables or records."""
from sqlalchemy import inspect, literal, text
from contextlib import nullcontext


ADDITIVE_COLUMNS = {
    "users": (
        "token_version", "role", "last_login", "failed_login_attempts", "account_locked_until",
        "tenant_id", "work_start_time", "work_end_time", "timezone", "working_days",
    ),
    "patients": ("tenant_id",),
    "notes": (
        "audio_file", "s3_key", "file_size", "content_type", "storage_provider",
        "transcript", "soap_subjective", "soap_objective", "soap_assessment", "soap_plan",
        "original_content", "accuracy_score", "content_changes_count",
        "creation_method", "creation_started_at", "creation_completed_at",
        "baseline_time_minutes", "actual_time_minutes", "time_saved_minutes",
        "locked_by_user_id", "locked_at", "lock_expires_at",
        "audio_retention_days", "audio_deleted_at", "audio_secure_deleted", "tenant_id",
    ),
    "appointments": ("status", "checked_in_at"),
}


def upgrade_legacy_tables(engine):
    from app.db.database import Base

    context = engine.begin() if hasattr(engine, "connect") else nullcontext(engine)
    with context as conn:
        quote = conn.dialect.identifier_preparer.quote
        for table_name, names in ADDITIVE_COLUMNS.items():
            existing = {c["name"] for c in inspect(conn).get_columns(table_name)}
            table = Base.metadata.tables[table_name]
            for name in names:
                if name in existing:
                    continue
                column = table.c[name]
                definition = column.type.compile(dialect=conn.dialect)
                if column.default is not None and column.default.is_scalar:
                    default = literal(column.default.arg, type_=column.type).compile(
                        dialect=conn.dialect, compile_kwargs={"literal_binds": True}
                    )
                    definition += f" DEFAULT {default}"
                if not column.nullable:
                    if column.default is None or not column.default.is_scalar:
                        raise RuntimeError(f"A safe default is required for {table_name}.{name}")
                    definition += " NOT NULL"
                # Gunicorn workers can inspect the same old schema concurrently.
                guard = "IF NOT EXISTS " if conn.dialect.name == "postgresql" else ""
                conn.execute(text(
                    f"ALTER TABLE {quote(table_name)} ADD COLUMN {guard}{quote(name)} {definition}"
                ))
