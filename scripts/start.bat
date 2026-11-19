@echo off
cd /d %~dp0\..
docker compose up --build -d
echo MachineMitra is starting.
echo Frontend: http://localhost:8080
echo API docs: http://localhost:8000/docs
echo MLflow: http://localhost:5000
pause
