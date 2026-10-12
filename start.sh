#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d backend/.venv ]; then python3 -m venv backend/.venv; fi
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
[ -f backend/.env ] || cp backend/.env.example backend/.env
( cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000 ) &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT
cd frontend
[ -d node_modules ] || npm install
[ -f .env ] || cp .env.example .env
npm run dev
