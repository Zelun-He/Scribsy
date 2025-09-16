#!/bin/bash

echo "Starting Scribsy backend on Railway..."
echo "PORT: $PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..."

# Test database connection
echo "Testing database connection..."
python -c "
try:
    from app.config import settings
    from app.db.database import engine
    connection = engine.connect()
    connection.close()
    print('✓ Database connection successful')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
    exit(1)
"

# Initialize database
echo "Initializing database..."
if [ "$RESET_DATABASE" = "true" ]; then
    echo "Resetting database due to RESET_DATABASE flag..."
    python -c "
from app.db.database import engine
from app.db.models import Base
print('Dropping all tables...')
Base.metadata.drop_all(bind=engine)
print('All tables dropped.')
"
fi
python init_db.py

# Start the application with gunicorn for production
echo "Starting gunicorn server..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-2} --timeout ${WEB_TIMEOUT:-60}