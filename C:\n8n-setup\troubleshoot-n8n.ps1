# n8n Troubleshooting and Diagnostics Tool
# This script performs comprehensive diagnostics and provides solutions

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Initialize diagnostic results
$diagnosticResults = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    System = @{}
    Docker = @{}
    N8n = @{}
    Network = @{}
    Issues = @()
    Solutions = @()
}

function Write-DiagHeader($title) {
    Write-Host "`n╔═══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $title" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host "ℹ $message" -ForegroundColor Cyan
}

# Check System Requirements
function Test-SystemRequirements {
    Write-DiagHeader "System Requirements Check"
    
    # OS Version
    $os = Get-CimInstance Win32_OperatingSystem
    $diagnosticResults.System.OS = "$($os.Caption) $($os.Version)"
    Write-Info "OS: $($diagnosticResults.System.OS)"
    
    # Check if Windows 10/11
    if ($os.Version -match "^10\.") {
        Write-Success "Windows version compatible"
    } else {
        Write-Warning "Older Windows version detected. Windows 10 or later recommended."
        $diagnosticResults.Issues += "Older Windows version"
    }
    
    # Memory Check
    $totalMemoryGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeMemoryGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $diagnosticResults.System.TotalMemory = "$totalMemoryGB GB"
    $diagnosticResults.System.FreeMemory = "$freeMemoryGB GB"
    
    Write-Info "Total Memory: $totalMemoryGB GB"
    Write-Info "Free Memory: $freeMemoryGB GB"
    
    if ($totalMemoryGB -lt 8) {
        Write-Warning "Less than 8GB RAM. n8n may run slowly."
        $diagnosticResults.Issues += "Low memory"
        $diagnosticResults.Solutions += "Consider upgrading to at least 8GB RAM for optimal performance"
    } else {
        Write-Success "Sufficient memory available"
    }
    
    # Disk Space Check
    $drive = Get-PSDrive C
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    $diagnosticResults.System.FreeDiskSpace = "$freeSpaceGB GB"
    
    Write-Info "Free disk space on C: $freeSpaceGB GB"
    
    if ($freeSpaceGB -lt 10) {
        Write-Warning "Low disk space. Less than 10GB free."
        $diagnosticResults.Issues += "Low disk space"
        $diagnosticResults.Solutions += "Free up disk space. At least 10GB recommended for n8n and Docker"
    } else {
        Write-Success "Sufficient disk space available"
    }
    
    # Check Hyper-V/Virtualization
    $hyperv = Get-WindowsOptionalFeature -FeatureName Microsoft-Hyper-V-All -Online
    if ($hyperv.State -eq "Enabled") {
        Write-Success "Hyper-V enabled (required for Docker)"
        $diagnosticResults.System.HyperV = "Enabled"
    } else {
        Write-Error "Hyper-V not enabled"
        $diagnosticResults.Issues += "Hyper-V disabled"
        $diagnosticResults.Solutions += "Enable Hyper-V: Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All"
        $diagnosticResults.System.HyperV = "Disabled"
    }
}

# Check Docker Installation and Status
function Test-DockerStatus {
    Write-DiagHeader "Docker Desktop Diagnostics"
    
    # Check if Docker is installed
    $dockerPath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Write-Success "Docker Desktop installed"
        $diagnosticResults.Docker.Installed = $true
        
        # Check Docker version
        try {
            $dockerVersion = docker --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker CLI accessible: $dockerVersion"
                $diagnosticResults.Docker.Version = $dockerVersion
                
                # Check if Docker daemon is running
                $dockerInfo = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Docker daemon is running"
                    $diagnosticResults.Docker.Running = $true
                    
                    # Get Docker system info
                    $containers = docker ps -a --format "table {{.Names}}\t{{.Status}}" 2>&1
                    Write-Info "Docker containers:"
                    Write-Host $containers
                    
                } else {
                    Write-Error "Docker daemon is not running"
                    $diagnosticResults.Docker.Running = $false
                    $diagnosticResults.Issues += "Docker daemon not running"
                    $diagnosticResults.Solutions += @"
Start Docker Desktop:
1. Click Start menu
2. Search for 'Docker Desktop'
3. Click to launch
4. Wait for Docker to fully start (whale icon in system tray)
"@
                }
            }
        } catch {
            Write-Error "Docker CLI not accessible"
            $diagnosticResults.Docker.CLIAccessible = $false
            $diagnosticResults.Issues += "Docker CLI not in PATH"
            $diagnosticResults.Solutions += "Restart your computer after Docker Desktop installation"
        }
    } else {
        Write-Error "Docker Desktop not installed"
        $diagnosticResults.Docker.Installed = $false
        $diagnosticResults.Issues += "Docker Desktop not installed"
        $diagnosticResults.Solutions += @"
Install Docker Desktop:
1. Download from: https://www.docker.com/products/docker-desktop
2. Run the installer
3. Restart your computer
4. Launch Docker Desktop
"@
    }
}

# Check n8n Status
function Test-N8nStatus {
    Write-DiagHeader "n8n Container Diagnostics"
    
    if ($diagnosticResults.Docker.Running) {
        # Check if n8n container exists
        $n8nContainer = docker ps -a --filter "name=n8n" --format "{{.Names}}" 2>&1
        
        if ($n8nContainer -eq "n8n") {
            Write-Success "n8n container exists"
            $diagnosticResults.N8n.ContainerExists = $true
            
            # Check container status
            $containerStatus = docker inspect n8n --format "{{.State.Status}}" 2>&1
            Write-Info "Container status: $containerStatus"
            $diagnosticResults.N8n.Status = $containerStatus
            
            if ($containerStatus -eq "running") {
                Write-Success "n8n container is running"
                
                # Check container health
                $health = docker inspect n8n --format "{{.State.Health.Status}}" 2>&1
                if ($health -ne "") {
                    Write-Info "Container health: $health"
                    $diagnosticResults.N8n.Health = $health
                }
                
                # Check web interface
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
                    if ($response.StatusCode -eq 200) {
                        Write-Success "n8n web interface is accessible"
                        $diagnosticResults.N8n.WebInterfaceAccessible = $true
                    }
                } catch {
                    Write-Error "n8n web interface not accessible"
                    $diagnosticResults.N8n.WebInterfaceAccessible = $false
                    $diagnosticResults.Issues += "n8n web interface not accessible"
                    $diagnosticResults.Solutions += "Check if port 5678 is blocked by firewall or another application"
                }
                
            } else {
                Write-Error "n8n container is not running (Status: $containerStatus)"
                $diagnosticResults.Issues += "n8n container stopped"
                
                # Get container logs for error analysis
                Write-Info "Checking container logs for errors..."
                $logs = docker logs n8n --tail 20 2>&1
                
                # Analyze common error patterns
                if ($logs -match "Error: EACCES|Permission denied") {
                    $diagnosticResults.Issues += "Permission issues"
                    $diagnosticResults.Solutions += @"
Fix permission issues:
1. Run as Administrator: docker-compose down
2. Delete C:\n8n\data folder
3. Recreate with proper permissions
4. Run: docker-compose up -d
"@
                }
                
                if ($logs -match "Error: Cannot find module") {
                    $diagnosticResults.Issues += "Missing dependencies"
                    $diagnosticResults.Solutions += @"
Fix missing dependencies:
1. docker-compose down
2. docker pull n8nio/n8n:latest
3. docker-compose up -d
"@
                }
            }
        } else {
            Write-Error "n8n container does not exist"
            $diagnosticResults.N8n.ContainerExists = $false
            $diagnosticResults.Issues += "n8n container not created"
            $diagnosticResults.Solutions += @"
Create n8n container:
1. cd C:\n8n
2. docker-compose up -d
"@
        }
    }
}

# Check Network and Ports
function Test-NetworkPorts {
    Write-DiagHeader "Network and Port Diagnostics"
    
    # Check port 5678
    Write-Info "Checking port 5678..."
    $tcpConnection = Test-NetConnection -ComputerName localhost -Port 5678 -WarningAction SilentlyContinue
    
    if ($tcpConnection.TcpTestSucceeded) {
        Write-Success "Port 5678 is open"
        $diagnosticResults.Network.Port5678 = "Open"
        
        # Check what's listening on port 5678
        $netstat = netstat -ano | findstr ":5678"
        if ($netstat) {
            Write-Info "Process listening on port 5678:"
            $netstat | ForEach-Object { Write-Host "  $_" }
        }
    } else {
        Write-Warning "Port 5678 is not accessible"
        $diagnosticResults.Network.Port5678 = "Closed"
        
        # Check if another process is using the port
        $netstat = netstat -ano | findstr ":5678"
        if ($netstat) {
            Write-Error "Another process is using port 5678"
            $diagnosticResults.Issues += "Port 5678 already in use"
            $diagnosticResults.Solutions += @"
Free up port 5678:
1. Find the process: netstat -ano | findstr :5678
2. Note the PID (last column)
3. Stop the process: taskkill /F /PID <PID>
4. Or change n8n port in docker-compose.yml
"@
        }
    }
    
    # Check Windows Firewall
    Write-Info "Checking Windows Firewall..."
    $firewallProfile = Get-NetFirewallProfile -Profile Domain,Public,Private | Where-Object {$_.Enabled -eq $true}
    
    if ($firewallProfile) {
        Write-Info "Active firewall profiles: $($firewallProfile.Name -join ', ')"
        
        # Check for Docker/n8n firewall rules
        $dockerRules = Get-NetFirewallRule | Where-Object {$_.DisplayName -match "Docker|n8n"}
        if ($dockerRules) {
            Write-Success "Docker firewall rules found"
        } else {
            Write-Warning "No Docker firewall rules found"
            $diagnosticResults.Solutions += @"
Add firewall rule for n8n:
New-NetFirewallRule -DisplayName "n8n Web Interface" -Direction Inbound -LocalPort 5678 -Protocol TCP -Action Allow
"@
        }
    }
    
    # Check ngrok
    Write-Info "Checking ngrok installation..."
    $ngrokPath = "C:\n8n\scripts\ngrok.exe"
    if (Test-Path $ngrokPath) {
        Write-Success "ngrok is installed"
        $diagnosticResults.Network.NgrokInstalled = $true
        
        # Check ngrok configuration
        $ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
        if (Test-Path $ngrokConfig) {
            Write-Success "ngrok configuration found"
            
            # Check if authtoken is set
            $configContent = Get-Content $ngrokConfig -Raw
            if ($configContent -match "authtoken:\s*\S+") {
                Write-Success "ngrok authtoken is configured"
            } else {
                Write-Warning "ngrok authtoken not set"
                $diagnosticResults.Issues += "ngrok authtoken missing"
                $diagnosticResults.Solutions += @"
Configure ngrok:
1. Sign up at https://ngrok.com
2. Get your authtoken
3. Run: C:\n8n\scripts\ngrok.exe authtoken YOUR_TOKEN
"@
            }
        }
    } else {
        Write-Warning "ngrok not installed"
        $diagnosticResults.Network.NgrokInstalled = $false
    }
}

# Check File System and Permissions
function Test-FileSystem {
    Write-DiagHeader "File System and Permissions Check"
    
    # Check n8n directory structure
    $requiredDirs = @(
        "C:\n8n",
        "C:\n8n\data",
        "C:\n8n\config",
        "C:\n8n\workflows",
        "C:\n8n\backups",
        "C:\n8n\logs"
    )
    
    foreach ($dir in $requiredDirs) {
        if (Test-Path $dir) {
            Write-Success "$dir exists"
            
            # Check write permissions
            try {
                $testFile = Join-Path $dir "test-write.tmp"
                [System.IO.File]::WriteAllText($testFile, "test")
                Remove-Item $testFile -Force
                Write-Success "$dir is writable"
            } catch {
                Write-Error "$dir is not writable"
                $diagnosticResults.Issues += "$dir not writable"
                $diagnosticResults.Solutions += "Grant write permissions to: $dir"
            }
        } else {
            Write-Error "$dir missing"
            $diagnosticResults.Issues += "$dir directory missing"
        }
    }
    
    # Check critical files
    $criticalFiles = @{
        "C:\n8n\docker-compose.yml" = "Docker Compose configuration"
        "C:\n8n\.env" = "Environment variables"
    }
    
    foreach ($file in $criticalFiles.Keys) {
        if (Test-Path $file) {
            Write-Success "$($criticalFiles[$file]) exists"
        } else {
            Write-Error "$($criticalFiles[$file]) missing"
            $diagnosticResults.Issues += "$file missing"
            $diagnosticResults.Solutions += "Run setup script to create: $file"
        }
    }
}

# Generate HTML Report
function New-DiagnosticReport {
    Write-DiagHeader "Generating Diagnostic Report"
    
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>n8n Diagnostic Report - $($diagnosticResults.Timestamp)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h1 { color: #ff6d5a; border-bottom: 3px solid #ff6d5a; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .status-good { color: #28a745; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .status-error { color: #dc3545; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .issue-box { background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .solution-box { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 5px; }
        pre { background-color: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .summary { background-color: #e7f3ff; border: 1px solid #b8daff; padding: 20px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>n8n Diagnostic Report</h1>
        <p><strong>Generated:</strong> $($diagnosticResults.Timestamp)</p>
        
        <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Issues Found:</strong> $($diagnosticResults.Issues.Count)</p>
            <p><strong>Solutions Available:</strong> $($diagnosticResults.Solutions.Count)</p>
        </div>

        <h2>System Information</h2>
        <table>
            <tr><th>Component</th><th>Value</th><th>Status</th></tr>
            <tr><td>Operating System</td><td>$($diagnosticResults.System.OS)</td><td class="status-good">✓</td></tr>
            <tr><td>Total Memory</td><td>$($diagnosticResults.System.TotalMemory)</td><td class="$(if ([float]($diagnosticResults.System.TotalMemory -replace ' GB','') -ge 8) {'status-good'} else {'status-warning'})">$(if ([float]($diagnosticResults.System.TotalMemory -replace ' GB','') -ge 8) {'✓'} else {'⚠'})</td></tr>
            <tr><td>Free Disk Space</td><td>$($diagnosticResults.System.FreeDiskSpace)</td><td class="$(if ([float]($diagnosticResults.System.FreeDiskSpace -replace ' GB','') -ge 10) {'status-good'} else {'status-warning'})">$(if ([float]($diagnosticResults.System.FreeDiskSpace -replace ' GB','') -ge 10) {'✓'} else {'⚠'})</td></tr>
            <tr><td>Hyper-V</td><td>$($diagnosticResults.System.HyperV)</td><td class="$(if ($diagnosticResults.System.HyperV -eq 'Enabled') {'status-good'} else {'status-error'})">$(if ($diagnosticResults.System.HyperV -eq 'Enabled') {'✓'} else {'✗'})</td></tr>
        </table>

        <h2>Docker Status</h2>
        <table>
            <tr><th>Component</th><th>Value</th><th>Status</th></tr>
            <tr><td>Docker Desktop Installed</td><td>$(if ($diagnosticResults.Docker.Installed) {'Yes'} else {'No'})</td><td class="$(if ($diagnosticResults.Docker.Installed) {'status-good'} else {'status-error'})">$(if ($diagnosticResults.Docker.Installed) {'✓'} else {'✗'})</td></tr>
            <tr><td>Docker Running</td><td>$(if ($diagnosticResults.Docker.Running) {'Yes'} else {'No'})</td><td class="$(if ($diagnosticResults.Docker.Running) {'status-good'} else {'status-error'})">$(if ($diagnosticResults.Docker.Running) {'✓'} else {'✗'})</td></tr>
            <tr><td>Docker Version</td><td>$($diagnosticResults.Docker.Version)</td><td class="status-good">✓</td></tr>
        </table>

        <h2>n8n Status</h2>
        <table>
            <tr><th>Component</th><th>Value</th><th>Status</th></tr>
            <tr><td>Container Exists</td><td>$(if ($diagnosticResults.N8n.ContainerExists) {'Yes'} else {'No'})</td><td class="$(if ($diagnosticResults.N8n.ContainerExists) {'status-good'} else {'status-error'})">$(if ($diagnosticResults.N8n.ContainerExists) {'✓'} else {'✗'})</td></tr>
            <tr><td>Container Status</td><td>$($diagnosticResults.N8n.Status)</td><td class="$(if ($diagnosticResults.N8n.Status -eq 'running') {'status-good'} else {'status-error'})">$(if ($diagnosticResults.N8n.Status -eq 'running') {'✓'} else {'✗'})</td></tr>
            <tr><td>Web Interface</td><td>$(if ($diagnosticResults.N8n.WebInterfaceAccessible) {'Accessible'} else {'Not Accessible'})</td><td class="$(if ($diagnosticResults.N8n.WebInterfaceAccessible) {'status-good'} else {'status-error'})">$(if ($diagnosticResults.N8n.WebInterfaceAccessible) {'✓'} else {'✗'})</td></tr>
        </table>

        <h2>Network Configuration</h2>
        <table>
            <tr><th>Component</th><th>Value</th><th>Status</th></tr>
            <tr><td>Port 5678</td><td>$($diagnosticResults.Network.Port5678)</td><td class="$(if ($diagnosticResults.Network.Port5678 -eq 'Open') {'status-good'} else {'status-warning'})">$(if ($diagnosticResults.Network.Port5678 -eq 'Open') {'✓'} else {'⚠'})</td></tr>
            <tr><td>ngrok Installed</td><td>$(if ($diagnosticResults.Network.NgrokInstalled) {'Yes'} else {'No'})</td><td class="$(if ($diagnosticResults.Network.NgrokInstalled) {'status-good'} else {'status-warning'})">$(if ($diagnosticResults.Network.NgrokInstalled) {'✓'} else {'⚠'})</td></tr>
        </table>

        $(if ($diagnosticResults.Issues.Count -gt 0) {
        '<h2>Issues Found</h2>'
        foreach ($issue in $diagnosticResults.Issues) {
            "<div class='issue-box'>⚠ $issue</div>"
        }
        })

        $(if ($diagnosticResults.Solutions.Count -gt 0) {
        '<h2>Recommended Solutions</h2>'
        $solutionIndex = 1
        foreach ($solution in $diagnosticResults.Solutions) {
            "<div class='solution-box'><strong>Solution $solutionIndex:</strong><pre>$solution</pre></div>"
            $solutionIndex++
        }
        })

        <h2>Quick Actions</h2>
        <div class="solution-box">
            <h3>Common Fixes</h3>
            <ol>
                <li><strong>Restart n8n:</strong><br>
                    <pre>cd C:\n8n
docker-compose restart</pre>
                </li>
                <li><strong>View logs:</strong><br>
                    <pre>docker logs n8n --tail 50</pre>
                </li>
                <li><strong>Rebuild container:</strong><br>
                    <pre>cd C:\n8n
docker-compose down
docker-compose up -d --force-recreate</pre>
                </li>
                <li><strong>Update n8n:</strong><br>
                    <pre>docker pull n8nio/n8n:latest
cd C:\n8n
docker-compose up -d</pre>
                </li>
            </ol>
        </div>

        <p style="text-align: center; color: #666; margin-top: 40px;">
            n8n Diagnostic Report v1.0 | 
            <a href="http://localhost:5678" target="_blank">Open n8n</a> | 
            <a href="https://docs.n8n.io" target="_blank">Documentation</a>
        </p>
    </div>
</body>
</html>
"@
    
    $reportPath = "C:\n8n\logs\diagnostic-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"
    Set-Content -Path $reportPath -Value $html -Encoding UTF8
    Write-Success "Diagnostic report saved to: $reportPath"
    
    # Open report in browser
    Start-Process $reportPath
}

# Automated Fix Attempts
function Start-AutoFix {
    if ($diagnosticResults.Issues.Count -eq 0) {
        Write-Success "No issues found. System is healthy!"
        return
    }
    
    Write-DiagHeader "Attempting Automatic Fixes"
    
    $consent = Read-Host "Found $($diagnosticResults.Issues.Count) issues. Attempt automatic fixes? (Y/N)"
    if ($consent -ne 'Y') {
        Write-Info "Skipping automatic fixes"
        return
    }
    
    # Docker not running
    if ($diagnosticResults.Issues -contains "Docker daemon not running") {
        Write-Info "Attempting to start Docker Desktop..."
        $dockerPath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerPath) {
            Start-Process $dockerPath
            Write-Info "Waiting for Docker to start (30 seconds)..."
            Start-Sleep -Seconds 30
            
            # Recheck
            $dockerInfo = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker started successfully!"
            }
        }
    }
    
    # n8n container not running
    if ($diagnosticResults.Issues -contains "n8n container stopped") {
        Write-Info "Attempting to start n8n container..."
        Set-Location "C:\n8n"
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "n8n container started!"
        }
    }
    
    # Port conflict
    if ($diagnosticResults.Issues -contains "Port 5678 already in use") {
        Write-Info "Checking for conflicting processes..."
        $netstat = netstat -ano | findstr ":5678" | Select-Object -First 1
        if ($netstat -match "\s+(\d+)$") {
            $pid = $matches[1]
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Warning "Process '$($process.Name)' (PID: $pid) is using port 5678"
                $kill = Read-Host "Stop this process? (Y/N)"
                if ($kill -eq 'Y') {
                    Stop-Process -Id $pid -Force
                    Write-Success "Process stopped"
                }
            }
        }
    }
}

# Main diagnostic function
function Start-Diagnostics {
    Write-Host @"
╔═══════════════════════════════════════╗
║    n8n Troubleshooting Tool v1.0      ║
╚═══════════════════════════════════════╝
"@ -ForegroundColor Cyan

    # Run all diagnostic checks
    Test-SystemRequirements
    Test-DockerStatus
    Test-N8nStatus
    Test-NetworkPorts
    Test-FileSystem
    
    # Generate report
    New-DiagnosticReport
    
    # Offer automatic fixes
    Start-AutoFix
    
    # Summary
    Write-Host "`n╔═══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         Diagnostic Summary            ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan
    
    if ($diagnosticResults.Issues.Count -eq 0) {
        Write-Success "No issues found! n8n should be working properly."
        Write-Info "Access n8n at: http://localhost:5678"
    } else {
        Write-Warning "Found $($diagnosticResults.Issues.Count) issue(s)"
        Write-Info "Check the HTML report for detailed solutions"
    }
}

# Run diagnostics
try {
    Start-Diagnostics
} catch {
    Write-Error "Diagnostic tool encountered an error: $_"
} finally {
    Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
    Read-Host
}