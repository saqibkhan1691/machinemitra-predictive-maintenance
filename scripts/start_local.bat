@echo off
cd /d %~dp0\..
echo ======================================================================
echo   Starting MachineMitra in Local Mode (Native Windows)
echo ======================================================================

echo.
echo [1/3] Running Backend Verification Tests...
set PYTHON_BIN=.venv\Scripts\python.exe
if not exist "%PYTHON_BIN%" (
    set PYTHON_BIN=python
)

"%PYTHON_BIN%" -m pytest backend/tests -v -s
echo.
echo [2/3] Checking Dependencies...

if not exist "frontend\node_modules" (
    echo Installing Frontend dependencies...
    cd frontend && call npm install && cd ..
)

echo.
echo [3/3] Launching Services...
echo - Starting FastAPI Backend on Port 8000...
start "MachineMitra Backend" cmd /k "cd /d %~dp0\.. && set PYTHONPATH=backend&& "%PYTHON_BIN%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

echo - Starting Vite Frontend on Port 5173...
start "MachineMitra Frontend" cmd /k "cd /d %~dp0\..\frontend && npm run dev"

echo.
echo ======================================================================
echo   MachineMitra is LIVE!
echo   * Frontend Web UI:  http://localhost:5173
echo   * Backend REST API: http://localhost:8000/docs
echo   * Active Model:     Candidate_XGBoost v2 (Updated Retrained Model)
echo ======================================================================

timeout /t 3 >nul
start http://localhost:5173
pause
