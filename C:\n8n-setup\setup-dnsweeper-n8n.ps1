# DNSweeper n8n Configuration Script
# This script sets up n8n with DNSweeper-specific settings and workflows

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Info($message) {
    Write-Host "ℹ $message" -ForegroundColor Cyan
}

function Write-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

# Create DNSweeper-specific environment configuration
function Set-DNSweeperEnvironment {
    Write-Info "Setting up DNSweeper environment variables..."
    
    $envPath = "C:\n8n\.env.dnsweeper"
    
    # Interactive credential input
    Write-Host "`nPlease provide your API credentials (leave blank to skip):" -ForegroundColor Yellow
    
    # Claude API Key
    $claudeApiKey = Read-Host "Claude API Key" -AsSecureString
    $claudeApiKeyPlain = ""
    if ($claudeApiKey.Length -gt 0) {
        $claudeApiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($claudeApiKey))
    }
    
    # GitHub Token
    $githubToken = Read-Host "GitHub Personal Access Token" -AsSecureString
    $githubTokenPlain = ""
    if ($githubToken.Length -gt 0) {
        $githubTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($githubToken))
    }
    
    # Route53 Credentials
    Write-Host "`nAWS Route53 Credentials (optional):" -ForegroundColor Yellow
    $awsAccessKey = Read-Host "AWS Access Key ID"
    $awsSecretKey = Read-Host "AWS Secret Access Key" -AsSecureString
    $awsSecretKeyPlain = ""
    if ($awsSecretKey.Length -gt 0) {
        $awsSecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($awsSecretKey))
    }
    
    # Cloudflare Credentials
    Write-Host "`nCloudflare Credentials (optional):" -ForegroundColor Yellow
    $cloudflareEmail = Read-Host "Cloudflare Email"
    $cloudflareApiKey = Read-Host "Cloudflare API Key" -AsSecureString
    $cloudflareApiKeyPlain = ""
    if ($cloudflareApiKey.Length -gt 0) {
        $cloudflareApiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($cloudflareApiKey))
    }
    
    # Create environment file
    $envContent = @"
# DNSweeper n8n Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Claude API Configuration
CLAUDE_API_KEY=$claudeApiKeyPlain
CLAUDE_MODEL=claude-3-haiku-20240307
CLAUDE_MAX_TOKENS=4096

# GitHub Configuration
GITHUB_TOKEN=$githubTokenPlain
GITHUB_REPO=hikit-io/dnsweeper

# AWS Route53 Configuration
AWS_ACCESS_KEY_ID=$awsAccessKey
AWS_SECRET_ACCESS_KEY=$awsSecretKeyPlain
AWS_DEFAULT_REGION=us-east-1

# Cloudflare Configuration
CLOUDFLARE_EMAIL=$cloudflareEmail
CLOUDFLARE_API_KEY=$cloudflareApiKeyPlain

# DNSweeper Specific Settings
DNSWEEPER_AUTO_COMMIT=true
DNSWEEPER_ERROR_THRESHOLD=5
DNSWEEPER_BATCH_SIZE=10
DNSWEEPER_COST_LIMIT_MONTHLY=40

# Notification Settings
NOTIFICATION_EMAIL=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Timezone
TZ=Asia/Tokyo
"@
    
    # Save to file with restricted permissions
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    
    # Set file permissions (only current user can read)
    $acl = Get-Acl $envPath
    $acl.SetAccessRuleProtection($true, $false)
    $permission = [System.Security.AccessControl.FileSystemAccessRule]::new(
        [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
        "FullControl",
        "Allow"
    )
    $acl.SetAccessRule($permission)
    Set-Acl -Path $envPath -AclObject $acl
    
    Write-Success "DNSweeper environment configuration created"
}

# Create DNSweeper workflow templates
function New-DNSweeperWorkflows {
    Write-Info "Creating DNSweeper workflow templates..."
    
    $workflowsPath = "C:\n8n\workflows\dnsweeper"
    if (!(Test-Path $workflowsPath)) {
        New-Item -ItemType Directory -Path $workflowsPath -Force | Out-Null
    }
    
    # Workflow 1: Auto Error Fix on Git Push
    $workflow1 = @'
{
  "name": "DNSweeper - Auto Error Fix on Git Push",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "github-webhook",
        "options": {}
      },
      "name": "GitHub Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json[\"action\"]}}",
              "value2": "push"
            }
          ]
        }
      },
      "name": "Check Push Event",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "command": "cd /home/hikit/dnsweeper && npm run lint 2>&1 || true"
      },
      "name": "Run Lint Check",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "url": "https://api.anthropic.com/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaders": {
          "parameters": [
            {
              "name": "anthropic-version",
              "value": "2023-06-01"
            }
          ]
        },
        "requestMethod": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "{\n  \"model\": \"claude-3-haiku-20240307\",\n  \"max_tokens\": 4096,\n  \"messages\": [\n    {\n      \"role\": \"user\",\n      \"content\": \"Fix the following TypeScript/ESLint errors:\\n\\n{{$node[\"Run Lint Check\"].json[\"stdout\"]}}\"\n    }\n  ]\n}"
      },
      "name": "Claude API - Fix Errors",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [850, 300]
    }
  ],
  "connections": {
    "GitHub Webhook": {
      "main": [[{"node": "Check Push Event", "type": "main", "index": 0}]]
    },
    "Check Push Event": {
      "main": [
        [{"node": "Run Lint Check", "type": "main", "index": 0}],
        []
      ]
    },
    "Run Lint Check": {
      "main": [[{"node": "Claude API - Fix Errors", "type": "main", "index": 0}]]
    }
  }
}
'@
    
    # Workflow 2: Scheduled Code Analysis
    $workflow2 = @'
{
  "name": "DNSweeper - Scheduled Code Analysis",
  "nodes": [
    {
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "mode": "everyWeek",
              "hour": 9,
              "minute": 0,
              "weekday": 1
            }
          ]
        }
      },
      "name": "Weekly Trigger",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "command": "cd /home/hikit/dnsweeper && python3 scripts/analyze_with_claude.py --with-ai"
      },
      "name": "Run AI Analysis",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "resource": "issue",
        "operation": "create",
        "owner": "hikit-io",
        "repository": "dnsweeper",
        "title": "Weekly Code Analysis Report - {{$now.format('YYYY-MM-DD')}}",
        "body": "## Code Analysis Results\\n\\n{{$node[\"Run AI Analysis\"].json[\"stdout\"]}}"
      },
      "name": "Create GitHub Issue",
      "type": "n8n-nodes-base.github",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Weekly Trigger": {
      "main": [[{"node": "Run AI Analysis", "type": "main", "index": 0}]]
    },
    "Run AI Analysis": {
      "main": [[{"node": "Create GitHub Issue", "type": "main", "index": 0}]]
    }
  }
}
'@
    
    # Workflow 3: Error Notification System
    $workflow3 = @'
{
  "name": "DNSweeper - Error Notification System",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "error-webhook",
        "options": {}
      },
      "name": "Error Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "aggregate": "aggregateIndividualFields",
        "aggregateBy": "error_type",
        "options": {}
      },
      "name": "Aggregate Errors",
      "type": "n8n-nodes-base.aggregate",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json[\"count\"]}}",
              "operation": "larger",
              "value2": 5
            }
          ]
        }
      },
      "name": "Check Threshold",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "message": "=🚨 DNSweeper Error Alert\\n\\nError Type: {{$json[\"error_type\"]}}\\nCount: {{$json[\"count\"]}}\\nTimestamp: {{$now.toISO()}}",
        "additionalFields": {}
      },
      "name": "Send Discord Alert",
      "type": "n8n-nodes-base.discord",
      "typeVersion": 1,
      "position": [850, 250]
    }
  ],
  "connections": {
    "Error Webhook": {
      "main": [[{"node": "Aggregate Errors", "type": "main", "index": 0}]]
    },
    "Aggregate Errors": {
      "main": [[{"node": "Check Threshold", "type": "main", "index": 0}]]
    },
    "Check Threshold": {
      "main": [
        [{"node": "Send Discord Alert", "type": "main", "index": 0}],
        []
      ]
    }
  }
}
'@
    
    # Workflow 4: Test Coverage Report
    $workflow4 = @'
{
  "name": "DNSweeper - Test Coverage Report",
  "nodes": [
    {
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "mode": "everyDay",
              "hour": 10,
              "minute": 0
            }
          ]
        }
      },
      "name": "Daily Trigger",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "command": "cd /home/hikit/dnsweeper && npm run test:coverage"
      },
      "name": "Run Coverage Test",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "jsCode": "const output = $input.first().json.stdout;\nconst coverageMatch = output.match(/All files\\s+\\|\\s+([\\d.]+)/m);\nconst coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;\n\nreturn [{\n  json: {\n    coverage: coverage,\n    threshold: 85,\n    passed: coverage >= 85,\n    date: new Date().toISOString()\n  }\n}];"
      },
      "name": "Parse Coverage",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Daily Trigger": {
      "main": [[{"node": "Run Coverage Test", "type": "main", "index": 0}]]
    },
    "Run Coverage Test": {
      "main": [[{"node": "Parse Coverage", "type": "main", "index": 0}]]
    }
  }
}
'@
    
    # Workflow 5: Milestone Progress Tracker
    $workflow5 = @'
{
  "name": "DNSweeper - Milestone Progress Tracker",
  "nodes": [
    {
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "mode": "everyWeek",
              "hour": 9,
              "minute": 0,
              "weekday": 5
            }
          ]
        }
      },
      "name": "Friday Report",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "resource": "file",
        "operation": "get",
        "owner": "hikit-io",
        "repository": "dnsweeper",
        "filePath": "/docs/MILESTONES.md",
        "asBinary": false
      },
      "name": "Get Milestones",
      "type": "n8n-nodes-base.github",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "jsCode": "// Parse milestone progress\nconst content = $input.first().json.content;\nconst lines = Buffer.from(content, 'base64').toString('utf-8').split('\\n');\n\nlet completed = 0;\nlet total = 0;\n\nlines.forEach(line => {\n  if (line.includes('- [x]')) completed++;\n  if (line.includes('- [ ]') || line.includes('- [x]')) total++;\n});\n\nconst progress = total > 0 ? (completed / total * 100).toFixed(1) : 0;\n\nreturn [{\n  json: {\n    completed,\n    total,\n    progress: `${progress}%`,\n    remaining: total - completed\n  }\n}];"
      },
      "name": "Calculate Progress",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Friday Report": {
      "main": [[{"node": "Get Milestones", "type": "main", "index": 0}]]
    },
    "Get Milestones": {
      "main": [[{"node": "Calculate Progress", "type": "main", "index": 0}]]
    }
  }
}
'@
    
    # Save workflow files
    $workflows = @{
        "auto-error-fix.json" = $workflow1
        "scheduled-analysis.json" = $workflow2
        "error-notification.json" = $workflow3
        "test-coverage.json" = $workflow4
        "milestone-tracker.json" = $workflow5
    }
    
    foreach ($filename in $workflows.Keys) {
        $filepath = Join-Path $workflowsPath $filename
        Set-Content -Path $filepath -Value $workflows[$filename] -Encoding UTF8
        Write-Success "Created workflow: $filename"
    }
}

# Create workflow import script
function New-WorkflowImportScript {
    Write-Info "Creating workflow import script..."
    
    $importScript = @'
# Import DNSweeper workflows to n8n

$workflows = Get-ChildItem -Path "C:\n8n\workflows\dnsweeper\*.json"

Write-Host "Importing DNSweeper workflows to n8n..." -ForegroundColor Cyan

foreach ($workflow in $workflows) {
    Write-Host "Importing: $($workflow.Name)" -ForegroundColor Yellow
    
    # Read workflow content
    $content = Get-Content $workflow.FullName -Raw
    
    # Import via n8n CLI (requires n8n CLI to be installed)
    # Alternative: Use n8n API to import workflows
    
    Write-Host "  Please import this workflow manually through the n8n UI" -ForegroundColor Gray
    Write-Host "  File location: $($workflow.FullName)" -ForegroundColor Gray
}

Write-Host "`nNote: Workflows need to be imported manually through the n8n web interface." -ForegroundColor Yellow
Write-Host "1. Open http://localhost:5678" -ForegroundColor Cyan
Write-Host "2. Go to Workflows > Import from File" -ForegroundColor Cyan
Write-Host "3. Select each JSON file from C:\n8n\workflows\dnsweeper\" -ForegroundColor Cyan
'@
    
    $importScriptPath = "C:\n8n\scripts\import-workflows.ps1"
    Set-Content -Path $importScriptPath -Value $importScript -Encoding UTF8
    Write-Success "Created workflow import script"
}

# Create credentials template
function New-CredentialsTemplate {
    Write-Info "Creating credentials template..."
    
    $credentialsDoc = @"
# DNSweeper n8n Credentials Setup Guide

## Required Credentials

### 1. Claude API (Anthropic)
- **Type**: HTTP Header Auth
- **Header Name**: x-api-key
- **Header Value**: Your Claude API Key
- **Additional Header**: anthropic-version = 2023-06-01

### 2. GitHub OAuth2
- **Type**: OAuth2
- **Client ID**: Your GitHub App Client ID
- **Client Secret**: Your GitHub App Client Secret
- **Authorization URL**: https://github.com/login/oauth/authorize
- **Access Token URL**: https://github.com/login/oauth/access_token
- **Scope**: repo, workflow
- **Auth URI Query Parameters**: 
  - access_type=offline

### 3. AWS (for Route53)
- **Type**: AWS
- **Access Key ID**: Your AWS Access Key
- **Secret Access Key**: Your AWS Secret Key
- **Region**: us-east-1 (or your preferred region)

### 4. Cloudflare
- **Type**: Cloudflare API
- **API Token**: Your Cloudflare API Token
- **Zone ID**: Your DNS Zone ID

### 5. Discord (optional)
- **Type**: Discord Webhook
- **Webhook URL**: Your Discord Webhook URL

### 6. Slack (optional)
- **Type**: Slack
- **Access Token**: Your Slack Bot Token
- **Channel**: Your notification channel

## Setup Instructions

1. Open n8n web interface (http://localhost:5678)
2. Go to Credentials (left sidebar)
3. Click "Add Credential"
4. Select the credential type from the list above
5. Fill in the required fields
6. Click "Create" to save

## Security Notes

- Never commit credentials to version control
- Use environment variables when possible
- Rotate API keys regularly
- Use OAuth2 instead of API keys when available
- Enable 2FA on all service accounts

## Testing Credentials

After adding credentials:
1. Create a test workflow
2. Add the corresponding node
3. Select your credential
4. Use the "Test" button to verify

## Troubleshooting

### Claude API Issues
- Ensure you have credits in your Anthropic account
- Check API key permissions
- Verify the anthropic-version header

### GitHub OAuth Issues
- Ensure callback URL is set to: http://localhost:5678/rest/oauth2-credential/callback
- Check app permissions include repo and workflow access

### AWS Issues
- Verify IAM user has Route53 permissions
- Check security group allows outbound HTTPS

### Cloudflare Issues
- Use API Token (not Global API Key)
- Ensure token has DNS edit permissions
"@
    
    $credentialsPath = "C:\n8n\docs\credentials-setup.md"
    $docsPath = Split-Path $credentialsPath -Parent
    
    if (!(Test-Path $docsPath)) {
        New-Item -ItemType Directory -Path $docsPath -Force | Out-Null
    }
    
    Set-Content -Path $credentialsPath -Value $credentialsDoc -Encoding UTF8
    Write-Success "Created credentials setup guide"
}

# Main function
function Start-DNSweeperSetup {
    Write-Host @"
╔═══════════════════════════════════════╗
║   DNSweeper n8n Configuration Setup   ║
║            Version 1.0                ║
╚═══════════════════════════════════════╝
"@ -ForegroundColor Cyan

    # Check if n8n is installed
    if (!(Test-Path "C:\n8n\docker-compose.yml")) {
        Write-Error "n8n is not installed. Please run setup-n8n.ps1 first."
        return
    }

    # Setup steps
    Set-DNSweeperEnvironment
    New-DNSweeperWorkflows
    New-WorkflowImportScript
    New-CredentialsTemplate

    Write-Host @"

╔═══════════════════════════════════════╗
║     DNSweeper Setup Complete!         ║
╚═══════════════════════════════════════╝

Next steps:
1. Start n8n if not running: C:\n8n-setup\start-n8n.bat
2. Access n8n: http://localhost:5678
3. Import workflows from: C:\n8n\workflows\dnsweeper\
4. Configure credentials as per: C:\n8n\docs\credentials-setup.md
5. Test workflows with sample data

Environment file created at: C:\n8n\.env.dnsweeper
(Keep this file secure!)

"@ -ForegroundColor Green
}

# Run setup
try {
    Start-DNSweeperSetup
} catch {
    Write-Error "Setup failed: $_"
} finally {
    Read-Host "Press Enter to exit"
}