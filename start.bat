@echo off
echo Starting MindCare v3.0...

:: Backend
cd backend
if not exist .env copy .env.example .env
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt -q
start /B uvicorn main:app --reload --port 8000
cd ..

timeout /t 3 >nul

:: Frontend
cd frontend
if not exist .env echo VITE_API_URL=http://localhost:8000 > .env
call npm install -q
start /B npm run dev
cd ..

echo.
echo MindCare running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
pause
