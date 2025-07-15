# Claude API Integration for DNSweeper

This document describes the Claude API integration that automatically fixes code errors, reviews PRs, and manages costs.

## 🚀 Quick Start

### 1. Initial Setup

Run the setup script:
```bash
chmod +x scripts/setup-claude-api.sh
./scripts/setup-claude-api.sh
```

### 2. Configure GitHub Secrets

Go to your repository settings and add:
- **ANTHROPIC_API_KEY**: Your Claude API key from [Anthropic Console](https://console.anthropic.com/)

> **Note**: GITHUB_TOKEN is automatically provided by GitHub Actions

### 3. That's it!

The automation will run automatically when you push to the main branch.

## 📋 Features

### 🔧 Automatic Error Fixing
- Collects TypeScript, ESLint, and test errors
- Prioritizes and fixes up to 5 errors per run
- Creates issues for remaining errors
- Prevents infinite loops with `[skip ci]` in commit messages

### 👀 PR Auto-Review
- Reviews code changes for quality, security, and performance
- Provides inline comments for critical issues
- Adds appropriate labels to PRs
- Uses cost-effective models based on PR size

### 💰 Cost Management
- Daily cost reports at 9 AM JST (0:00 UTC)
- Budget tracking with alerts at 75%, 80%, and 95%
- Automatic economy mode when budget is tight
- Visual cost charts and projections

### 🎯 Smart Model Selection
- **Small errors (<5)**: Claude 3 Haiku ($0.25/M tokens)
- **Medium errors (5-20)**: Claude 3.5 Sonnet ($3/M tokens)
- **Large errors (>20)**: Claude 3.5 Sonnet (with batching)

## 🛠️ Manual Usage

### Fix Errors Locally

```bash
# Collect and fix TypeScript errors
npx tsc --noEmit 2>&1 | head -n 200 > ts_errors.log
python scripts/fix_all_errors.py --ts-errors ts_errors.log --output fixes.json

# Apply the fixes
python scripts/apply_fixes.py fixes.json
```

### Check Budget Status

```bash
python scripts/cost_optimizer.py get-status
```

### Generate Cost Report

```bash
python scripts/generate_cost_report.py
```

## 📊 Cost Control

### Budget Settings

Edit `config/economy-mode.json`:
```json
{
  "monthly_budget": 40.0,
  "current_mode": "normal",
  "warning_threshold": 0.75,
  "economy_threshold": 0.80,
  "emergency_threshold": 0.95
}
```

### Operating Modes

1. **Normal Mode** (default)
   - All features enabled
   - Optimal model selection
   - Up to 10 errors per run

2. **Economy Mode** (75-95% budget)
   - Only critical errors fixed
   - Cheapest model only (Haiku)
   - Up to 5 errors per run

3. **Emergency Mode** (>95% budget)
   - No automatic fixes
   - Manual intervention required
   - Cost reports only

### Force Mode Change

```bash
# Switch to economy mode
python scripts/cost_optimizer.py set-economy-mode --mode economy --reason "Budget control"

# Back to normal
python scripts/cost_optimizer.py set-economy-mode --mode normal --reason "New month"
```

## 🔍 Workflows Explained

### 1. Auto-Fix Workflow (`.github/workflows/auto-fix.yml`)

Triggers on:
- Push to main branch
- Manual trigger via GitHub UI

Process:
1. Collect all errors (TypeScript, ESLint, tests)
2. Check budget status
3. Fix up to 5 most important errors
4. Apply fixes and run tests
5. Commit with `[skip ci]` to prevent loops
6. Create issues for remaining errors

### 2. PR Review Workflow (`.github/workflows/pr-review.yml`)

Triggers on:
- Pull request opened/updated

Process:
1. Analyze code changes
2. Check for issues (bugs, security, performance)
3. Post review comment
4. Add inline comments for critical issues
5. Apply appropriate labels

### 3. Daily Cost Report (`.github/workflows/daily-cost-report.yml`)

Triggers on:
- Daily at 9 AM JST
- Manual trigger

Process:
1. Calculate daily and monthly costs
2. Generate visual chart
3. Check budget thresholds
4. Create alerts if needed
5. Update tracking files

## 📈 Cost Optimization Tips

1. **Fix Linting Issues First**
   ```bash
   npm run lint -- --fix
   ```

2. **Batch Your Commits**
   - Group related changes to reduce API calls

3. **Use Draft PRs**
   - Mark PRs as draft to skip reviews until ready

4. **Monitor Daily Reports**
   - Check the Actions tab for daily summaries

5. **Adjust Error Limits**
   - Reduce `--max-fixes` parameter if needed

## 🚨 Troubleshooting

### "Budget limit reached"
- Check `cost-tracking.json` for usage
- Switch to economy mode or increase budget
- Clear old entries from tracking file

### "No fixes applied"
- Check if errors are in the priority list
- Verify file paths are correct
- Look for low confidence scores in `fixes.json`

### "API key not found"
- Ensure ANTHROPIC_API_KEY is in GitHub Secrets
- For local testing, create `.env` file

### Infinite Loop Prevention
- Commits include `[skip ci]` automatically
- Manual override: use `[skip ci]` in your commits

## 📝 Configuration Files

### `project-context.md`
Project-specific context for better fixes. Update with:
- New dependencies
- Coding standards
- Common patterns

### `config/economy-mode.json`
Budget and mode settings

### `cost-tracking.json`
Historical usage data (auto-generated)

### `.fix-history.json`
Previous fixes for learning (auto-generated)

## 🔒 Security

- API keys stored in GitHub Secrets
- No keys in code or logs
- Automatic token rotation recommended
- Budget limits prevent runaway costs

## 📊 Metrics

Track success with:
- Fix success rate in `.fix-history.json`
- Cost per error in daily reports
- Time saved vs manual fixes

## 🤝 Contributing

To improve the Claude integration:

1. Update error patterns in `fix_all_errors.py`
2. Add new error types to prioritization
3. Improve `project-context.md` with patterns
4. Submit PRs with `[skip ci]` to test manually

## 📚 Resources

- [Anthropic API Docs](https://docs.anthropic.com/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [DNSweeper Main README](README.md)

## ⚖️ License

This integration follows the same license as DNSweeper.

---

**Note**: This is an experimental feature. Monitor costs closely during initial usage.