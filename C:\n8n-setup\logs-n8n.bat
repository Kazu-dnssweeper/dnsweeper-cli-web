@echo off
title n8n - Logs
echo.
echo ╔═══════════════════════════════════════╗
echo ║        n8n Container Logs             ║
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

echo Checking n8n container...
docker ps | findstr n8n >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] n8n container is not running.
    echo.
    echo Showing last 50 lines of logs...
    echo ════════════════════════════════════════
    docker logs n8n --tail 50
) else (
    echo n8n is running. Press Ctrl+C to stop viewing logs.
    echo ════════════════════════════════════════
    docker logs n8n --follow
)

echo.
pause