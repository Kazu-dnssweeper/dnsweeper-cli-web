# GitHub リポジトリ設定ガイド

## リポジトリ説明文 (Description)

**日本語**: 
DNSレコードのリスク分析とクリーンアップを支援するCLIツール。Cloudflare/Route53のCSVインポート、自動リスク評価、並列DNS検証機能を搭載。

**英語**:
Advanced CLI tool for DNS record risk analysis and cleanup. Features CSV import for Cloudflare/Route53, automated risk assessment, and parallel DNS validation.

## Topics (推奨タグ)

### 必須タグ
- `dns`
- `cli`
- `typescript`
- `nodejs`

### 機能関連タグ
- `dns-analysis`
- `dns-management`
- `risk-assessment`
- `csv-processing`
- `cloudflare`
- `route53`
- `aws`

### 技術関連タグ
- `commander`
- `papaparse`
- `devops`
- `network-tools`
- `security-tools`

### 用途関連タグ
- `dns-cleanup`
- `dns-audit`
- `infrastructure`
- `monitoring`

## GitHub リポジトリ設定手順

### 1. Repository Details
- **Description**: 上記の説明文を使用
- **Website**: （将来的にドキュメントサイト用）
- **Topics**: 上記タグから適切なものを選択（最大20個）

### 2. 推奨設定
- ✅ Public repository
- ✅ Add a README file
- ✅ Add .gitignore (Node.js template)
- ✅ Choose a license (MIT)

### 3. Branch Protection Rules
- Require pull request reviews
- Dismiss stale reviews
- Require status checks (CI tests)

### 4. GitHub Actions
- 既に設定済み: test.yml, security.yml, release.yml

## SEO最適化キーワード

- DNS record management
- DNS cleanup tool
- Cloudflare DNS import
- Route53 DNS analysis
- DNS risk assessment
- Network infrastructure tools
- DNS security audit
- DevOps DNS tools
- DNS record validation
- Infrastructure automation

## 競合分析

### 既存ツールとの差別化ポイント
1. **包括的なリスク分析**: TTL、命名パターン、未使用期間の複合評価
2. **マルチプロバイダー対応**: Cloudflare、Route53、汎用CSV形式
3. **高性能処理**: 並列DNS解決、大容量ファイル対応
4. **実用的なレポート**: JSON/テーブル形式での詳細分析結果

### 類似プロジェクト
- DNSControl (StackExchange)
- octoDNS (GitHub)
- dns-check (npm)
- dig-tools

### 独自性
- リスクスコア算出による優先度付け
- 実際のDNS解決による検証機能
- CSVファイルからの一括インポート
- コマンドライン特化の高速処理