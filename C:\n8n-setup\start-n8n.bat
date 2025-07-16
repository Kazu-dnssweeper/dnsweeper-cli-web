@echo off
title n8n - Starting
echo.
echo ╔═══════════════════════════════════════╗
echo ║        Starting n8n...                ║
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

echo Starting n8n container...
docker-compose up -d

if %errorlevel% equ 0 (
    echo.
    echo ✓ n8n started successfully!
    echo.
    echo Waiting for n8n to be ready...
    timeout /t 5 /nobreak >nul
    
    echo.
    echo ╔═══════════════════════════════════════╗
    echo ║    n8n is now running!                ║
    echo ║    Access at: http://localhost:5678   ║
    echo ╚═══════════════════════════════════════╝
    echo.
    echo Opening n8n in your browser...
    timeout /t 2 /nobreak >nul
    start http://localhost:5678
) else (
    echo.
    echo [ERROR] Failed to start n8n
    echo Please check Docker logs for more information.
)

echo.
pause