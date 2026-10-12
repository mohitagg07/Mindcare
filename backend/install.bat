@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist ".env" copy .env.example .env
echo.
echo Installed MindCare API dependencies.
echo Edit backend\.env with SUPABASE_URL, SUPABASE_ANON_KEY and GROQ_API_KEY.
echo Run: uvicorn main:app --reload --host 127.0.0.1 --port 8000
endlocal
