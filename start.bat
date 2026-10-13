@echo off
setlocal
cd /d "%~dp0"
title BeatSync

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js: https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [BeatSync] Installing root dependencies...
    call npm install
)

if not exist "apps\web\node_modules\" (
    echo [BeatSync] Installing frontend dependencies...
    call npm --prefix apps/web install
)

node scripts/start-all.mjs

if %errorlevel% neq 0 (
    echo.
    echo Server exited with an error.
    pause
)
endlocal
