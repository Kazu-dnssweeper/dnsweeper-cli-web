#!/usr/bin/env python3
"""
日次コストレポートを生成するスクリプト
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import argparse
from typing import Dict, List, Any


def load_cost_tracking() -> Dict[str, Any]:
    """コスト追跡データを読み込む"""
    tracking_file = Path("cost-tracking.json")
    if tracking_file.exists():
        try:
            with open(tracking_file, 'r') as f:
                return json.load(f)
        except:
            return {"entries": []}
    return {"entries": []}


def calculate_daily_cost(entries: List[Dict[str, Any]], date: str) -> float:
    """特定の日のコストを計算"""
    total = 0.0
    for entry in entries:
        if entry.get("date") == date and "cost" in entry:
            total += entry["cost"]
    return total


def calculate_monthly_cost(entries: List[Dict[str, Any]], year_month: str) -> float:
    """特定の月のコストを計算"""
    total = 0.0
    for entry in entries:
        if entry.get("date", "").startswith(year_month) and "cost" in entry:
            total += entry["cost"]
    return total


def generate_cost_breakdown(entries: List[Dict[str, Any]], date: str) -> Dict[str, Any]:
    """コストの内訳を生成"""
    breakdown = {
        "by_model": {},
        "by_action": {},
        "total_tokens": 0,
        "api_calls": 0
    }
    
    for entry in entries:
        if entry.get("date") == date:
            # モデル別
            model = entry.get("model", "unknown")
            if model not in breakdown["by_model"]:
                breakdown["by_model"][model] = {"cost": 0, "tokens": 0, "calls": 0}
            
            breakdown["by_model"][model]["cost"] += entry.get("cost", 0)
            breakdown["by_model"][model]["tokens"] += entry.get("tokens_used", 0)
            breakdown["by_model"][model]["calls"] += 1
            
            # アクション別
            action = entry.get("action", "unknown")
            if action not in breakdown["by_action"]:
                breakdown["by_action"][action] = {"cost": 0, "calls": 0}
            
            breakdown["by_action"][action]["cost"] += entry.get("cost", 0)
            breakdown["by_action"][action]["calls"] += 1
            
            # 合計
            breakdown["total_tokens"] += entry.get("tokens_used", 0)
            if "cost" in entry:
                breakdown["api_calls"] += 1
    
    return breakdown


def generate_markdown_report(data: Dict[str, Any], breakdown: Dict[str, Any]) -> str:
    """Markdownレポートを生成"""
    report = f"""# Claude API Cost Report

**Date**: {data['date']}  
**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

## Summary

| Metric | Value |
|--------|-------|
| Daily Cost | ${data['daily_cost']:.2f} |
| Monthly Cost (MTD) | ${data['monthly_cost']:.2f} |
| Monthly Budget | ${data['monthly_budget']:.2f} |
| Budget Used | {data['budget_percentage']:.1f}% |
| Remaining Budget | ${data['remaining_budget']:.2f} |
| Projected Monthly | ${data['projected_monthly_cost']:.2f} |

## Daily Breakdown

### By Model
| Model | Cost | Tokens | API Calls |
|-------|------|--------|-----------|
"""
    
    for model, stats in breakdown["by_model"].items():
        report += f"| {model} | ${stats['cost']:.2f} | {stats['tokens']:,} | {stats['calls']} |\n"
    
    report += f"\n**Total API Calls**: {breakdown['api_calls']}\n"
    report += f"**Total Tokens**: {breakdown['total_tokens']:,}\n"
    
    report += "\n### By Action\n"
    report += "| Action | Cost | Calls |\n"
    report += "|--------|------|-------|\n"
    
    for action, stats in breakdown["by_action"].items():
        report += f"| {action} | ${stats['cost']:.2f} | {stats['calls']} |\n"
    
    # 警告を追加
    if data['budget_percentage'] > 90:
        report += "\n## ⚠️ WARNING: Budget Critical\n"
        report += "Budget usage is above 90%. Consider switching to emergency mode.\n"
    elif data['budget_percentage'] > 75:
        report += "\n## ⚠️ WARNING: Budget Alert\n"
        report += "Budget usage is above 75%. Monitor closely.\n"
    
    # 推奨事項
    report += "\n## Recommendations\n\n"
    if data['projected_monthly_cost'] > data['monthly_budget']:
        report += f"- **Reduce Usage**: Projected monthly cost (${data['projected_monthly_cost']:.2f}) exceeds budget\n"
        report += "- Consider switching to economy mode\n"
        report += "- Review and optimize API calls\n"
    else:
        report += "- Current usage is within budget\n"
        report += "- Continue monitoring daily costs\n"
    
    return report


def main():
    parser = argparse.ArgumentParser(description="Generate cost report")
    parser.add_argument("--output", default="cost_report.md", help="Output markdown file")
    parser.add_argument("--json-output", default="cost_summary.json", help="Output JSON summary")
    
    args = parser.parse_args()
    
    # データを読み込む
    tracking_data = load_cost_tracking()
    entries = tracking_data.get("entries", [])
    
    # 日付計算
    today = datetime.now().strftime("%Y-%m-%d")
    current_month = datetime.now().strftime("%Y-%m")
    
    # コスト計算
    daily_cost = calculate_daily_cost(entries, today)
    monthly_cost = calculate_monthly_cost(entries, current_month)
    
    # 設定読み込み
    config_file = Path("config/economy-mode.json")
    if config_file.exists():
        with open(config_file, 'r') as f:
            config = json.load(f)
            monthly_budget = config.get("monthly_budget", 40.0)
    else:
        monthly_budget = 40.0
    
    remaining_budget = monthly_budget - monthly_cost
    budget_percentage = (monthly_cost / monthly_budget) * 100 if monthly_budget > 0 else 0
    
    # 月末予測
    now = datetime.now()
    days_in_month = 30
    days_passed = now.day
    if days_passed > 0:
        daily_average = monthly_cost / days_passed
        projected_monthly = daily_average * days_in_month
    else:
        projected_monthly = 0
    
    # サマリーデータ
    summary = {
        "date": today,
        "daily_cost": round(daily_cost, 2),
        "monthly_cost": round(monthly_cost, 2),
        "monthly_budget": monthly_budget,
        "remaining_budget": round(remaining_budget, 2),
        "budget_percentage": round(budget_percentage, 1),
        "projected_monthly_cost": round(projected_monthly, 2),
        "days_in_month": days_in_month,
        "days_passed": days_passed
    }
    
    # 内訳を生成
    breakdown = generate_cost_breakdown(entries, today)
    
    # レポート生成
    markdown_report = generate_markdown_report(summary, breakdown)
    
    # ファイルに保存
    with open(args.output, 'w') as f:
        f.write(markdown_report)
    
    with open(args.json_output, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"Cost report generated: {args.output}")
    print(f"Summary saved to: {args.json_output}")
    
    # GitHub Actions用の出力
    print(f"daily_cost={summary['daily_cost']}")
    print(f"monthly_cost={summary['monthly_cost']}")
    print(f"remaining_budget={summary['remaining_budget']}")
    print(f"budget_percentage={summary['budget_percentage']}")
    print(f"projected_monthly_cost={summary['projected_monthly_cost']}")


if __name__ == "__main__":
    main()