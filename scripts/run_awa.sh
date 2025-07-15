#!/bin/bash
# /awa コマンドの実装 - /a --with-ai のショートカット

echo "🤖 AI統合分析を開始します..."
echo ""

# ANTHROPIC_API_KEYの確認
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ エラー: ANTHROPIC_API_KEY が設定されていません"
    echo ""
    echo "以下のコマンドで設定してください:"
    echo "export ANTHROPIC_API_KEY='your-api-key'"
    exit 1
fi

# Pythonスクリプトの存在確認
SCRIPT_PATH="$(dirname "$0")/analyze_with_claude.py"
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ エラー: analyze_with_claude.py が見つかりません"
    exit 1
fi

# Python依存関係の確認
if ! python3 -c "import anthropic" 2>/dev/null; then
    echo "📦 anthropicパッケージをインストールしています..."
    pip3 install anthropic --break-system-packages || pip3 install anthropic
fi

# AI統合分析を実行（--with-aiフラグを自動的に追加）
echo "📊 静的分析を実行中..."
echo "🏗️  アーキテクチャ分析を準備中..."
echo "🔧 リファクタリング提案を準備中..."
echo "🧪 テスト生成戦略を準備中..."
echo ""

python3 "$SCRIPT_PATH" --with-ai

# 実行結果の確認
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AI統合分析が完了しました！"
    echo ""
    echo "📄 レポートが生成されました: .claude/ai-analysis-report.md"
    echo "🔗 次回の /e 実行時に分析結果が優先タスクとして設定されます"
else
    echo ""
    echo "❌ AI統合分析でエラーが発生しました"
    exit 1
fi