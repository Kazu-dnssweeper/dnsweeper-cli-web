#!/usr/bin/env python3
"""
Git自動プッシュスクリプト
定期的に変更をコミット・プッシュする
"""

import subprocess
import schedule
import time
from datetime import datetime
import os
import sys

def run_git_command(command):
    """Gitコマンドを実行"""
    try:
        result = subprocess.run(
            command, 
            capture_output=True, 
            text=True, 
            check=False,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def check_unpushed_commits():
    """未プッシュのコミット数を確認"""
    success, stdout, _ = run_git_command(['git', 'log', 'origin/master..HEAD', '--oneline'])
    if success and stdout:
        return len(stdout.strip().split('\n'))
    return 0

def auto_push():
    """自動プッシュの実行"""
    print(f"\n🔍 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - 自動プッシュチェック開始")
    
    # 未ステージの変更を確認
    success, stdout, _ = run_git_command(['git', 'status', '--porcelain'])
    
    if success and stdout:
        # 変更があればコミット
        print("📝 未コミットの変更を検出")
        
        # 全ての変更をステージング
        run_git_command(['git', 'add', '.'])
        
        # コミットメッセージ作成
        message = f"🤖 auto: {datetime.now().strftime('%Y-%m-%d %H:%M')} JSTの自動保存"
        success, stdout, stderr = run_git_command(['git', 'commit', '-m', message])
        
        if success:
            print(f"✅ コミット成功: {message}")
        else:
            print(f"❌ コミット失敗: {stderr}")
            return
    
    # 未プッシュのコミットを確認
    unpushed = check_unpushed_commits()
    
    if unpushed > 0:
        print(f"📤 {unpushed}個の未プッシュコミットを検出")
        
        # プッシュ実行
        success, stdout, stderr = run_git_command(['git', 'push', 'origin', 'master'])
        
        if success:
            print(f"✅ プッシュ成功: {unpushed}個のコミットをプッシュしました")
        else:
            print(f"❌ プッシュ失敗: {stderr}")
    else:
        print("✨ プッシュ済み: 新しいコミットはありません")

def check_and_alert():
    """未プッシュのコミットが多い場合に警告"""
    unpushed = check_unpushed_commits()
    
    if unpushed > 10:
        print(f"\n⚠️  警告: {unpushed}個のコミットがプッシュされていません！")
        print("🚨 すぐにプッシュすることを推奨します")
        
        # 緊急プッシュを実行
        auto_push()

def main():
    """メインループ"""
    print("🚀 Git自動プッシュスクリプトを開始しました")
    print("📅 スケジュール:")
    print("  - 3時間ごと")
    print("  - 毎日 12:00, 18:00, 23:00 JST")
    
    # 初回実行
    auto_push()
    
    # スケジュール設定
    schedule.every(3).hours.do(auto_push)
    schedule.every().day.at("12:00").do(auto_push)
    schedule.every().day.at("18:00").do(auto_push)
    schedule.every().day.at("23:00").do(auto_push)
    
    # 1時間ごとに警告チェック
    schedule.every(1).hours.do(check_and_alert)
    
    # メインループ
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # 1分ごとにチェック
    except KeyboardInterrupt:
        print("\n👋 自動プッシュスクリプトを終了します")
        sys.exit(0)

if __name__ == "__main__":
    # コマンドライン引数をチェック
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        # 1回だけ実行
        auto_push()
    else:
        # デーモンモードで実行
        main()