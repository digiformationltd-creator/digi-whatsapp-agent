@echo off
title WhatsApp Agent - Dev Mode
echo ============================================
echo   WhatsApp Agent - Development Mode
echo ============================================
echo Backend:  http://localhost:9000
echo Frontend: http://localhost:5173 (proxies /api to backend)
echo.
cd /d "%~dp0"
start "WA-Agent-Backend" cmd /k "npm run dev"
timeout /t 3 >nul
start "WA-Agent-Frontend" cmd /k "npm run frontend:dev"
timeout /t 3 >nul
start "" http://localhost:5173
