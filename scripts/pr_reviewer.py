#!/usr/bin/env python3
"""
Claude APIを使用してPRを自動レビューするスクリプト
"""

import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from anthropic import Anthropic
except ImportError:
    print("Error: anthropic package not installed. Run: pip install anthropic")
    sys.exit(1)


class PRReviewer:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.project_context = self._load_project_context()
    
    def _load_project_context(self) -> str:
        """プロジェクトコンテキストを読み込む"""
        context_file = Path("project-context.md")
        if context_file.exists():
            return context_file.read_text(encoding='utf-8')
        return ""
    
    def analyze_diff(self, diff_content: str, changed_files: List[str], 
                    pr_title: str, pr_body: str) -> Dict[str, Any]:
        """PRの差分を分析"""
        
        # 差分が大きすぎる場合は要約
        if len(diff_content) > 50000:
            diff_content = diff_content[:50000] + "\n... (diff truncated)"
        
        prompt = f"""You are an expert code reviewer for the DNSweeper project. Please review this pull request.

Project Context:
{self.project_context}

PR Title: {pr_title}
PR Description: {pr_body or 'No description provided'}

Changed Files ({len(changed_files)} files):
{chr(10).join(changed_files[:20])}  # 最大20ファイル
{'... and ' + str(len(changed_files) - 20) + ' more files' if len(changed_files) > 20 else ''}

Diff Content:
```diff
{diff_content}
```

Please provide a comprehensive review covering:

1. **Code Quality**: Style, readability, best practices
2. **Type Safety**: TypeScript type issues, any types, type assertions
3. **Bugs**: Potential bugs, edge cases, error handling
4. **Performance**: Performance issues, unnecessary computations
5. **Security**: Security vulnerabilities, unsafe operations
6. **Testing**: Missing tests, test coverage

Return your review as a JSON object with the following structure:
{{
  "overall_assessment": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  "summary": "Brief summary of the PR",
  "issues": [
    {{
      "severity": "critical" | "major" | "minor" | "suggestion",
      "description": "Issue description",
      "file": "path/to/file.ts",
      "line": 123,
      "suggestion": "How to fix it"
    }}
  ],
  "suggestions": ["General improvement suggestions"],
  "performance_analysis": "Performance considerations",
  "security_analysis": "Security considerations",
  "inline_comments": [
    {{
      "path": "src/file.ts",
      "line": 45,
      "severity": "major",
      "message": "This could cause a null pointer exception"
    }}
  ],
  "approved": true | false,
  "has_critical_issues": true | false,
  "has_security_issues": true | false,
  "has_performance_issues": true | false
}}

Focus on:
- TypeScript strict mode compliance
- ESLint rule violations
- React best practices (for frontend code)
- Express.js security (for backend code)
- Test coverage and quality

Be constructive and specific in your feedback. Only flag real issues, not style preferences."""
        
        try:
            # コスト最適化: 小さなPRはHaikuを使用
            if len(diff_content) < 5000 and len(changed_files) < 5:
                model = "claude-3-haiku-20240307"
            else:
                model = "claude-3-5-sonnet-20241022"
            
            message = self.client.messages.create(
                model=model,
                max_tokens=4000,
                temperature=0,
                system="You are a helpful code reviewer. Always respond with valid JSON only.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = message.content[0].text
            
            # JSONを抽出
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
            
            # 出力用
            print(f"tokens_used={result['tokens_used']}")
            print(f"model_used={model}")
            
            return result
            
        except Exception as e:
            print(f"Error calling Claude API: {str(e)}", file=sys.stderr)
            return {
                "overall_assessment": "COMMENT",
                "summary": "Failed to generate review due to an error",
                "issues": [],
                "suggestions": [],
                "error": str(e),
                "approved": False
            }
    
    def filter_important_issues(self, issues: List[Dict[str, Any]], max_issues: int = 10) -> List[Dict[str, Any]]:
        """重要な問題のみをフィルタリング"""
        # 重要度でソート
        severity_order = {"critical": 0, "major": 1, "minor": 2, "suggestion": 3}
        sorted_issues = sorted(issues, key=lambda x: severity_order.get(x.get("severity", "suggestion"), 4))
        
        # 最大数まで選択
        return sorted_issues[:max_issues]


def main():
    parser = argparse.ArgumentParser(description="Review PR using Claude API")
    parser.add_argument("--diff", required=True, help="Diff file path")
    parser.add_argument("--files", required=True, help="Changed files list")
    parser.add_argument("--pr-title", required=True, help="PR title")
    parser.add_argument("--pr-body", help="PR body/description")
    parser.add_argument("--output", default="review.json", help="Output file")
    
    args = parser.parse_args()
    
    # API キーを環境変数から取得
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    # 差分を読み込む
    try:
        with open(args.diff, 'r', encoding='utf-8') as f:
            diff_content = f.read()
    except Exception as e:
        print(f"Error reading diff file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # 変更ファイルリストを読み込む
    try:
        with open(args.files, 'r', encoding='utf-8') as f:
            changed_files = [line.strip() for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading files list: {e}", file=sys.stderr)
        changed_files = []
    
    # レビューを実行
    reviewer = PRReviewer(api_key)
    review_result = reviewer.analyze_diff(
        diff_content,
        changed_files,
        args.pr_title,
        args.pr_body or ""
    )
    
    # 重要な問題のみに絞る
    if "issues" in review_result:
        review_result["all_issues"] = review_result["issues"]
        review_result["issues"] = reviewer.filter_important_issues(review_result["issues"])
    
    # 結果を保存
    with open(args.output, 'w') as f:
        json.dump(review_result, f, indent=2)
    
    print(f"Review saved to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()