@echo off
title Digi WhatsApp Agent - Desktop App
cd /d "%~dp0"

if exist "release\win-unpacked\Digi WhatsApp Agent.exe" (
  echo [Starting] Launching Digi WhatsApp Agent Desktop App...
  start "" "release\win-unpacked\Digi WhatsApp Agent.exe"
) else (
  echo [Starting] Launching in Electron development mode...
  call npm run electron:start
)
