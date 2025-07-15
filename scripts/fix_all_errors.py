#!/usr/bin/env python3
"""
Claude APIを使用してプロジェクトのエラーを自動修正するスクリプト
"""

import json
import os
import sys
import argparse
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
import hashlib

try:
    from anthropic import Anthropic
except ImportError:
    print("Error: anthropic package not installed. Run: pip install anthropic")
    sys.exit(1)


class ErrorFixer:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.project_context = self._load_project_context()
        self.fix_history = self._load_fix_history()
        self.cost_tracker = CostTracker()
        
    def _load_project_context(self) -> str:
        """プロジェクトコンテキストを読み込む"""
        context_file = Path("project-context.md")
        if context_file.exists():
            return context_file.read_text(encoding='utf-8')
        return self._generate_default_context()
    
    def _generate_default_context(self) -> str:
        """デフォルトのプロジェクトコンテキストを生成"""
        return """
# DNSweeper Project Context

## Technology Stack
- Node.js v22
- TypeScript 5.x with strict mode
- React + Vite (Frontend)
- Express.js (Backend)
- Vitest (Testing)
- ESLint + Prettier

## Project Structure
- src/: Source code
- tests/: Test files
- web/: Web application (frontend & backend)
- docs/: Documentation

## Coding Standards
- Use TypeScript strict mode
- Follow ESLint rules
- Prefer functional components in React
- Use async/await over callbacks
- Write tests for all new features

## Common Issues
1. Type errors: Ensure proper type definitions
2. ESLint errors: Follow project conventions
3. Import errors: Use correct import paths
"""

    def _load_fix_history(self) -> List[Dict[str, Any]]:
        """修正履歴を読み込む"""
        history_file = Path(".fix-history.json")
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_fix_history(self, fixes: List[Dict[str, Any]]):
        """修正履歴を保存"""
        history_file = Path(".fix-history.json")
        self.fix_history.extend(fixes)
        # 最新1000件のみ保持
        self.fix_history = self.fix_history[-1000:]
        with open(history_file, 'w') as f:
            json.dump(self.fix_history, f, indent=2)
    
    def parse_typescript_errors(self, error_file: str) -> List[Dict[str, Any]]:
        """TypeScriptエラーをパース"""
        errors = []
        if not os.path.exists(error_file):
            return errors
        
        with open(error_file, 'r') as f:
            lines = f.readlines()
        
        for line in lines:
            if "error TS" in line:
                parts = line.split(":")
                if len(parts) >= 4:
                    try:
                        file_path = parts[0].strip()
                        line_num = int(parts[1].strip())
                        col_num = int(parts[2].strip())
                        error_msg = ":".join(parts[3:]).strip()
                        
                        # エラーコードを抽出
                        error_code = ""
                        if "error TS" in error_msg:
                            code_start = error_msg.find("TS") + 2
                            code_end = error_msg.find(":", code_start)
                            if code_end > code_start:
                                error_code = "TS" + error_msg[code_start:code_end]
                        
                        errors.append({
                            "type": "typescript",
                            "file": file_path,
                            "line": line_num,
                            "column": col_num,
                            "message": error_msg,
                            "code": error_code,
                            "severity": "error"
                        })
                    except:
                        continue
        
        return errors
    
    def parse_eslint_errors(self, error_file: str) -> List[Dict[str, Any]]:
        """ESLintエラーをパース"""
        errors = []
        if not os.path.exists(error_file):
            return errors
        
        try:
            with open(error_file, 'r') as f:
                data = json.load(f)
            
            for file_result in data:
                file_path = file_result.get("filePath", "")
                for message in file_result.get("messages", []):
                    errors.append({
                        "type": "eslint",
                        "file": file_path,
                        "line": message.get("line", 0),
                        "column": message.get("column", 0),
                        "message": message.get("message", ""),
                        "code": message.get("ruleId", ""),
                        "severity": message.get("severity", 1) == 2 and "error" or "warning"
                    })
        except:
            pass
        
        return errors
    
    def parse_test_errors(self, error_file: str) -> List[Dict[str, Any]]:
        """テストエラーをパース"""
        errors = []
        if not os.path.exists(error_file):
            return errors
        
        try:
            with open(error_file, 'r') as f:
                data = json.load(f)
            
            if "testResults" in data:
                for test_file in data["testResults"]:
                    file_path = test_file.get("name", "")
                    for assertion in test_file.get("assertionResults", []):
                        if assertion.get("status") == "failed":
                            errors.append({
                                "type": "test",
                                "file": file_path,
                                "line": 0,  # テストの行番号は特定困難
                                "column": 0,
                                "message": assertion.get("failureMessages", [""])[0],
                                "code": assertion.get("title", ""),
                                "severity": "error"
                            })
        except:
            pass
        
        return errors
    
    def prioritize_errors(self, errors: List[Dict[str, Any]], max_fixes: int = 5) -> List[Dict[str, Any]]:
        """エラーの優先順位付け"""
        # 優先度スコアを計算
        for error in errors:
            score = 0
            
            # エラータイプによるスコア
            if error["type"] == "typescript":
                score += 30
            elif error["type"] == "test":
                score += 20
            elif error["type"] == "eslint":
                score += 10
            
            # エラーの重要度
            if error["severity"] == "error":
                score += 20
            
            # よくあるエラーは優先度を上げる
            common_errors = ["TS2339", "TS2345", "TS7006", "no-unused-vars", "prettier/prettier"]
            if error.get("code") in common_errors:
                score += 10
            
            error["priority_score"] = score
        
        # スコアの高い順にソート
        errors.sort(key=lambda x: x["priority_score"], reverse=True)
        
        # 同じファイルのエラーをグループ化して効率化
        grouped_errors = {}
        for error in errors[:max_fixes * 3]:  # 多めに取得
            file_key = error["file"]
            if file_key not in grouped_errors:
                grouped_errors[file_key] = []
            grouped_errors[file_key].append(error)
        
        # 各ファイルから最大2つずつ選択
        selected_errors = []
        for file_errors in grouped_errors.values():
            selected_errors.extend(file_errors[:2])
            if len(selected_errors) >= max_fixes:
                break
        
        return selected_errors[:max_fixes]
    
    def select_model(self, error_count: int) -> Tuple[str, float]:
        """エラー数に基づいてモデルを選択"""
        if error_count < 5:
            return "claude-3-haiku-20240307", 0.25
        elif error_count < 20:
            return "claude-3-5-sonnet-20241022", 3.0
        else:
            return "claude-3-5-sonnet-20241022", 3.0  # Opusは高いので使わない
    
    def create_fix_prompt(self, errors: List[Dict[str, Any]]) -> str:
        """修正プロンプトを作成"""
        prompt = f"""You are an expert TypeScript developer helping to fix errors in the DNSweeper project.

Project Context:
{self.project_context}

Please analyze and fix the following errors. Return your response as a JSON array of fixes.

Errors to fix:
"""
        
        for i, error in enumerate(errors, 1):
            prompt += f"\n{i}. File: {error['file']}"
            prompt += f"\n   Line: {error['line']}, Column: {error['column']}"
            prompt += f"\n   Type: {error['type']}"
            prompt += f"\n   Error: {error['message']}"
            if error.get('code'):
                prompt += f"\n   Code: {error['code']}"
            prompt += "\n"
        
        prompt += """
Please provide fixes in the following JSON format:
{
  "fixes": [
    {
      "file": "path/to/file.ts",
      "line": 123,
      "description": "Brief description of the fix",
      "old_code": "original code that needs to be fixed",
      "new_code": "fixed code",
      "confidence": 0.95,
      "explanation": "Why this fix works"
    }
  ],
  "summary": "Overall summary of fixes applied"
}

Important guidelines:
1. Only fix the specific errors mentioned
2. Preserve the original code style and formatting
3. Ensure the fix doesn't break other parts of the code
4. For TypeScript errors, ensure proper type safety
5. For ESLint errors, follow the project's linting rules
6. For test errors, fix the implementation or the test as appropriate

Return ONLY valid JSON, no additional text."""
        
        return prompt
    
    def fix_errors(self, errors: List[Dict[str, Any]], max_fixes: int = 5) -> Dict[str, Any]:
        """エラーを修正"""
        if not errors:
            return {"fixes": [], "summary": "No errors to fix"}
        
        # エラーの優先順位付け
        priority_errors = self.prioritize_errors(errors, max_fixes)
        
        # モデル選択
        model, price_per_million = self.select_model(len(errors))
        
        # プロンプト作成
        prompt = self.create_fix_prompt(priority_errors)
        
        # プロンプトのハッシュを計算（キャッシング用）
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
        
        try:
            # Claude APIを呼び出し
            message = self.client.messages.create(
                model=model,
                max_tokens=4000,
                temperature=0,
                system="You are a helpful assistant that fixes code errors. Always respond with valid JSON only.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # レスポンスを解析
            response_text = message.content[0].text
            
            # JSONを抽出（```json や ``` で囲まれている場合に対応）
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            result = json.loads(response_text)
            
            # メタデータを追加
            result["model_used"] = model
            result["tokens_used"] = message.usage.input_tokens + message.usage.output_tokens
            result["cost"] = (result["tokens_used"] / 1_000_000) * price_per_million
            result["timestamp"] = datetime.now().isoformat()
            result["errors_fixed"] = len(priority_errors)
            result["total_errors"] = len(errors)
            
            # 修正履歴に追加
            for fix in result.get("fixes", []):
                fix["model"] = model
                fix["timestamp"] = datetime.now().isoformat()
            
            self._save_fix_history(result.get("fixes", []))
            
            # コスト追跡
            self.cost_tracker.add_usage(result["tokens_used"], model, "fix_errors")
            
            # 出力用にトークン数とモデルを設定
            print(f"tokens_used={result['tokens_used']}")
            print(f"model_used={model}")
            
            return result
            
        except Exception as e:
            print(f"Error calling Claude API: {str(e)}", file=sys.stderr)
            return {
                "fixes": [],
                "summary": f"Failed to generate fixes: {str(e)}",
                "error": str(e)
            }


class CostTracker:
    """コスト追跡クラス"""
    def __init__(self):
        self.tracking_file = Path("cost-tracking.json")
        self.load_tracking_data()
    
    def load_tracking_data(self):
        """追跡データを読み込む"""
        if self.tracking_file.exists():
            try:
                with open(self.tracking_file, 'r') as f:
                    self.data = json.load(f)
            except:
                self.data = {"entries": []}
        else:
            self.data = {"entries": []}
    
    def add_usage(self, tokens: int, model: str, action: str):
        """使用量を追加"""
        # 後でcost_optimizer.pyから更新される
        pass


def main():
    parser = argparse.ArgumentParser(description="Fix project errors using Claude API")
    parser.add_argument("--ts-errors", help="TypeScript error log file")
    parser.add_argument("--eslint-errors", help="ESLint error JSON file")
    parser.add_argument("--test-errors", help="Test error JSON file")
    parser.add_argument("--max-fixes", type=int, default=5, help="Maximum number of fixes to apply")
    parser.add_argument("--output", default="fixes.json", help="Output file for fixes")
    
    args = parser.parse_args()
    
    # API キーを環境変数から取得
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    # エラー修正クラスを初期化
    fixer = ErrorFixer(api_key)
    
    # すべてのエラーを収集
    all_errors = []
    
    if args.ts_errors:
        all_errors.extend(fixer.parse_typescript_errors(args.ts_errors))
    
    if args.eslint_errors:
        all_errors.extend(fixer.parse_eslint_errors(args.eslint_errors))
    
    if args.test_errors:
        all_errors.extend(fixer.parse_test_errors(args.test_errors))
    
    print(f"Found {len(all_errors)} total errors", file=sys.stderr)
    
    # エラーを修正
    result = fixer.fix_errors(all_errors, args.max_fixes)
    
    # 結果を保存
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"Fixes saved to {args.output}", file=sys.stderr)
    print(f"Fixed {len(result.get('fixes', []))} errors out of {len(all_errors)}", file=sys.stderr)


if __name__ == "__main__":
    main()