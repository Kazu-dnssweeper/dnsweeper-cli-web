#!/bin/bash
# Git自動プッシュシステムのセットアップスクリプト

echo "🚀 Git自動プッシュシステムをセットアップします"

# プロジェクトルートへ移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit 1

# 必要なディレクトリを作成
mkdir -p .claude

# Pythonがインストールされているか確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3が見つかりません。インストールしてください。"
    exit 1
fi

# scheduleパッケージがインストールされているか確認
if ! python3 -c "import schedule" 2>/dev/null; then
    echo "📦 scheduleパッケージをインストールします..."
    pip3 install schedule || {
        echo "❌ scheduleパッケージのインストールに失敗しました"
        echo "手動で実行してください: pip3 install schedule"
    }
fi

# crontabへの追加を提案
echo ""
echo "📅 以下のcrontabエントリを追加することを推奨します："
echo ""
echo "# Git自動プッシュ（3時間ごと）"
echo "0 */3 * * * cd $PROJECT_ROOT && /usr/bin/python3 scripts/auto-push.py > /dev/null 2>&1"
echo ""
echo "# Gitプッシュリマインダー（1時間ごと）"
echo "0 * * * * cd $PROJECT_ROOT && /bin/bash scripts/push-reminder.sh > /dev/null 2>&1"
echo ""
echo "追加方法: crontab -e を実行して上記を貼り付けてください"
echo ""

# 現在の状態を確認
echo "📊 現在のGitステータス:"
UNPUSHED=$(git log origin/master..HEAD --oneline 2>/dev/null | wc -l)
UNSTAGED=$(git status --porcelain 2>/dev/null | wc -l)

echo "  - 未プッシュコミット: ${UNPUSHED}個"
echo "  - 未ステージ変更: ${UNSTAGED}個"

if [ $UNPUSHED -gt 0 ] || [ $UNSTAGED -gt 0 ]; then
    echo ""
    echo "⚠️  未保存の変更があります！"
    echo ""
    read -p "今すぐ自動プッシュを実行しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🤖 自動プッシュを実行します..."
        python3 scripts/auto-push.py --once || echo "❌ 自動プッシュに失敗しました"
    fi
fi

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "📌 利用可能なコマンド:"
echo "  - python3 scripts/auto-push.py        # 自動プッシュデーモンを起動"
echo "  - bash scripts/push-reminder.sh       # プッシュリマインダーを実行"
echo "  - git push origin master              # 手動でプッシュ"
echo ""