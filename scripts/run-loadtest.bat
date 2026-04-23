@echo off
setlocal enabledelayedexpansion
title CodRoom Load Test

echo.
echo ============================================================
echo  CodRoom Load Test Runner
echo ============================================================
echo.

:: ── 1. Locate k6 ────────────────────────────────────────────────────────────
echo [1/3] Locating k6...

set K6=k6
where k6 >nul 2>&1
if %errorlevel% neq 0 (
  if exist "C:\Program Files\k6\k6.exe" (
    set K6=C:\Program Files\k6\k6.exe
    echo  Found k6 at C:\Program Files\k6\k6.exe
  ) else if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\GrafanaLabs.k6_Microsoft.Winget.Source_8wekyb3d8bbwe\k6.exe" (
    set K6=%LOCALAPPDATA%\Microsoft\WinGet\Packages\GrafanaLabs.k6_Microsoft.Winget.Source_8wekyb3d8bbwe\k6.exe
    echo  Found k6 at winget path.
  ) else (
    echo.
    echo  ERROR: k6 not found. Add C:\Program Files\k6 to PATH and re-run.
    pause
    exit /b 1
  )
) else (
  echo  k6 found in PATH.
)

:: ── 2. Seed load-test user + room ────────────────────────────────────────────
echo.
echo [2/3] Seeding load-test user and room...
node scripts/seed-loadtest.js
if %errorlevel% neq 0 (
  echo  ERROR: Seed failed. Is the app running and DATABASE_URL set in .env?
  pause
  exit /b 1
)

:: ── 3. Read env from seed output ─────────────────────────────────────────────
echo.
echo [3/3] Reading seed output...

for /f "delims=" %%i in ('node -e "const d=require('./scripts/.loadtest-env.json');console.log(d.roomId)"') do set ROOM_ID=%%i
for /f "delims=" %%i in ('node -e "const d=require('./scripts/.loadtest-env.json');console.log(d.joinToken)"') do set JOIN_TOKEN=%%i
for /f "delims=" %%i in ('node -e "const d=require('./scripts/.loadtest-env.json');console.log('codroom-token='+d.jwt)"') do set AUTH_COOKIE=%%i
for /f "delims=" %%i in ('node -e "const d=require('./scripts/.loadtest-env.json');console.log(d.roomTicket)"') do set ROOM_TICKET=%%i

if "%ROOM_ID%"=="" (
  echo  ERROR: Could not read ROOM_ID from .loadtest-env.json
  pause
  exit /b 1
)

echo  ROOM_ID    = %ROOM_ID%
echo  BASE_URL   = http://localhost:3000
echo  SOCKET_URL = ws://localhost:3001
echo.

:: ── 4. Run k6 ────────────────────────────────────────────────────────────────
set TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%-%TIME:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set RESULTS_FILE=scripts\results-%TIMESTAMP%.json
set SUMMARY_FILE=scripts\summary-%TIMESTAMP%.json

"%K6%" run ^
  -e BASE_URL=http://localhost:3000 ^
  -e SOCKET_URL=ws://localhost:3001 ^
  -e ROOM_ID=%ROOM_ID% ^
  -e JOIN_TOKEN=%JOIN_TOKEN% ^
  -e AUTH_COOKIE="%AUTH_COOKIE%" ^
  -e ROOM_TICKET="%ROOM_TICKET%" ^
  --out json=%RESULTS_FILE% ^
  --summary-export=%SUMMARY_FILE% ^
  scripts/load-test.js

echo.
echo ============================================================
echo  Done.
echo  Raw NDJSON : %RESULTS_FILE%
echo  Summary    : %SUMMARY_FILE%
echo ============================================================
echo.
pause
