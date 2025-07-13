# 🚀 GitHub リポジトリ設定手順

## 1. GitHubでの新規リポジトリ作成

### リポジトリ名
```
dnsweeper
```

### 説明文（Description）
```
Advanced CLI tool for DNS record risk analysis and cleanup. Features CSV import for Cloudflare/Route53, automated risk assessment, and parallel DNS validation.
```

### Topics（タグ設定）
以下のタグを設定してください：

**必須タグ**:
- `dns`
- `cli` 
- `typescript`
- `nodejs`

**機能タグ**:
- `dns-analysis`
- `dns-management`
- `risk-assessment`
- `csv-processing`
- `cloudflare`
- `route53`

**技術タグ**:
- `devops`
- `network-tools`
- `security-tools`
- `dns-cleanup`
- `infrastructure`

## 2. リポジトリ設定

### 基本設定
- ✅ Public repository
- ✅ Initialize with README (スキップ - 既に存在)
- ✅ Add .gitignore (スキップ - 既に存在)
- ✅ Choose MIT license (スキップ - 既に存在)

### ブランチ保護設定
1. Settings → Branches
2. Add rule for `main` branch:
   - Require pull request reviews before merging
   - Dismiss stale PR reviews when new commits are pushed
   - Require status checks to pass before merging

## 3. リモートリポジトリへのプッシュ

GitHubでリポジトリを作成した後、以下のコマンドを実行：

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/[YOUR_USERNAME]/dnsweeper.git

# メインブランチの名前を設定
git branch -M main

# 初回プッシュ
git push -u origin main
```

## 4. GitHub Actions設定

以下のワークフローが自動的に有効化されます：
- ✅ `.github/workflows/test.yml` - テスト自動実行
- ✅ `.github/workflows/security.yml` - セキュリティスキャン  
- ✅ `.github/workflows/release.yml` - リリース自動化

## 5. npm公開準備（将来）

package.jsonの更新が必要な項目：
- `repository.url` → 実際のGitHubリポジトリURL
- `bugs.url` → IssueページURL
- `homepage` → READMEページURL
- `author` → 作成者情報

## 6. 完了チェックリスト

- [ ] GitHubリポジトリ作成
- [ ] 説明文とTopics設定
- [ ] リモートリポジトリ追加
- [ ] 初回プッシュ完了
- [ ] GitHub Actions動作確認
- [ ] ブランチ保護設定
- [ ] package.json内のURL更新

## 7. 次のステップ

リポジトリ設定完了後：
1. Web UI基盤構築の計画立案
2. コントリビューションガイドライン作成
3. API統合機能の実装
4. リアルタイムDNS監視機能の設計

---

**このファイルは設定完了後に削除できます**