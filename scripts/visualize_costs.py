#!/usr/bin/env python3
"""
コスト追跡データを可視化するスクリプト
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
import argparse
from typing import Dict, List, Any

try:
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from matplotlib.figure import Figure
    import pandas as pd
except ImportError:
    print("Error: Required packages not installed. Run: pip install matplotlib pandas")
    sys.exit(1)


def load_cost_tracking(input_file: str) -> Dict[str, Any]:
    """コスト追跡データを読み込む"""
    tracking_file = Path(input_file)
    if tracking_file.exists():
        try:
            with open(tracking_file, 'r') as f:
                return json.load(f)
        except:
            return {"entries": []}
    return {"entries": []}


def prepare_data(entries: List[Dict[str, Any]]) -> pd.DataFrame:
    """データを可視化用に準備"""
    # 日付ごとにコストを集計
    daily_costs = {}
    
    for entry in entries:
        if "date" in entry and "cost" in entry:
            date = entry["date"]
            if date not in daily_costs:
                daily_costs[date] = 0.0
            daily_costs[date] += entry["cost"]
    
    # DataFrameに変換
    if daily_costs:
        df = pd.DataFrame(list(daily_costs.items()), columns=['date', 'cost'])
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # 累積コストを計算
        df['cumulative_cost'] = df['cost'].cumsum()
        
        return df
    else:
        # 空のDataFrameを返す
        return pd.DataFrame(columns=['date', 'cost', 'cumulative_cost'])


def create_cost_chart(df: pd.DataFrame, output_file: str, budget: float = 40.0):
    """コストチャートを作成"""
    # フィギュアを作成
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10), sharex=True)
    fig.suptitle('Claude API Cost Tracking', fontsize=16, fontweight='bold')
    
    # カラーパレット
    primary_color = '#2563eb'  # Blue
    secondary_color = '#10b981'  # Green
    warning_color = '#f59e0b'  # Amber
    danger_color = '#ef4444'  # Red
    
    if not df.empty:
        # 日次コスト（棒グラフ）
        ax1.bar(df['date'], df['cost'], color=primary_color, alpha=0.7, label='Daily Cost')
        ax1.set_ylabel('Daily Cost ($)', fontsize=12)
        ax1.set_title('Daily API Usage Cost', fontsize=14)
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        
        # 日次コストの平均線
        if len(df) > 1:
            daily_avg = df['cost'].mean()
            ax1.axhline(y=daily_avg, color=secondary_color, linestyle='--', 
                       label=f'Average: ${daily_avg:.2f}')
            ax1.legend()
        
        # 累積コスト（線グラフ）
        ax2.plot(df['date'], df['cumulative_cost'], color=primary_color, 
                linewidth=2, marker='o', markersize=6, label='Cumulative Cost')
        ax2.set_ylabel('Cumulative Cost ($)', fontsize=12)
        ax2.set_xlabel('Date', fontsize=12)
        ax2.set_title('Monthly Cumulative Cost', fontsize=14)
        ax2.grid(True, alpha=0.3)
        
        # 予算ライン
        ax2.axhline(y=budget, color=danger_color, linestyle='--', 
                   linewidth=2, label=f'Monthly Budget: ${budget}')
        
        # 警告ライン（75%）
        warning_line = budget * 0.75
        ax2.axhline(y=warning_line, color=warning_color, linestyle='--', 
                   alpha=0.7, label=f'Warning (75%): ${warning_line:.2f}')
        
        # 現在の累積コストをハイライト
        current_total = df['cumulative_cost'].iloc[-1] if len(df) > 0 else 0
        percentage = (current_total / budget * 100) if budget > 0 else 0
        
        # テキスト注釈を追加
        ax2.text(0.02, 0.98, f'Current Total: ${current_total:.2f} ({percentage:.1f}%)',
                transform=ax2.transAxes, fontsize=12, fontweight='bold',
                verticalalignment='top',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        ax2.legend(loc='upper left')
        
        # 日付フォーマット
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax2.xaxis.set_major_locator(mdates.DayLocator(interval=1))
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 予測線（オプション）
        if len(df) > 3:
            # 簡単な線形予測
            days_in_month = 30
            current_day = df['date'].iloc[-1].day
            if current_day < days_in_month:
                daily_rate = current_total / current_day
                projected_total = daily_rate * days_in_month
                
                # 予測期間
                last_date = df['date'].iloc[-1]
                future_dates = pd.date_range(start=last_date + timedelta(days=1), 
                                           periods=days_in_month - current_day)
                future_costs = [current_total + daily_rate * i for i in range(1, len(future_dates) + 1)]
                
                ax2.plot(future_dates, future_costs, color=primary_color, 
                        linestyle=':', alpha=0.5, label=f'Projected: ${projected_total:.2f}')
                ax2.legend(loc='upper left')
    else:
        # データがない場合のメッセージ
        ax1.text(0.5, 0.5, 'No data available', ha='center', va='center', 
                transform=ax1.transAxes, fontsize=14)
        ax2.text(0.5, 0.5, 'No data available', ha='center', va='center', 
                transform=ax2.transAxes, fontsize=14)
    
    # レイアウト調整
    plt.tight_layout()
    
    # ファイルに保存
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Cost chart saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Visualize cost tracking data")
    parser.add_argument("--input", default="cost-tracking.json", help="Input JSON file")
    parser.add_argument("--output", default="cost_chart.png", help="Output image file")
    parser.add_argument("--budget", type=float, default=40.0, help="Monthly budget")
    
    args = parser.parse_args()
    
    # データを読み込む
    tracking_data = load_cost_tracking(args.input)
    entries = tracking_data.get("entries", [])
    
    # データを準備
    df = prepare_data(entries)
    
    # チャートを作成
    create_cost_chart(df, args.output, args.budget)


if __name__ == "__main__":
    main()