@echo off
title n8n - Restarting
echo.
echo ╔═══════════════════════════════════════╗
echo ║        Restarting n8n...              ║
echo ╚═══════════════════════════════════════╝
echo.

cd /d C:\n8n

echo Checking Docker Desktop...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running!
    echo Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Stopping n8n container...
docker-compose down

echo.
echo Waiting for cleanup...
timeout /t 3 /nobreak >nul

echo Starting n8n container...
docker-compose up -d

if %errorlevel% equ 0 (
    echo.
    echo ✓ n8n restarted successfully!
    echo.
    echo Waiting for n8n to be ready...
    timeout /t 5 /nobreak >nul
    
    echo.
    echo ╔═══════════════════════════════════════╗
    echo ║    n8n is now running!                ║
    echo ║    Access at: http://localhost:5678   ║
    echo ╚═══════════════════════════════════════╝
) else (
    echo.
    echo [ERROR] Failed to restart n8n
    echo Please check Docker logs for more information.
)

echo.
pause