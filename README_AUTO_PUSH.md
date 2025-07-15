# 🚀 Git自動プッシュシステム

DNSweeperプロジェクトのGit自動プッシュシステムの設定と使用方法

## 📋 概要

このシステムは、コミットの忘れやプッシュ忘れを防ぐために、以下の方法で自動化を提供します：

1. **GitHub Actions** - 定期的な自動プッシュ（最優先）
2. **Git Hooks** - コミット後の自動リマインダー
3. **ローカルスクリプト** - Python/Bashによる自動化
4. **VSCode Tasks** - エディタ統合

## 🔧 セットアップ

### 初期設定
```bash
# セットアップスクリプトを実行
bash scripts/setup-auto-push.sh
```

### 手動設定（必要に応じて）

#### 1. Crontabの設定
```bash
crontab -e
```

以下を追加：
```cron
# Git自動プッシュ（3時間ごと）
0 */3 * * * cd ~/dnsweeper && /usr/bin/python3 scripts/auto-push.py > /dev/null 2>&1

# Gitプッシュリマインダー（1時間ごと）
0 * * * * cd ~/dnsweeper && /bin/bash scripts/push-reminder.sh > /dev/null 2>&1
```

#### 2. Pythonパッケージのインストール
```bash
pip3 install schedule
```

## 📊 機能詳細

### GitHub Actions（`.github/workflows/scheduled-push.yml`）
- **実行時間**: 日本時間 9:00, 12:00, 18:00, 23:00
- **動作**: 未コミットの変更を自動的にコミット・プッシュ
- **利点**: サーバーサイドで実行されるため、ローカル環境に依存しない

### Git Hooks（`.git/hooks/post-commit`）
- **実行タイミング**: 各コミット後
- **動作**: 
  - プッシュリマインダーを表示
  - 未プッシュコミット数を表示
  - 10個以上溜まると強い警告

### 自動プッシュスクリプト（`scripts/auto-push.py`）
- **定期実行**: 3時間ごと + 12:00, 18:00, 23:00
- **機能**:
  - 未ステージ変更の自動コミット
  - 未プッシュコミットの自動プッシュ
  - 10個以上のコミットで緊急プッシュ

### リマインダースクリプト（`scripts/push-reminder.sh`）
- **実行間隔**: 1時間ごと（cron経由）
- **機能**:
  - 未プッシュ状態をチェック
  - ターミナル通知
  - WSL環境でのWindows通知（対応環境のみ）
  - 10個以上で自動プッシュ実行

### VSCode Tasks（`.vscode/tasks.json`）
- **Auto Commit & Push**: 全変更を自動コミット・プッシュ
- **Check Git Status**: 現在の状態確認
- **Force Push All Changes**: 緊急保存とプッシュ

## 💻 使用方法

### デーモンモードで起動
```bash
# バックグラウンドで常時実行
python3 scripts/auto-push.py &
```

### 1回だけ実行
```bash
# 即座に自動プッシュを実行
python3 scripts/auto-push.py --once
```

### 状態確認
```bash
# プッシュリマインダーを手動実行
bash scripts/push-reminder.sh
```

### VSCodeから実行
1. `Ctrl+Shift+P` でコマンドパレットを開く
2. "Tasks: Run Task" を選択
3. 以下のいずれかを選択：
   - Auto Commit & Push
   - Check Git Status
   - Force Push All Changes

## 📈 ステータス確認

### ログファイル
- `.claude/push-reminder.log` - リマインダーの実行ログ
- `.claude/push-reminder.txt` - 現在の未プッシュ状態

### 手動確認コマンド
```bash
# 未プッシュコミット数
git log origin/master..HEAD --oneline | wc -l

# 未ステージ変更
git status --porcelain | wc -l
```

## ⚠️ 注意事項

1. **master/mainブランチ**: スクリプトはmasterブランチを対象としています。必要に応じて変更してください
2. **認証**: GitHub Actionsでは`GITHUB_TOKEN`を使用。ローカルではSSH/HTTPSの認証設定が必要
3. **競合**: 複数の自動化が同時に動作しないよう注意
4. **コミットメッセージ**: 自動コミットは`🤖 auto:`プレフィックスを使用

## 🛠️ トラブルシューティング

### プッシュが失敗する場合
```bash
# SSH認証の確認
ssh -T git@github.com

# HTTPSクレデンシャルの確認
git config --global credential.helper
```

### スクリプトが動作しない場合
```bash
# 実行権限の確認
ls -la scripts/*.py scripts/*.sh

# Pythonパスの確認
which python3

# scheduleモジュールの確認
python3 -c "import schedule"
```

## 📝 カスタマイズ

### 実行間隔の変更
`scripts/auto-push.py`の以下の部分を編集：
```python
# 3時間ごと → 2時間ごとに変更
schedule.every(2).hours.do(auto_push)
```

### ブランチの変更
全スクリプトで`master`を対象のブランチ名に置換

### 通知方法の追加
`scripts/push-reminder.sh`に通知コマンドを追加

---

これで、コミット忘れやプッシュ忘れを防ぐ完全自動化システムが構築されました！ 🎉