# n8n Complete Setup Script for Windows
# This script automates the entire n8n setup process on Windows

# Set script encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Colors for output
$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "✓ $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "ℹ $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "⚠ $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "✗ $message"
}

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check Docker Desktop installation
function Test-DockerDesktop {
    Write-Info "Checking Docker Desktop installation..."
    
    try {
        $dockerVersion = docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Desktop is installed: $dockerVersion"
            
            # Check if Docker is running
            $dockerInfo = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker Desktop is running"
                return $true
            } else {
                Write-Warning "Docker Desktop is installed but not running"
                Write-Info "Starting Docker Desktop..."
                
                # Try to start Docker Desktop
                $dockerDesktopPath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
                if (Test-Path $dockerDesktopPath) {
                    Start-Process $dockerDesktopPath
                    Write-Info "Waiting for Docker Desktop to start (this may take a minute)..."
                    
                    $maxAttempts = 30
                    $attempt = 0
                    while ($attempt -lt $maxAttempts) {
                        Start-Sleep -Seconds 2
                        $dockerInfo = docker info 2>&1
                        if ($LASTEXITCODE -eq 0) {
                            Write-Success "Docker Desktop started successfully"
                            return $true
                        }
                        $attempt++
                    }
                }
                Write-Error "Failed to start Docker Desktop automatically"
                return $false
            }
        }
    } catch {
        Write-Error "Docker Desktop is not installed"
        Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        return $false
    }
    
    return $false
}

# Create n8n folder structure
function Initialize-N8nFolders {
    Write-Info "Creating n8n folder structure..."
    
    $folders = @(
        "C:\n8n",
        "C:\n8n\data",
        "C:\n8n\config",
        "C:\n8n\workflows",
        "C:\n8n\backups",
        "C:\n8n\logs",
        "C:\n8n\scripts"
    )
    
    foreach ($folder in $folders) {
        if (!(Test-Path $folder)) {
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
            Write-Success "Created folder: $folder"
        } else {
            Write-Info "Folder already exists: $folder"
        }
    }
}

# Create docker-compose.yml
function New-DockerComposeFile {
    Write-Info "Creating docker-compose.yml..."
    
    $dockerComposeContent = @'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_USER_MANAGEMENT_DISABLED=false
      - N8N_EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - N8N_EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
      - N8N_EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
      - N8N_LOG_LEVEL=info
      - N8N_VERSION_NOTIFICATIONS_ENABLED=true
      - GENERIC_TIMEZONE=Asia/Tokyo
      - TZ=Asia/Tokyo
      - N8N_WEBHOOK_URL=http://localhost:5678/
    volumes:
      - ./data:/home/node/.n8n
      - ./config:/home/node/.n8n/config
      - ./workflows:/home/node/.n8n/workflows
      - ./backups:/home/node/.n8n/backups
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

networks:
  default:
    name: n8n-network
'@
    
    $dockerComposePath = "C:\n8n\docker-compose.yml"
    Set-Content -Path $dockerComposePath -Value $dockerComposeContent -Encoding UTF8
    Write-Success "Created docker-compose.yml"
}

# Create .env file
function New-EnvFile {
    Write-Info "Creating .env file..."
    
    # Generate encryption key
    $encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    $envContent = @"
# n8n Environment Variables
N8N_ENCRYPTION_KEY=$encryptionKey

# Database settings (optional - SQLite by default)
# DB_TYPE=postgresdb
# DB_POSTGRESDB_DATABASE=n8n
# DB_POSTGRESDB_HOST=localhost
# DB_POSTGRESDB_PORT=5432
# DB_POSTGRESDB_USER=postgres
# DB_POSTGRESDB_PASSWORD=

# Email settings (optional)
# N8N_EMAIL_MODE=smtp
# N8N_SMTP_HOST=
# N8N_SMTP_PORT=
# N8N_SMTP_USER=
# N8N_SMTP_PASS=
# N8N_SMTP_SENDER=

# Other settings
N8N_METRICS=false
N8N_BASIC_AUTH_ACTIVE=false
"@
    
    $envPath = "C:\n8n\.env"
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Success "Created .env file with encryption key"
}

# Download and setup ngrok
function Install-Ngrok {
    Write-Info "Setting up ngrok..."
    
    $ngrokPath = "C:\n8n\scripts\ngrok.exe"
    
    if (Test-Path $ngrokPath) {
        Write-Info "ngrok already exists"
        return $true
    }
    
    try {
        Write-Info "Downloading ngrok..."
        $ngrokUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
        $zipPath = "C:\n8n\scripts\ngrok.zip"
        
        # Download ngrok
        Invoke-WebRequest -Uri $ngrokUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract ngrok
        Expand-Archive -Path $zipPath -DestinationPath "C:\n8n\scripts" -Force
        Remove-Item $zipPath
        
        Write-Success "ngrok downloaded and extracted"
        
        # Create ngrok config
        $ngrokConfig = @"
version: "2"
authtoken: # Add your authtoken here
tunnels:
  n8n:
    proto: http
    addr: 5678
    bind_tls: true
"@
        
        $ngrokConfigPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"
        $ngrokConfigDir = Split-Path $ngrokConfigPath -Parent
        
        if (!(Test-Path $ngrokConfigDir)) {
            New-Item -ItemType Directory -Path $ngrokConfigDir -Force | Out-Null
        }
        
        Set-Content -Path $ngrokConfigPath -Value $ngrokConfig -Encoding UTF8
        Write-Success "Created ngrok configuration"
        
        return $true
    } catch {
        Write-Error "Failed to download ngrok: $_"
        return $false
    }
}

# Start n8n
function Start-N8n {
    Write-Info "Starting n8n..."
    
    Set-Location -Path "C:\n8n"
    
    try {
        # Pull latest n8n image
        Write-Info "Pulling latest n8n image..."
        docker pull n8nio/n8n:latest
        
        # Start n8n using docker-compose
        Write-Info "Starting n8n container..."
        docker-compose up -d
        
        # Wait for n8n to be ready
        Write-Info "Waiting for n8n to be ready..."
        $maxAttempts = 30
        $attempt = 0
        
        while ($attempt -lt $maxAttempts) {
            Start-Sleep -Seconds 2
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Success "n8n is running and ready!"
                    Write-Info "Access n8n at: http://localhost:5678"
                    return $true
                }
            } catch {
                # Continue waiting
            }
            $attempt++
        }
        
        Write-Error "n8n failed to start within the expected time"
        return $false
    } catch {
        Write-Error "Failed to start n8n: $_"
        return $false
    }
}

# Create environment check script
function New-EnvironmentCheckScript {
    Write-Info "Creating environment check script..."
    
    $checkScript = @'
# n8n Environment Check Script

Write-Host "n8n Environment Check" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Check Docker
Write-Host "`nChecking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker: $dockerVersion" -ForegroundColor Green
    
    $dockerRunning = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker is not running" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Docker is not installed" -ForegroundColor Red
}

# Check n8n container
Write-Host "`nChecking n8n container..." -ForegroundColor Yellow
$container = docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
if ($container -match "n8n") {
    Write-Host "✓ n8n container is running" -ForegroundColor Green
    Write-Host $container
} else {
    Write-Host "✗ n8n container is not running" -ForegroundColor Red
}

# Check n8n web interface
Write-Host "`nChecking n8n web interface..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ n8n web interface is accessible at http://localhost:5678" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ n8n web interface is not accessible" -ForegroundColor Red
}

# Check ngrok
Write-Host "`nChecking ngrok..." -ForegroundColor Yellow
$ngrokPath = "C:\n8n\scripts\ngrok.exe"
if (Test-Path $ngrokPath) {
    Write-Host "✓ ngrok is installed" -ForegroundColor Green
    & $ngrokPath version
} else {
    Write-Host "✗ ngrok is not installed" -ForegroundColor Red
}

# Check folder structure
Write-Host "`nChecking folder structure..." -ForegroundColor Yellow
$folders = @("C:\n8n", "C:\n8n\data", "C:\n8n\config", "C:\n8n\workflows", "C:\n8n\backups", "C:\n8n\logs")
foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "✓ $folder exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $folder missing" -ForegroundColor Red
    }
}

Write-Host "`nEnvironment check complete!" -ForegroundColor Cyan
Read-Host "Press Enter to exit"
'@
    
    $checkScriptPath = "C:\n8n\scripts\check-environment.ps1"
    Set-Content -Path $checkScriptPath -Value $checkScript -Encoding UTF8
    Write-Success "Created environment check script"
}

# Main setup function
function Start-Setup {
    Write-Host @"
╔═══════════════════════════════════════╗
║     n8n Complete Setup for Windows    ║
║            Version 1.0                ║
╚═══════════════════════════════════════╝
"@ -ForegroundColor Cyan

    # Check if running as Administrator
    if (!(Test-Administrator)) {
        Write-Error "This script must be run as Administrator"
        Write-Info "Please right-click and select 'Run as Administrator'"
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Step 1: Check Docker Desktop
    if (!(Test-DockerDesktop)) {
        Write-Error "Docker Desktop is required but not available"
        Write-Info "Please install Docker Desktop and try again"
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Step 2: Create folder structure
    Initialize-N8nFolders

    # Step 3: Create docker-compose.yml
    New-DockerComposeFile

    # Step 4: Create .env file
    New-EnvFile

    # Step 5: Download ngrok
    Install-Ngrok

    # Step 6: Create environment check script
    New-EnvironmentCheckScript

    # Step 7: Start n8n
    if (Start-N8n) {
        Write-Host @"

╔═══════════════════════════════════════╗
║        Setup Complete!                ║
╚═══════════════════════════════════════╝

n8n is now running at: http://localhost:5678

Next steps:
1. Open http://localhost:5678 in your browser
2. Create your n8n account
3. Start building workflows!

Useful commands:
- Check status: docker ps
- View logs: docker logs n8n
- Stop n8n: docker-compose down
- Start n8n: docker-compose up -d

"@ -ForegroundColor Green
    } else {
        Write-Error "Setup completed but n8n failed to start"
        Write-Info "Check the logs with: docker logs n8n"
    }
}

# Error handling wrapper
try {
    Start-Setup
} catch {
    Write-Error "An unexpected error occurred: $_"
    Write-Info "Please check the error message and try again"
} finally {
    Read-Host "Press Enter to exit"
}