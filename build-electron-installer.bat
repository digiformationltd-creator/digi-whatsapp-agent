@echo off
title Digi WhatsApp Agent - Build Installer
cd /d "%~dp0"

echo ===================================================
echo   Building Digi WhatsApp Agent Installer & Unpacked
echo ===================================================
echo.

echo [1/2] Compiling Frontend and Backend...
call npm run build
if errorlevel 1 (
  echo [Error] Build failed.
  pause
  exit /b 1
)

echo.
echo [2/2] Running Electron Builder (NSIS Setup + Unpacked)...
call npm run dist:all
if errorlevel 1 (
  echo [Error] Electron builder failed.
  pause
  exit /b 1
)

echo.
echo ===================================================
echo   SUCCESS! Deliverables generated in 'release' folder:
echo   1. Unpacked Executable: release\win-unpacked\Digi WhatsApp Agent.exe
echo   2. Setup Installer: release\Digi WhatsApp Agent Setup 1.0.0.exe
echo ===================================================
pause
