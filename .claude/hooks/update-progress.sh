#!/bin/bash
# ファイル編集後に進捗を自動更新

echo "📊 進捗を更新中..."

# タスクファイルが存在しない場合はスキップ
TASK_FILE="/home/hikit/dnsweeper/.claude/auto-task-system.md"
if [ ! -f "$TASK_FILE" ]; then
    echo "⚠️  タスクファイルが見つかりません。初期化が必要です。"
    exit 0
fi

# 進捗状況を計算
COMPLETED=$(grep -c "- \[x\]" "$TASK_FILE" 2>/dev/null || echo 0)
TOTAL=$(grep -c "- \[" "$TASK_FILE" 2>/dev/null || echo 0)

if [ $TOTAL -gt 0 ]; then
    PROGRESS=$((COMPLETED * 100 / TOTAL))
    echo "📈 現在の進捗: $PROGRESS% ($COMPLETED/$TOTAL タスク完了)"
    
    # 次の推奨アクション
    echo "💡 次の推奨アクション:"
    echo "claude-code -p \"/project:update-progress\" --continue"
fi