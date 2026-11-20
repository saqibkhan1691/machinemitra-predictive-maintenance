@echo off
cd /d %~dp0\..

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [NOTICE] Docker is not installed or not in PATH.
    echo Switching to local native mode...
    echo.
    call scripts\start_local.bat
    exit /b
)

echo Starting MachineMitra with Docker Compose...
docker compose up --build -d
echo.
echo MachineMitra is starting:
echo - Frontend: http://localhost:8080
echo - API docs: http://localhost:8000/docs
echo - MLflow:   http://localhost:5000
pause
