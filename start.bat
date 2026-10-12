@echo off
setlocal
if not defined WINDIR set "WINDIR=C:\Windows"
set "ComSpec=%WINDIR%\System32\cmd.exe"
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" python -m venv backend\.venv
if errorlevel 1 (
  echo Could not create the Python virtual environment.
  pause
  exit /b 1
)
call backend\.venv\Scripts\activate.bat
python -m pip install -r backend\requirements.txt
if errorlevel 1 (
  echo Backend dependency installation failed. Review the error above.
  pause
  exit /b 1
)
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
if not exist "frontend\.env" copy "frontend\.env.example" "frontend\.env" >nul

start "MindCare API" /D "%~dp0backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"
cd /d "%~dp0frontend"
if not exist node_modules (
  call npm ci
  if errorlevel 1 (
    echo Frontend dependency installation failed. Review the error above.
    pause
    exit /b 1
  )
)
call npm run dev
