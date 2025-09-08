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
python init_db.py

# Start the application with gunicorn for production
echo "Starting gunicorn server..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-2} --timeout ${WEB_TIMEOUT:-60}