#!/bin/bash

echo "Starting Scribsy backend on Railway (Simple Mode)..."

# Start the application directly without database initialization
echo "Starting gunicorn server..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-2} --timeout ${WEB_TIMEOUT:-60}

