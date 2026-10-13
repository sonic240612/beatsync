@echo off
setlocal
cd /d "%~dp0"
title BeatSync Stop

echo [BeatSync] Stopping servers on port 3000 and 3001...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [BeatSync] All servers stopped successfully.
pause
endlocal
