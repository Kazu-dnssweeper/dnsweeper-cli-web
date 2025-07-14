# 🚨 人がやるべきタスクリスト

*最終更新: 2025-07-14 11:00 JST*

このドキュメントは、Claude Codeでは実行できない、人間が直接実行する必要があるタスクをまとめています。

---

## ✅ 完了したタスク

### ~~1. GitHub SSH公開鍵設定~~ ✅ 完了
### ~~2. GitHubリポジトリ作成~~ ✅ 完了  
### ~~3. 初回プッシュ実行~~ ✅ 完了
### ~~4. GitHub セキュリティ設定~~ ✅ 完了

**リポジトリ**: https://github.com/Kazu-dnssweeper/dnsweeper-cli-web

---

## 🟡 重要タスク（今週中）

### 4. npmアカウント準備 ⏰ 15分
1. https://www.npmjs.com/signup でアカウント作成（既存の場合はスキップ）
2. 2FAを有効化（Settings → Password and 2FA）
3. アクセストークンを生成：
   - Settings → Access Tokens → Generate New Token
   - Type: Automation
   - 生成されたトークンを安全に保管

### 5. GitHub Actions Secrets設定 ⏰ 10分
**前提**: リポジトリ作成済み

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 以下のSecretを追加：
   - `NPM_TOKEN`: npmで生成したアクセストークン
   - `CODECOV_TOKEN`: https://codecov.io でリポジトリ登録後に取得

### 6. 技術記事第1弾の執筆 ⏰ 2-3時間
**タイトル案**: 「DNS管理の盲点を解決！リスク分析機能付きCLIツール『DNSweeper』を作った話」

**構成案**:
1. DNS管理の課題（使われていないレコード、リスク）
2. 既存ツールの問題点
3. DNSweeperの特徴（リスクスコア、CSV対応、Web UI）
4. 実装のポイント（TypeScript、並列処理）
5. 今後の展望

**投稿先**: 
- Qiita
- Zenn
- はてなブログ（技術系）

---

## 🟢 通常タスク（今月中）

### 7. 外部API認証情報の取得 ⏰ 各20分

#### Cloudflare API
1. https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Custom token
3. Permissions: Zone:DNS:Read
4. 生成されたトークンを環境変数に設定

#### AWS Route53（オプション）
1. IAMユーザー作成
2. Route53ReadOnlyAccessポリシーをアタッチ
3. アクセスキーを生成

### 8. マーケティング準備 ⏰ 各30分
- [ ] Product Huntアカウント作成
- [ ] Twitter/X 技術アカウントでの告知準備
- [ ] GitHubのSocial Preview画像作成（1200x630px）

### 9. セキュリティ強化 ⏰ 15分
GitHubリポジトリ設定：
- [ ] Settings → Security → Enable Dependabot alerts
- [ ] Settings → Security → Enable Dependabot security updates
- [ ] Settings → Code security and analysis → すべて有効化

---

## 📊 進捗トラッキング

| タスク | 状態 | 完了日 |
|--------|------|--------|
| GitHub SSH鍵設定 | ✅ 完了 | 2025-07-14 |
| GitHubリポジトリ作成 | ✅ 完了 | 2025-07-14 |
| 初回プッシュ | ✅ 完了 | 2025-07-14 |
| npmアカウント準備 | ✅ 完了 | 2025-07-14 |
| GitHub Actions設定 | ✅ 完了 | 2025-07-14 |
| 技術記事執筆 | 🟡 未着手 | - |
| 外部API設定 | 🟢 未着手 | - |

---

## 💡 Tips

- SSH接続テスト: `ssh -T git@github.com`
- npm公開前のテスト: `npm pack --dry-run`
- GitHubリポジトリの可視性は後から変更可能
- 2FAは必須（セキュリティのため）

---

## 🎯 次のステップ

1. **最優先**: GitHub SSH鍵設定 → リポジトリ作成 → 初回プッシュ
2. **その後**: CI/CD設定 → npm公開準備
3. **公開後**: 技術記事 → コミュニティへの展開

このリストは`.claude/auto-task-system.md`と連動して更新されます。