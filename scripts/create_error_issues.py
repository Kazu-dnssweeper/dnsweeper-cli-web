#!/usr/bin/env python3
"""
修正されなかったエラーに対してGitHub Issueを作成するスクリプト
"""

import json
import os
import sys
import argparse
from typing import List, Dict, Any
from datetime import datetime
import requests


class IssueCreator:
    def __init__(self, github_token: str, repo: str):
        self.github_token = github_token
        self.repo = repo
        self.api_base = f"https://api.github.com/repos/{repo}"
        self.headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def create_issue(self, title: str, body: str, labels: List[str]) -> Dict[str, Any]:
        """GitHub Issueを作成"""
        data = {
            "title": title,
            "body": body,
            "labels": labels
        }
        
        response = requests.post(
            f"{self.api_base}/issues",
            headers=self.headers,
            json=data
        )
        
        if response.status_code == 201:
            return response.json()
        else:
            print(f"Error creating issue: {response.status_code} - {response.text}", file=sys.stderr)
            return None
    
    def group_errors_by_type(self, errors: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """エラーをタイプ別にグループ化"""
        grouped = {
            "typescript": [],
            "eslint": [],
            "test": [],
            "other": []
        }
        
        for error in errors:
            error_type = error.get("type", "other")
            if error_type in grouped:
                grouped[error_type].append(error)
            else:
                grouped["other"].append(error)
        
        return grouped
    
    def create_error_summary(self, errors: List[Dict[str, Any]]) -> str:
        """エラーのサマリーを作成"""
        if not errors:
            return "No errors"
        
        summary = f"## Error Summary ({len(errors)} errors)\n\n"
        
        # ファイル別にグループ化
        by_file = {}
        for error in errors:
            file_path = error.get("file", "unknown")
            if file_path not in by_file:
                by_file[file_path] = []
            by_file[file_path].append(error)
        
        # ファイル別にサマリー作成
        for file_path, file_errors in sorted(by_file.items()):
            summary += f"### `{file_path}` ({len(file_errors)} errors)\n\n"
            
            for error in file_errors[:5]:  # 最大5エラー表示
                line = error.get("line", 0)
                col = error.get("column", 0)
                msg = error.get("message", "No message")
                code = error.get("code", "")
                
                summary += f"- **Line {line}:{col}**: {msg}"
                if code:
                    summary += f" (`{code}`)"
                summary += "\n"
            
            if len(file_errors) > 5:
                summary += f"- ... and {len(file_errors) - 5} more errors\n"
            
            summary += "\n"
        
        return summary
    
    def create_fix_suggestions(self, errors: List[Dict[str, Any]]) -> str:
        """修正提案を作成"""
        suggestions = "## Suggested Fixes\n\n"
        
        # エラーコード別の一般的な修正方法
        common_fixes = {
            "TS2339": "Add proper type definitions or check if the property exists",
            "TS2345": "Ensure the types match or add type assertions",
            "TS7006": "Add explicit parameter types",
            "no-unused-vars": "Remove unused variables or prefix with underscore",
            "prettier/prettier": "Run `npm run lint -- --fix` to auto-fix formatting",
            "no-explicit-any": "Replace `any` with specific types"
        }
        
        # エラーコードを収集
        error_codes = set()
        for error in errors:
            code = error.get("code", "")
            if code:
                error_codes.add(code)
        
        # 修正提案を追加
        for code in sorted(error_codes):
            if code in common_fixes:
                suggestions += f"- **{code}**: {common_fixes[code]}\n"
        
        suggestions += "\n### General Recommendations\n\n"
        suggestions += "1. Run `npm run lint -- --fix` to auto-fix formatting issues\n"
        suggestions += "2. Run `npx tsc --noEmit` to see all TypeScript errors\n"
        suggestions += "3. Consider using `// @ts-ignore` for temporary fixes (not recommended for production)\n"
        suggestions += "4. Update type definitions for external libraries if needed\n"
        
        return suggestions


def parse_errors_from_files(ts_errors_file: str = None, 
                          eslint_errors_file: str = None,
                          test_errors_file: str = None) -> List[Dict[str, Any]]:
    """エラーファイルからエラーを解析"""
    all_errors = []
    
    # TypeScriptエラー
    if ts_errors_file and os.path.exists(ts_errors_file):
        with open(ts_errors_file, 'r') as f:
            for line in f:
                if "error TS" in line:
                    parts = line.split(":", 3)
                    if len(parts) >= 4:
                        all_errors.append({
                            "type": "typescript",
                            "file": parts[0].strip(),
                            "line": int(parts[1].strip()) if parts[1].strip().isdigit() else 0,
                            "message": parts[3].strip()
                        })
    
    # ESLintエラー
    if eslint_errors_file and os.path.exists(eslint_errors_file):
        try:
            with open(eslint_errors_file, 'r') as f:
                data = json.load(f)
                for file_result in data:
                    for msg in file_result.get("messages", []):
                        if msg.get("severity", 1) == 2:  # エラーのみ
                            all_errors.append({
                                "type": "eslint",
                                "file": file_result.get("filePath", ""),
                                "line": msg.get("line", 0),
                                "message": msg.get("message", ""),
                                "code": msg.get("ruleId", "")
                            })
        except:
            pass
    
    # テストエラー
    if test_errors_file and os.path.exists(test_errors_file):
        try:
            with open(test_errors_file, 'r') as f:
                data = json.load(f)
                if "testResults" in data:
                    for test_file in data["testResults"]:
                        for assertion in test_file.get("assertionResults", []):
                            if assertion.get("status") == "failed":
                                all_errors.append({
                                    "type": "test",
                                    "file": test_file.get("name", ""),
                                    "message": assertion.get("title", "Test failed")
                                })
        except:
            pass
    
    return all_errors


def main():
    parser = argparse.ArgumentParser(description="Create GitHub issues for remaining errors")
    parser.add_argument("--ts-errors", help="TypeScript error log file")
    parser.add_argument("--eslint-errors", help="ESLint error JSON file")
    parser.add_argument("--test-errors", help="Test error JSON file")
    parser.add_argument("--fixed-count", type=int, default=0, help="Number of errors that were fixed")
    parser.add_argument("--max-issues", type=int, default=3, help="Maximum number of issues to create")
    
    args = parser.parse_args()
    
    # 環境変数から認証情報を取得
    github_token = os.environ.get("GITHUB_TOKEN")
    github_repo = os.environ.get("GITHUB_REPOSITORY")
    
    if not github_token or not github_repo:
        print("Error: GITHUB_TOKEN and GITHUB_REPOSITORY environment variables required", file=sys.stderr)
        sys.exit(1)
    
    # すべてのエラーを収集
    all_errors = parse_errors_from_files(args.ts_errors, args.eslint_errors, args.test_errors)
    
    # 修正されたエラーを除外（最初のN個）
    remaining_errors = all_errors[args.fixed_count:]
    
    if not remaining_errors:
        print("No remaining errors to create issues for")
        return
    
    creator = IssueCreator(github_token, github_repo)
    
    # エラーをタイプ別にグループ化
    grouped_errors = creator.group_errors_by_type(remaining_errors)
    
    created_issues = 0
    
    # 各タイプごとにIssueを作成（最大数まで）
    for error_type, errors in grouped_errors.items():
        if not errors or created_issues >= args.max_issues:
            continue
        
        # タイトルと本文を作成
        title = f"🔧 Auto-detected {error_type} errors ({len(errors)} issues)"
        
        body = f"""This issue was automatically created by the error detection system.

**Total {error_type} errors**: {len(errors)}
**Auto-fixed**: {args.fixed_count}
**Remaining**: {len(errors)}

{creator.create_error_summary(errors)}

{creator.create_fix_suggestions(errors)}

## Next Steps

1. Review the errors listed above
2. Fix the most critical ones first
3. Run tests locally to verify fixes
4. Create a PR with the fixes

---
*This issue will be automatically updated on the next error detection run.*
*Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}*
"""
        
        # ラベルを設定
        labels = ["auto-generated", "bug"]
        if error_type == "typescript":
            labels.append("typescript")
        elif error_type == "eslint":
            labels.append("code-quality")
        elif error_type == "test":
            labels.append("test")
        
        # Issueを作成
        issue = creator.create_issue(title, body, labels)
        if issue:
            print(f"Created issue: {issue['html_url']}")
            created_issues += 1
        else:
            print(f"Failed to create issue for {error_type} errors", file=sys.stderr)
    
    print(f"Created {created_issues} issues")


if __name__ == "__main__":
    main()