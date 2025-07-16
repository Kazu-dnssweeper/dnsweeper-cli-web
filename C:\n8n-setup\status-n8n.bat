@echo off
title n8n - Status Check
echo.
echo ╔═══════════════════════════════════════╗
echo ║        n8n Status Check               ║
echo ╚═══════════════════════════════════════╝
echo.

echo [1] Docker Desktop Status
echo ════════════════════════
docker version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Docker Desktop is running
    docker version
) else (
    echo ✗ Docker Desktop is not running
)

echo.
echo [2] n8n Container Status
echo ════════════════════════
docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo [3] n8n Web Interface
echo ════════════════════════
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5678/healthz' -UseBasicParsing -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { Write-Host '✓ n8n web interface is accessible' -ForegroundColor Green; Write-Host '  URL: http://localhost:5678' } } catch { Write-Host '✗ n8n web interface is not accessible' -ForegroundColor Red }"

echo.
echo [4] Docker Resources
echo ════════════════════════
docker stats n8n --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

echo.
echo [5] n8n Data Directory
echo ════════════════════════
if exist "C:\n8n\data" (
    echo ✓ Data directory exists: C:\n8n\data
    echo.
    echo Directory contents:
    dir C:\n8n\data /b
) else (
    echo ✗ Data directory not found
)

echo.
echo [6] Recent Logs (last 10 lines)
echo ════════════════════════
docker logs n8n --tail 10 2>&1

echo.
echo ════════════════════════
echo Status check complete!
echo.
pause