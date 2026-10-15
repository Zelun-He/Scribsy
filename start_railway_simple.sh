#!/bin/bash
set -euo pipefail

echo "Starting Scribsy backend on Railway (Simple Mode)..."

# Complete additive migrations before workers accept requests. Transient database
# restarts are retried; a failed initialization stops this deployment.
python -m app.db.bootstrap

echo "Starting gunicorn server..."
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind "0.0.0.0:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-1}" --timeout "${WEB_TIMEOUT:-180}"

