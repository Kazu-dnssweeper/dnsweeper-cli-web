# Create Desktop Shortcuts for n8n Management Scripts

Write-Host "Creating desktop shortcuts for n8n management..." -ForegroundColor Cyan

$desktopPath = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell

# Define shortcuts to create
$shortcuts = @(
    @{
        Name = "Start n8n"
        Target = "C:\n8n-setup\start-n8n.bat"
        Icon = "C:\Windows\System32\shell32.dll,21"
        Description = "Start n8n workflow automation"
    },
    @{
        Name = "Stop n8n"
        Target = "C:\n8n-setup\stop-n8n.bat"
        Icon = "C:\Windows\System32\shell32.dll,27"
        Description = "Stop n8n workflow automation"
    },
    @{
        Name = "Restart n8n"
        Target = "C:\n8n-setup\restart-n8n.bat"
        Icon = "C:\Windows\System32\shell32.dll,238"
        Description = "Restart n8n workflow automation"
    },
    @{
        Name = "n8n Logs"
        Target = "C:\n8n-setup\logs-n8n.bat"
        Icon = "C:\Windows\System32\shell32.dll,56"
        Description = "View n8n container logs"
    },
    @{
        Name = "n8n Status"
        Target = "C:\n8n-setup\status-n8n.bat"
        Icon = "C:\Windows\System32\shell32.dll,23"
        Description = "Check n8n status"
    },
    @{
        Name = "n8n Web Interface"
        Target = "http://localhost:5678"
        Icon = "C:\Windows\System32\shell32.dll,220"
        Description = "Open n8n web interface"
    }
)

# Create each shortcut
foreach ($shortcut in $shortcuts) {
    $shortcutPath = Join-Path $desktopPath "$($shortcut.Name).lnk"
    $link = $WshShell.CreateShortcut($shortcutPath)
    $link.TargetPath = $shortcut.Target
    $link.IconLocation = $shortcut.Icon
    $link.Description = $shortcut.Description
    
    # Set working directory for batch files
    if ($shortcut.Target -like "*.bat") {
        $link.WorkingDirectory = "C:\n8n"
    }
    
    $link.Save()
    Write-Host "✓ Created shortcut: $($shortcut.Name)" -ForegroundColor Green
}

# Create n8n folder shortcut
$n8nFolderShortcut = Join-Path $desktopPath "n8n Folder.lnk"
$link = $WshShell.CreateShortcut($n8nFolderShortcut)
$link.TargetPath = "C:\n8n"
$link.IconLocation = "C:\Windows\System32\shell32.dll,3"
$link.Description = "Open n8n installation folder"
$link.Save()
Write-Host "✓ Created shortcut: n8n Folder" -ForegroundColor Green

Write-Host "`nAll shortcuts created successfully!" -ForegroundColor Green
Write-Host "You can now manage n8n from your desktop." -ForegroundColor Cyan