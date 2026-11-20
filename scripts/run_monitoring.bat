@echo off
cd /d %~dp0\..
echo ======================================================================
echo   MachineMitra MLOps Monitoring ^& Retraining Pipeline
echo ======================================================================

set PYTHON_BIN=.venv\Scripts\python.exe
if not exist "%PYTHON_BIN%" (
    set PYTHON_BIN=python
)

"%PYTHON_BIN%" ml_pipeline\run_monitoring_pipeline.py %*

echo.
echo Pipeline run finished. Check reports in the 'reports\' directory.
pause
