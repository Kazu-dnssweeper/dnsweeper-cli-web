#!/usr/bin/env python3
"""
Claude APIのコスト最適化と追跡を行うスクリプト
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import argparse
from typing import Dict, Any, Tuple


class CostOptimizer:
    def __init__(self):
        self.config_file = Path("config/economy-mode.json")
        self.tracking_file = Path("cost-tracking.json")
        self.monthly_budget = 40.0  # デフォルト月額予算
        self.warning_threshold = 0.75  # 警告閾値（75%）
        self.economy_threshold = 0.80  # エコノミーモード閾値（80%）
        self.emergency_threshold = 0.95  # 緊急モード閾値（95%）
        
        # モデル価格（per million tokens）
        self.model_prices = {
            "claude-3-haiku-20240307": {
                "input": 0.25,
                "output": 1.25
            },
            "claude-3-5-sonnet-20241022": {
                "input": 3.0,
                "output": 15.0
            },
            "claude-3-opus-20240229": {
                "input": 15.0,
                "output": 75.0
            }
        }
        
        self.load_config()
        self.load_tracking_data()
    
    def load_config(self):
        """設定ファイルを読み込む"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    self.monthly_budget = config.get("monthly_budget", self.monthly_budget)
                    self.current_mode = config.get("current_mode", "normal")
            except:
                self.current_mode = "normal"
        else:
            self.current_mode = "normal"
            self.save_config()
    
    def save_config(self):
        """設定ファイルを保存"""
        os.makedirs(self.config_file.parent, exist_ok=True)
        config = {
            "monthly_budget": self.monthly_budget,
            "current_mode": self.current_mode,
            "warning_threshold": self.warning_threshold,
            "economy_threshold": self.economy_threshold,
            "emergency_threshold": self.emergency_threshold,
            "last_updated": datetime.now().isoformat()
        }
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
    
    def load_tracking_data(self):
        """追跡データを読み込む"""
        if self.tracking_file.exists():
            try:
                with open(self.tracking_file, 'r') as f:
                    self.tracking_data = json.load(f)
            except:
                self.tracking_data = {"entries": []}
        else:
            self.tracking_data = {"entries": []}
    
    def save_tracking_data(self):
        """追跡データを保存"""
        with open(self.tracking_file, 'w') as f:
            json.dump(self.tracking_data, f, indent=2)
    
    def get_current_month_usage(self) -> float:
        """今月の使用量を取得"""
        current_month = datetime.now().strftime("%Y-%m")
        total = 0.0
        
        for entry in self.tracking_data.get("entries", []):
            if entry.get("date", "").startswith(current_month):
                total += entry.get("cost", 0.0)
        
        return total
    
    def get_daily_usage(self) -> float:
        """今日の使用量を取得"""
        today = datetime.now().strftime("%Y-%m-%d")
        total = 0.0
        
        for entry in self.tracking_data.get("entries", []):
            if entry.get("date", "") == today:
                total += entry.get("cost", 0.0)
        
        return total
    
    def calculate_cost(self, tokens: int, model: str, is_input: bool = True) -> float:
        """トークン数からコストを計算"""
        if model not in self.model_prices:
            # デフォルトでHaikuの価格を使用
            model = "claude-3-haiku-20240307"
        
        price_key = "input" if is_input else "output"
        price_per_million = self.model_prices[model][price_key]
        
        return (tokens / 1_000_000) * price_per_million
    
    def add_usage(self, tokens_used: int, model: str, action: str = "unknown"):
        """使用量を追加"""
        # 簡易的に入力と出力を7:3の比率で分割
        input_tokens = int(tokens_used * 0.7)
        output_tokens = tokens_used - input_tokens
        
        input_cost = self.calculate_cost(input_tokens, model, True)
        output_cost = self.calculate_cost(output_tokens, model, False)
        total_cost = input_cost + output_cost
        
        entry = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": datetime.now().strftime("%H:%M:%S"),
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "tokens_used": tokens_used,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": total_cost,
            "action": action
        }
        
        self.tracking_data["entries"].append(entry)
        self.save_tracking_data()
        
        # 予算チェック
        self.check_budget_status()
    
    def check_budget_status(self) -> Dict[str, Any]:
        """予算状況をチェック"""
        monthly_usage = self.get_current_month_usage()
        daily_usage = self.get_daily_usage()
        remaining = self.monthly_budget - monthly_usage
        percentage = (monthly_usage / self.monthly_budget) * 100
        
        # 今月の日数と経過日数から予測
        now = datetime.now()
        days_in_month = 30  # 簡易的に30日と仮定
        days_passed = now.day
        days_remaining = days_in_month - days_passed
        
        # 日割り平均から月末予測
        if days_passed > 0:
            daily_average = monthly_usage / days_passed
            projected_monthly = daily_average * days_in_month
        else:
            projected_monthly = 0
        
        status = {
            "monthly_budget": self.monthly_budget,
            "monthly_usage": round(monthly_usage, 2),
            "daily_usage": round(daily_usage, 2),
            "remaining_budget": round(remaining, 2),
            "percentage_used": round(percentage, 1),
            "projected_monthly": round(projected_monthly, 2),
            "days_remaining": days_remaining,
            "current_mode": self.current_mode,
            "status": "ok"
        }
        
        # モード自動切り替え
        if percentage >= self.emergency_threshold:
            self.set_mode("emergency", f"Budget usage at {percentage:.1f}%")
            status["status"] = "emergency"
        elif percentage >= self.economy_threshold:
            self.set_mode("economy", f"Budget usage at {percentage:.1f}%")
            status["status"] = "economy"
        elif percentage >= self.warning_threshold:
            status["status"] = "warning"
        
        return status
    
    def set_mode(self, mode: str, reason: str = ""):
        """動作モードを設定"""
        valid_modes = ["normal", "economy", "emergency"]
        if mode not in valid_modes:
            raise ValueError(f"Invalid mode: {mode}. Must be one of {valid_modes}")
        
        self.current_mode = mode
        self.save_config()
        
        # モード変更をログに記録
        log_entry = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": datetime.now().strftime("%H:%M:%S"),
            "action": "mode_change",
            "old_mode": self.current_mode,
            "new_mode": mode,
            "reason": reason
        }
        self.tracking_data["entries"].append(log_entry)
        self.save_tracking_data()
    
    def should_process_error(self, error_type: str, severity: str) -> bool:
        """現在のモードでエラーを処理すべきか判定"""
        if self.current_mode == "normal":
            return True
        elif self.current_mode == "economy":
            # エコノミーモードでは重要なエラーのみ
            important_types = ["typescript", "test"]
            important_severities = ["error", "critical"]
            return error_type in important_types and severity in important_severities
        elif self.current_mode == "emergency":
            # 緊急モードでは処理しない
            return False
        
        return False
    
    def select_model_by_budget(self, error_count: int) -> Tuple[str, str]:
        """予算状況に基づいてモデルを選択"""
        budget_status = self.check_budget_status()
        
        if self.current_mode == "emergency":
            return None, "Budget limit reached - emergency mode"
        
        if self.current_mode == "economy":
            # エコノミーモードでは常に最安モデル
            return "claude-3-haiku-20240307", "economy"
        
        # 通常モード
        if error_count < 5:
            return "claude-3-haiku-20240307", "normal"
        elif error_count < 20:
            # 予算に余裕がある場合のみSonnetを使用
            if budget_status["percentage_used"] < 50:
                return "claude-3-5-sonnet-20241022", "normal"
            else:
                return "claude-3-haiku-20240307", "budget-conscious"
        else:
            # 大量エラーでも予算を考慮
            if budget_status["percentage_used"] < 30:
                return "claude-3-5-sonnet-20241022", "normal"
            else:
                return "claude-3-haiku-20240307", "budget-conscious"


def main():
    parser = argparse.ArgumentParser(description="Claude API cost optimizer")
    parser.add_argument("command", choices=["check-budget", "update-usage", "set-economy-mode", "get-status"])
    parser.add_argument("--tokens-used", type=int, help="Number of tokens used")
    parser.add_argument("--model", help="Model used")
    parser.add_argument("--action", default="unknown", help="Action performed")
    parser.add_argument("--mode", choices=["normal", "economy", "emergency"], help="Mode to set")
    parser.add_argument("--reason", help="Reason for mode change")
    
    args = parser.parse_args()
    
    optimizer = CostOptimizer()
    
    if args.command == "check-budget":
        status = optimizer.check_budget_status()
        
        # GitHub Actions用の出力
        print(f"monthly_usage={status['monthly_usage']}")
        print(f"remaining_budget={status['remaining_budget']}")
        print(f"percentage_used={status['percentage_used']}")
        print(f"current_mode={status['current_mode']}")
        
        # 予算超過の場合はエラー終了
        if status['current_mode'] == 'emergency':
            print("ERROR: Budget limit reached - emergency mode active", file=sys.stderr)
            sys.exit(1)
        elif status['percentage_used'] > 90:
            print("WARNING: Budget usage above 90%", file=sys.stderr)
            sys.exit(0)  # 警告だけで続行
    
    elif args.command == "update-usage":
        if not args.tokens_used or not args.model:
            print("Error: --tokens-used and --model are required", file=sys.stderr)
            sys.exit(1)
        
        optimizer.add_usage(args.tokens_used, args.model, args.action)
        print(f"Usage recorded: {args.tokens_used} tokens for {args.model}")
    
    elif args.command == "set-economy-mode":
        if not args.mode:
            print("Error: --mode is required", file=sys.stderr)
            sys.exit(1)
        
        optimizer.set_mode(args.mode, args.reason or "Manual override")
        print(f"Mode set to: {args.mode}")
    
    elif args.command == "get-status":
        status = optimizer.check_budget_status()
        print(json.dumps(status, indent=2))


if __name__ == "__main__":
    main()