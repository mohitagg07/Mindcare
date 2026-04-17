@echo off
echo ============================================
echo  MindCare - Auto Installer (Python 3.14+)
echo ============================================
echo.

:: Step 1 - Upgrade pip
echo [1/5] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo Done.

:: Step 2 - Install wheel and build tools
echo [2/5] Installing build tools...
pip install wheel setuptools --upgrade --quiet --prefer-binary
echo Done.

:: Step 3 - Install pydantic first (the tricky one)
echo [3/5] Installing pydantic (this may take a moment)...
pip install "pydantic[email]>=2.9.0" --prefer-binary --quiet
if %errorlevel% neq 0 (
    echo ERROR: pydantic failed. Trying alternative...
    pip install pydantic --upgrade --prefer-binary
)
echo Done.

:: Step 4 - Install all requirements
echo [4/5] Installing all requirements...
pip install -r requirements.txt --prefer-binary --quiet
if %errorlevel% neq 0 (
    echo.
    echo First attempt failed. Trying without version pins...
    pip install -r requirements.txt --prefer-binary --upgrade
)
echo Done.

:: Step 5 - Verify
echo [5/5] Verifying installation...
python -c "import fastapi, groq, langchain, chromadb, pydantic; print('All core packages OK')"
if %errorlevel% neq 0 (
    echo WARNING: Some packages may have issues. Check errors above.
) else (
    echo.
    echo ============================================
    echo  Installation Complete!
    echo  Now run: uvicorn main:app --reload --port 8000
    echo ============================================
)
pause
