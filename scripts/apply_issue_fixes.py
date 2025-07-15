#!/usr/bin/env python3
"""
Issue修正プランを実際に適用するスクリプト
"""

import json
import os
import sys
import subprocess
import argparse
from pathlib import Path

class IssueFixApplier:
    def __init__(self):
        self.github_token = os.environ.get('GITHUB_TOKEN')
        
    def apply_fixes(self, fixes_data: dict) -> None:
        """修正プランを適用"""
        
        fixes = fixes_data.get('fixes', [])
        
        for fix in fixes:
            issue_number = fix['issue_number']
            fix_type = fix['fix_type']
            fix_plan = fix['fix_plan']
            
            print(f"Applying fix for issue #{issue_number}")
            
            try:
                if fix_type == 'code_error':
                    self._apply_code_fix(fix_plan)
                elif fix_type == 'test_error':
                    self._apply_test_fix(fix_plan)
                
                # Issue成功時にラベルを更新
                self._update_issue_status(issue_number, 'fixed')
                
            except Exception as e:
                print(f"Error applying fix for issue #{issue_number}: {e}")
                self._update_issue_status(issue_number, 'fix-failed')
    
    def _apply_code_fix(self, fix_plan: dict) -> None:
        """コードエラーの修正を適用"""
        
        files_to_fix = fix_plan.get('files_to_fix', [])
        
        for file_fix in files_to_fix:
            file_path = file_fix.get('file_path')
            changes = file_fix.get('changes', [])
            
            if not file_path or not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                continue
            
            # ファイルの内容を読み取り
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 変更を適用
            for change in changes:
                old_code = change.get('old_code', '')
                new_code = change.get('new_code', '')
                
                if old_code and old_code in content:
                    content = content.replace(old_code, new_code)
                    print(f"Applied change in {file_path}")
            
            # ファイルを保存
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
    
    def _apply_test_fix(self, fix_plan: dict) -> None:
        """テストエラーの修正を適用"""
        
        test_files = fix_plan.get('test_files', [])
        
        for test_file in test_files:
            file_path = test_file.get('file_path')
            test_changes = test_file.get('changes', [])
            
            if not file_path or not os.path.exists(file_path):
                print(f"Test file not found: {file_path}")
                continue
            
            # テストファイルの変更を適用
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for change in test_changes:
                old_test = change.get('old_test', '')
                new_test = change.get('new_test', '')
                
                if old_test and old_test in content:
                    content = content.replace(old_test, new_test)
                    print(f"Applied test change in {file_path}")
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
    
    def _update_issue_status(self, issue_number: int, status: str) -> None:
        """Issueのステータスを更新"""
        
        if not self.github_token:
            print("GitHub token not available, skipping issue update")
            return
        
        try:
            if status == 'fixed':
                # 修正完了ラベルを追加してクローズ
                subprocess.run([
                    'gh', 'issue', 'edit', str(issue_number),
                    '--add-label', 'auto-fixed',
                    '--remove-label', 'auto-fix'
                ], check=True)
                
                subprocess.run([
                    'gh', 'issue', 'close', str(issue_number),
                    '--comment', '🤖 この問題は自動修正されました。変更内容を確認してください。'
                ], check=True)
                
                print(f"Issue #{issue_number} closed with auto-fixed label")
            
            elif status == 'fix-failed':
                # 修正失敗ラベルを追加
                subprocess.run([
                    'gh', 'issue', 'edit', str(issue_number),
                    '--add-label', 'auto-fix-failed',
                    '--remove-label', 'auto-fix'
                ], check=True)
                
                subprocess.run([
                    'gh', 'issue', 'comment', str(issue_number),
                    '--body', '🤖 自動修正に失敗しました。手動での対応が必要です。'
                ], check=True)
                
                print(f"Issue #{issue_number} marked as auto-fix-failed")
        
        except subprocess.CalledProcessError as e:
            print(f"Error updating issue #{issue_number}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Issue修正プランを適用')
    parser.add_argument('fixes_file', help='修正プランのJSONファイル')
    
    args = parser.parse_args()
    
    # 修正プランを読み込み
    try:
        with open(args.fixes_file, 'r') as f:
            fixes_data = json.load(f)
    except FileNotFoundError:
        print(f"Fixes file not found: {args.fixes_file}")
        sys.exit(1)
    
    applier = IssueFixApplier()
    applier.apply_fixes(fixes_data)
    
    print("Issue fixes applied successfully")

if __name__ == "__main__":
    main()