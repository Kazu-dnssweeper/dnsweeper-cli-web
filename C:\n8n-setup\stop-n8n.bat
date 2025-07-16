@echo off
title n8n - Stopping
echo.
echo ╔═══════════════════════════════════════╗
echo ║        Stopping n8n...                ║
echo ╚═══════════════════════════════════════╝
echo.

cd /d C:\n8n

echo Checking Docker Desktop...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker Desktop is not running.
    echo n8n may already be stopped.
    pause
    exit /b 0
)

echo Stopping n8n container...
docker-compose down

if %errorlevel% equ 0 (
    echo.
    echo ✓ n8n stopped successfully!
    echo.
    echo ╔═══════════════════════════════════════╗
    echo ║    n8n has been stopped               ║
    echo ╚═══════════════════════════════════════╝
) else (
    echo.
    echo [ERROR] Failed to stop n8n
    echo Please check if n8n is running.
)

echo.
pause