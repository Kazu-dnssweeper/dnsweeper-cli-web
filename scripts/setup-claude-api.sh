#!/bin/bash

# DNSweeper Claude API Integration Setup Script

set -e

echo "🚀 DNSweeper Claude API Integration Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Check Python version
echo "📋 Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info[0])')
    PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info[1])')
    
    if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 9 ]; then
        echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
    else
        echo -e "${RED}✗ Python 3.9+ required, but $PYTHON_VERSION found${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.9+${NC}"
    exit 1
fi

# Step 2: Create virtual environment (optional)
echo ""
echo "📦 Setting up Python environment..."
read -p "Do you want to create a virtual environment? (recommended) [Y/n] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo -e "${GREEN}✓ Virtual environment created${NC}"
    else
        echo -e "${YELLOW}⚠ Virtual environment already exists${NC}"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
fi

# Step 3: Install Python dependencies
echo ""
echo "📥 Installing Python dependencies..."
pip install --upgrade pip

# Create requirements.txt if it doesn't exist
if [ ! -f "requirements.txt" ]; then
    cat > requirements.txt << EOF
anthropic>=0.18.0
requests>=2.31.0
matplotlib>=3.7.0
pandas>=2.0.0
python-dotenv>=1.0.0
EOF
    echo -e "${GREEN}✓ Created requirements.txt${NC}"
fi

pip install -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Step 4: Create necessary directories
echo ""
echo "📁 Creating directory structure..."
mkdir -p scripts config .github/workflows
echo -e "${GREEN}✓ Directories created${NC}"

# Step 5: Create default configuration
echo ""
echo "⚙️ Creating default configuration..."
if [ ! -f "config/economy-mode.json" ]; then
    cat > config/economy-mode.json << EOF
{
  "monthly_budget": 40.0,
  "current_mode": "normal",
  "warning_threshold": 0.75,
  "economy_threshold": 0.80,
  "emergency_threshold": 0.95,
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    echo -e "${GREEN}✓ Created economy-mode.json${NC}"
else
    echo -e "${YELLOW}⚠ economy-mode.json already exists${NC}"
fi

# Step 6: Initialize tracking files
echo ""
echo "📊 Initializing tracking files..."
if [ ! -f "cost-tracking.json" ]; then
    echo '{"entries": []}' > cost-tracking.json
    echo -e "${GREEN}✓ Created cost-tracking.json${NC}"
fi

if [ ! -f ".fix-history.json" ]; then
    echo '[]' > .fix-history.json
    echo -e "${GREEN}✓ Created .fix-history.json${NC}"
fi

# Step 7: Add to .gitignore
echo ""
echo "📝 Updating .gitignore..."
if ! grep -q "cost-tracking.json" .gitignore 2>/dev/null; then
    cat >> .gitignore << EOF

# Claude API Integration
venv/
__pycache__/
*.pyc
.fix-history.json
cost-tracking.json
cost_report.md
cost_summary.json
cost_chart.png
fixes.json
*.bak
EOF
    echo -e "${GREEN}✓ Updated .gitignore${NC}"
else
    echo -e "${YELLOW}⚠ .gitignore already contains Claude API entries${NC}"
fi

# Step 8: Make scripts executable
echo ""
echo "🔧 Making scripts executable..."
chmod +x scripts/*.py scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are now executable${NC}"

# Step 9: GitHub Secrets setup instructions
echo ""
echo "================== IMPORTANT =================="
echo ""
echo "📌 GitHub Secrets Setup Required:"
echo ""
echo "1. Go to: https://github.com/YOUR_USERNAME/dnsweeper/settings/secrets/actions"
echo ""
echo "2. Add the following secret:"
echo "   - Name: ANTHROPIC_API_KEY"
echo "   - Value: Your Claude API key from https://console.anthropic.com/"
echo ""
echo "3. The GITHUB_TOKEN is automatically available (no setup needed)"
echo ""
echo "=============================================="
echo ""

# Step 10: Test configuration
echo "🧪 Testing configuration..."
if python3 -c "import anthropic" 2>/dev/null; then
    echo -e "${GREEN}✓ Anthropic SDK imported successfully${NC}"
else
    echo -e "${RED}✗ Failed to import Anthropic SDK${NC}"
    exit 1
fi

# Step 11: Create test API key file (local testing only)
echo ""
read -p "Do you want to set up a local API key for testing? [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ ! -f ".env" ]; then
        read -p "Enter your Anthropic API key: " API_KEY
        echo "ANTHROPIC_API_KEY=$API_KEY" > .env
        echo -e "${GREEN}✓ Created .env file (remember to add it to .gitignore!)${NC}"
    else
        echo -e "${YELLOW}⚠ .env file already exists${NC}"
    fi
fi

# Final summary
echo ""
echo "✅ Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo "1. Add ANTHROPIC_API_KEY to GitHub Secrets"
echo "2. Commit and push the changes"
echo "3. The automation will run on your next push to main"
echo ""
echo "🛠️ Manual Testing:"
echo "- Test error fixing: python scripts/fix_all_errors.py --help"
echo "- Test cost tracking: python scripts/cost_optimizer.py get-status"
echo "- Test PR review: python scripts/pr_reviewer.py --help"
echo ""
echo "📖 Documentation:"
echo "See README-CLAUDE-API.md for detailed usage instructions"
echo ""

# Deactivate virtual environment if activated
if [ -n "$VIRTUAL_ENV" ]; then
    echo "💡 To deactivate the virtual environment, run: deactivate"
fi