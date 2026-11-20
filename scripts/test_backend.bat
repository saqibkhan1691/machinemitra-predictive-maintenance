@echo off
cd /d %~dp0\..
echo ======================================================================
echo   MachineMitra Backend Test Suite Execution
echo ======================================================================
set PYTHON_BIN=.venv\Scripts\python.exe
if not exist "%PYTHON_BIN%" (
    set PYTHON_BIN=python
)

"%PYTHON_BIN%" -m pytest backend/tests -v -s
echo.
pause
