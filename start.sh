#!/usr/bin/env bash
set -e
echo "🧠 Starting MindCare v3.0..."

# Backend
echo "▶ Starting Backend..."
cd backend
[ ! -f .env ] && cp .env.example .env && echo "⚠  Created .env from example — fill in your API keys!"
python -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend
echo "▶ Starting Frontend..."
cd frontend
[ ! -f .env ] && echo "VITE_API_URL=http://localhost:8000" > .env
npm install -q
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ MindCare running!"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:8000"
echo "   API Docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
