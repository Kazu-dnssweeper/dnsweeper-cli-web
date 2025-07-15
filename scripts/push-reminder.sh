#!/bin/bash
# Git プッシュリマインダースクリプト
# cronで1時間ごとに実行することを想定

# スクリプトのディレクトリからプロジェクトルートへ移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit 1

# 未プッシュのコミット数を確認
UNPUSHED=$(git log origin/master..HEAD --oneline 2>/dev/null | wc -l)
UNSTAGED=$(git status --porcelain 2>/dev/null | wc -l)

# ログファイル
LOG_FILE="$PROJECT_ROOT/.claude/push-reminder.log"
mkdir -p "$(dirname "$LOG_FILE")"

# 現在時刻
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ログ記録
echo "[$TIMESTAMP] チェック実行 - 未プッシュ: $UNPUSHED, 未ステージ: $UNSTAGED" >> "$LOG_FILE"

if [ $UNPUSHED -gt 0 ] || [ $UNSTAGED -gt 0 ]; then
  # 通知メッセージ作成
  MESSAGE="Git Push Reminder\n"
  
  if [ $UNPUSHED -gt 0 ]; then
    MESSAGE="${MESSAGE}🔴 ${UNPUSHED}個の未プッシュコミット\n"
  fi
  
  if [ $UNSTAGED -gt 0 ]; then
    MESSAGE="${MESSAGE}🟡 ${UNSTAGED}個の未ステージ変更\n"
  fi
  
  MESSAGE="${MESSAGE}\n実行: git push origin master"
  
  # ターミナルに警告表示
  echo -e "\n⚠️  Git Push Reminder ⚠️"
  echo -e "$MESSAGE"
  echo -e "========================\n"
  
  # リマインダーファイルを作成（他のスクリプトから参照可能）
  echo "$MESSAGE" > "$PROJECT_ROOT/.claude/push-reminder.txt"
  
  # WSL環境でのWindows通知（利用可能な場合）
  if command -v powershell.exe &> /dev/null; then
    powershell.exe -Command "
      Add-Type -AssemblyName System.Windows.Forms
      \$notification = New-Object System.Windows.Forms.NotifyIcon
      \$notification.Icon = [System.Drawing.SystemIcons]::Information
      \$notification.Visible = \$true
      \$notification.ShowBalloonTip(10000, 'Git Push Reminder', '未プッシュのコミットがあります！', 'Info')
    " 2>/dev/null || true
  fi
  
  # 10個以上の未プッシュコミットがある場合は緊急警告
  if [ $UNPUSHED -gt 10 ]; then
    echo "🚨 緊急: ${UNPUSHED}個のコミットが未プッシュです！" | tee -a "$LOG_FILE"
    
    # 自動プッシュスクリプトを実行（存在する場合）
    if [ -f "$PROJECT_ROOT/scripts/auto-push.py" ]; then
      echo "🤖 自動プッシュを実行します..." | tee -a "$LOG_FILE"
      python3 "$PROJECT_ROOT/scripts/auto-push.py" --once 2>&1 | tee -a "$LOG_FILE"
    fi
  fi
else
  # クリーンな状態
  [ -f "$PROJECT_ROOT/.claude/push-reminder.txt" ] && rm "$PROJECT_ROOT/.claude/push-reminder.txt"
fi