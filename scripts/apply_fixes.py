#!/usr/bin/env python3
"""
生成された修正を実際のファイルに適用するスクリプト
"""

import json
import sys
import os
from pathlib import Path
import shutil
from typing import Dict, List, Any


def apply_fix(fix: Dict[str, Any]) -> bool:
    """単一の修正を適用"""
    file_path = Path(fix["file"])
    
    if not file_path.exists():
        print(f"Warning: File not found: {file_path}", file=sys.stderr)
        return False
    
    try:
        # バックアップを作成
        backup_path = file_path.with_suffix(file_path.suffix + ".bak")
        shutil.copy2(file_path, backup_path)
        
        # ファイルを読み込む
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # 修正を適用
        if "old_code" in fix and "new_code" in fix:
            # コードブロックの置換
            file_content = ''.join(lines)
            old_code = fix["old_code"]
            new_code = fix["new_code"]
            
            if old_code in file_content:
                file_content = file_content.replace(old_code, new_code, 1)
                
                # ファイルに書き戻す
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(file_content)
                
                print(f"✓ Fixed: {file_path} - {fix['description']}")
                
                # バックアップを削除
                backup_path.unlink()
                return True
            else:
                print(f"Warning: Could not find old code in {file_path}", file=sys.stderr)
                # 行番号ベースの修正を試みる
                line_num = fix.get("line", 0)
                if line_num > 0 and line_num <= len(lines):
                    # 行番号が指定されている場合、その行を置換
                    lines[line_num - 1] = new_code + '\n'
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)
                    
                    print(f"✓ Fixed line {line_num} in: {file_path}")
                    backup_path.unlink()
                    return True
        
        # バックアップを削除（修正が適用されなかった場合）
        backup_path.unlink()
        return False
        
    except Exception as e:
        print(f"Error applying fix to {file_path}: {str(e)}", file=sys.stderr)
        # エラーが発生した場合、バックアップから復元
        if backup_path.exists():
            shutil.move(backup_path, file_path)
        return False


def apply_fixes(fixes_file: str) -> int:
    """すべての修正を適用"""
    if not os.path.exists(fixes_file):
        print(f"Error: Fixes file not found: {fixes_file}", file=sys.stderr)
        return 1
    
    try:
        with open(fixes_file, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in fixes file: {e}", file=sys.stderr)
        return 1
    
    fixes = data.get("fixes", [])
    if not fixes:
        print("No fixes to apply")
        return 0
    
    print(f"Applying {len(fixes)} fixes...")
    
    successful_fixes = 0
    failed_fixes = 0
    
    # 信頼度でソート（高い順）
    fixes.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    
    for fix in fixes:
        # 低信頼度の修正はスキップ
        confidence = fix.get("confidence", 0)
        if confidence < 0.7:
            print(f"Skipping low-confidence fix (confidence: {confidence}): {fix.get('description', 'No description')}")
            continue
        
        if apply_fix(fix):
            successful_fixes += 1
        else:
            failed_fixes += 1
    
    print(f"\nSummary:")
    print(f"  Successful fixes: {successful_fixes}")
    print(f"  Failed fixes: {failed_fixes}")
    
    if data.get("summary"):
        print(f"\nOverall summary: {data['summary']}")
    
    return 0 if failed_fixes == 0 else 1


def main():
    if len(sys.argv) != 2:
        print("Usage: apply_fixes.py <fixes.json>", file=sys.stderr)
        sys.exit(1)
    
    fixes_file = sys.argv[1]
    sys.exit(apply_fixes(fixes_file))


if __name__ == "__main__":
    main()