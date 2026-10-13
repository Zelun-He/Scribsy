"""Tests use an isolated temporary database, never the bundled or deployed data."""
import os
import sys
import tempfile
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_DIR = tempfile.TemporaryDirectory(prefix="scribsy-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DIR.name}/test.db"
os.environ["UPLOAD_DIR"] = f"{TEST_DIR.name}/uploads"
os.environ["DEBUG"] = "true"
os.environ["SECRET_KEY"] = "isolated-test-signing-key"
os.environ["USE_S3"] = "false"
os.environ["OPENAI_API_KEY"] = ""

@pytest.fixture(scope="session", autouse=True)
def isolated_database():
    from app.db.database import init_db, engine
    init_db()
    yield
    engine.dispose()
    TEST_DIR.cleanup()
