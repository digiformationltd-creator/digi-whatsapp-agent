@echo off
title WhatsApp Agent - Starting...
echo ============================================
echo   WhatsApp Agent - Standalone
echo ============================================
echo.

cd /d "%~dp0"

if not exist node_modules (
  echo [Setup] Installing dependencies first time...
  call npm install
  if errorlevel 1 (
    echo [Error] npm install failed.
    pause
    exit /b 1
  )
)

echo [Start] Building frontend + backend...
call npm run build
if errorlevel 1 (
  echo [Error] Build failed.
  pause
  exit /b 1
)

echo [Start] Launching WhatsApp Agent on http://localhost:9010 ...
start /b "" cmd /c "timeout /t 2 >nul & start http://localhost:9010"
node dist/backend/server.cjs

pause
