@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Match Verdict - Vite Dev Server Launcher
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Vite + API server at http://localhost:3000 ...
start "" "http://localhost:3000"
call npm run dev
pause
