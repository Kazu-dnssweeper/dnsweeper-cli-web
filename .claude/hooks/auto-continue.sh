#!/bin/bash
# タスク完了を検知して次のタスクを自動開始

TASK_FILE="/home/hikit/dnsweeper/.claude/auto-task-system.md"
COMPLETED=$(grep -c "- \[x\]" "$TASK_FILE" 2>/dev/null || echo 0)
TOTAL=$(grep -c "- \[" "$TASK_FILE" 2>/dev/null || echo 0)

if [ $COMPLETED -lt $TOTAL ]; then
    echo "🔄 継続中: $COMPLETED/$TOTAL タスク完了"
    echo "次のタスクを自動的に開始します..."
    
    # 画面に警告表示
    echo -e "\033[1;33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
    echo -e "\033[1;33m⚠️  自動タスク実行モード: 停止するにはCtrl+Cを押してください\033[0m"
    echo -e "\033[1;33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
    
    # 5秒待機（中断可能）
    sleep 5
    
    # 次のタスクを実行
    echo "📌 次のタスクを実行するためのコマンド:"
    echo "claude-code -p \"/e\""
else
    echo "✅ すべてのタスクが完了しました！"
    echo "新しいタスクを生成するには:"
    echo "claude-code -p \"/a\""
fi