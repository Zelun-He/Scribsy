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

# Start the application
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info