#!/bin/bash

# Set default port if not provided
export PORT=${PORT:-8000}

echo "Starting Scribsy backend on port $PORT"

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
