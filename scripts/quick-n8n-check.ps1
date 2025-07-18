# Quick n8n Status Check Script
# Generated by Claude API

$containerName = "n8n"

Write-Host "n8n Quick Status Check" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker not found" -ForegroundColor Red
    exit 1
}

# Check n8n container
$containerStatus = docker inspect --format="{{.State.Status}}" $containerName 2>$null
if ($containerStatus) {
    Write-Host "✓ n8n container: $containerStatus" -ForegroundColor Green
    
    if ($containerStatus -eq "running") {
        # Check web interface
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ n8n web interface: accessible" -ForegroundColor Green
            }
        } catch {
            Write-Host "✗ n8n web interface: not accessible" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ n8n container: not found" -ForegroundColor Red
}

# Show recent logs
Write-Host "`nRecent logs:" -ForegroundColor Yellow
docker logs $containerName --tail 5 2>$null