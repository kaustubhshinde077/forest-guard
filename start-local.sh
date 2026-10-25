#!/usr/bin/env bash
set -e

echo "================================================================="
echo "FOREST GUARD — LOCAL RUN SCRIPT (ZERO CLOUD COST)"
echo "================================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
    echo "Virtual environment .venv not found. Creating..."
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi

echo "Starting FastAPI Backend on port 8000..."
export PYTHONPATH="$ROOT_DIR/src"
export FORESTGUARD_DATA_DIR="$ROOT_DIR/data"
export FORESTGUARD_FIXTURES_DIR="$ROOT_DIR/data/fixtures"

.venv/bin/uvicorn forestguard.api.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting Next.js Frontend on port 3000..."
cd "$ROOT_DIR/web"
npm run dev &
FRONTEND_PID=$!

trap "echo 'Shutting down services...'; kill $BACKEND_PID $FRONTEND_PID" EXIT

echo ""
echo "Forest Guard is running!"
echo "-> Frontend Dashboard: http://localhost:3000"
echo "-> Backend REST API:   http://localhost:8000/docs"
echo "Press Ctrl+C to stop."

wait
