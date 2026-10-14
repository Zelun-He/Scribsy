"""Initialize the production schema before starting the HTTP server."""
import logging
import os
import time

from sqlalchemy.exc import OperationalError

from app.db.database import engine, init_db

logger = logging.getLogger(__name__)


def initialize_database(max_attempts=None, retry_delay=None):
    attempts = max_attempts if max_attempts is not None else int(os.getenv("DB_INIT_MAX_ATTEMPTS", "20"))
    delay = retry_delay if retry_delay is not None else float(os.getenv("DB_INIT_RETRY_DELAY", "5"))
    if attempts < 1 or delay < 0:
        raise ValueError("Database initialization requires positive attempts and a nonnegative retry delay")
    for attempt in range(1, attempts + 1):
        try:
            init_db()
            logger.info("Database schema initialized")
            return
        except OperationalError:
            engine.dispose()
            if attempt == attempts:
                logger.exception("Database initialization failed after %s attempts", attempts)
                raise
            logger.warning("Database temporarily unavailable; initialization attempt %s/%s", attempt, attempts)
            time.sleep(delay)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    initialize_database()
