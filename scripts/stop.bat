@echo off
cd /d %~dp0\..
echo Stopping MachineMitra services...

where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    docker compose down
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Terminating backend process PID %%a...
    taskkill /F /PID %%a >nul 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Terminating frontend process PID %%a...
    taskkill /F /PID %%a >nul 2>nul
)

echo MachineMitra services stopped.
pause
