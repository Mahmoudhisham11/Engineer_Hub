@echo off
title EngineerHub Launcher
echo ========================================================
echo        EngineerHub - DME Technical Office Management
echo ========================================================
echo.

:: 1. Start Python FastAPI Backend
echo [*] Starting Python FastAPI Backend on port 8000...
start "EngineerHub Backend API" cmd /k "cd /d %~dp0 && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 2. Start Electron Desktop Application
echo [*] Starting EngineerHub Desktop Application...
cd /d %~dp0frontend
npm run desktop

pause
