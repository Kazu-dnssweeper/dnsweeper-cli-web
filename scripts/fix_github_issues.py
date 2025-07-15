#!/usr/bin/env python3
"""
GitHub Issuesを自動修正するスクリプト
"""

import json
import os
import sys
import subprocess
import argparse
from typing import Dict, List, Any
import anthropic
from datetime import datetime

class GitHubIssueFixer:
    def __init__(self):
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            print("Error: ANTHROPIC_API_KEY environment variable not set")
            sys.exit(1)
        
        self.client = anthropic.Anthropic(api_key=api_key)
        self.github_token = os.environ.get('GITHUB_TOKEN')
        
    def analyze_issue(self, issue: Dict[str, Any]) -> Dict[str, Any]:
        """Issueの内容を分析して修正方法を決定"""
        
        title = issue.get('title', '')
        body = issue.get('body', '')
        number = issue.get('number')
        labels = [label.get('name', '') for label in issue.get('labels', [])]
        
        # ラベルベースの判定を優先
        if 'typescript' in labels or 'bug' in labels:
            return self._fix_code_error(title, body, number)
        
        # auto-generatedラベルがある場合（GitHub Actionsが作成したIssue）
        elif 'auto-generated' in labels:
            # タイトルから種類を判定
            if any(keyword in title.lower() for keyword in ['typescript', 'eslint', 'error', 'type']):
                return self._fix_code_error(title, body, number)
            elif any(keyword in title.lower() for keyword in ['test', 'spec', 'jest', 'vitest']):
                return self._fix_test_error(title, body, number)
            else:
                return self._general_fix(title, body, number)
        
        # タイトルベースの判定（フォールバック）
        elif any(keyword in title.lower() for keyword in ['typescript', 'eslint', 'error', 'type']):
            return self._fix_code_error(title, body, number)
        elif any(keyword in title.lower() for keyword in ['test', 'spec', 'jest', 'vitest']):
            return self._fix_test_error(title, body, number)
        elif any(keyword in title.lower() for keyword in ['doc', 'readme', 'comment']):
            return self._fix_documentation(title, body, number)
        else:
            return self._general_fix(title, body, number)
    
    def _fix_code_error(self, title: str, body: str, issue_number: int) -> Dict[str, Any]:
        """TypeScript/ESLintエラーを修正"""
        
        prompt = f"""
あなたはTypeScript/ESLintの専門家です。以下のGitHub Issueを解決してください。

Issue #{issue_number}: {title}
詳細: {body}

以下の情報を含む修正提案をJSON形式で返してください：
1. 問題の分析
2. 修正すべきファイルと具体的な変更内容
3. 修正後のコード例
4. テスト方法

ファイルパスは必ず実際に存在するパスを指定してください。
"""
        
        response = self.client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=2000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            fix_plan = json.loads(response.content[0].text)
        except:
            fix_plan = {
                "analysis": response.content[0].text,
                "files_to_fix": [],
                "manual_review_needed": True
            }
        
        return {
            "issue_number": issue_number,
            "title": title,
            "fix_type": "code_error",
            "fix_plan": fix_plan,
            "confidence": 0.8
        }
    
    def _fix_test_error(self, title: str, body: str, issue_number: int) -> Dict[str, Any]:
        """テストエラーを修正"""
        
        prompt = f"""
テストエラーの修正提案をしてください。

Issue #{issue_number}: {title}
詳細: {body}

以下を含む修正提案をJSON形式で返してください：
1. テストエラーの原因
2. 修正すべきテストファイル
3. 修正後のテストコード
4. モックやスタブの修正が必要な場合はその内容
"""
        
        response = self.client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1500,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            fix_plan = json.loads(response.content[0].text)
        except:
            fix_plan = {"analysis": response.content[0].text}
        
        return {
            "issue_number": issue_number,
            "title": title,
            "fix_type": "test_error",
            "fix_plan": fix_plan,
            "confidence": 0.7
        }
    
    def _fix_documentation(self, title: str, body: str, issue_number: int) -> Dict[str, Any]:
        """ドキュメント関連の問題を修正"""
        
        return {
            "issue_number": issue_number,
            "title": title,
            "fix_type": "documentation",
            "fix_plan": {
                "manual_review_needed": True,
                "suggestion": "ドキュメント更新は手動レビューが推奨されます"
            },
            "confidence": 0.3
        }
    
    def _general_fix(self, title: str, body: str, issue_number: int) -> Dict[str, Any]:
        """その他の問題を分析"""
        
        return {
            "issue_number": issue_number,
            "title": title,
            "fix_type": "general",
            "fix_plan": {
                "manual_review_needed": True,
                "requires_investigation": True
            },
            "confidence": 0.2
        }

def main():
    parser = argparse.ArgumentParser(description='GitHub Issuesを自動修正')
    parser.add_argument('--issues', required=True, help='IssueのJSONファイル')
    parser.add_argument('--max-fixes', type=int, default=3, help='最大修正数')
    parser.add_argument('--output', default='fixes.json', help='出力ファイル')
    
    args = parser.parse_args()
    
    # Issuesを読み込み
    try:
        with open(args.issues, 'r') as f:
            issues = json.load(f)
    except FileNotFoundError:
        print(f"Issues file not found: {args.issues}")
        sys.exit(1)
    
    if not issues:
        print("No issues to fix")
        with open(args.output, 'w') as f:
            json.dump({"fixes": []}, f)
        return
    
    fixer = GitHubIssueFixer()
    fixes = []
    
    print(f"Found {len(issues)} issues to analyze")
    
    for issue in issues[:args.max_fixes]:
        print(f"Analyzing issue #{issue['number']}: {issue['title']}")
        
        try:
            fix = fixer.analyze_issue(issue)
            
            # 信頼度が0.6以上の場合のみ自動修正対象
            if fix['confidence'] >= 0.6:
                fixes.append(fix)
                print(f"✅ Fix plan generated for issue #{issue['number']}")
            else:
                print(f"⚠️ Issue #{issue['number']} requires manual review")
        
        except Exception as e:
            print(f"❌ Error analyzing issue #{issue['number']}: {e}")
    
    # 結果を保存
    result = {
        "timestamp": datetime.now().isoformat(),
        "total_issues": len(issues),
        "fixes": fixes,
        "auto_fixable_count": len(fixes)
    }
    
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"Generated {len(fixes)} fix plans")
    print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()