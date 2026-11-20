@echo off
echo Stopping MachineMitra local servers...
powershell -Command "Get-Process -Name node, uvicorn, mlflow -ErrorAction SilentlyContinue | Stop-Process -Force"
echo All local services stopped.
pause
