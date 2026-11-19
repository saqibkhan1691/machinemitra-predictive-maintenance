@echo off
curl -X POST http://localhost:8000/api/train
echo.
echo Check training status at http://localhost:8000/api/train/status
pause
