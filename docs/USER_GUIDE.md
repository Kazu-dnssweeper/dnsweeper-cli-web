# DNSweeper ユーザーガイド

## 📖 はじめに

DNSweeperは、DNS レコードの分析・管理・監視を行う統合プラットフォームです。CLIツールとWebアプリケーションの両方を提供し、DNS セキュリティとパフォーマンスの向上を支援します。

## 🚀 クイックスタート

### Web アプリケーション

1. **ログイン**
   - ブラウザで `https://yourdomain.com` にアクセス
   - デフォルト管理者アカウント: `admin@dnsweeper.local` / `admin123`
   - 初回ログイン後にパスワードを変更してください

2. **ファイルアップロード**
   - Dashboard → Upload ページへ移動
   - CSVファイルをドラッグ&ドロップまたは選択
   - 自動形式検出またはCloudflare/Route53形式を選択
   - アップロード開始

3. **分析結果の確認**
   - Analysis ページで詳細な分析結果を確認
   - リスクレベル別の分類表示
   - ドメイン別、レコードタイプ別の統計

### CLI ツール

```bash
# ヘルプ表示
dnsweeper --help

# CSVファイルの分析
dnsweeper analyze domains.csv

# DNS レコードの一覧表示
dnsweeper list --domain example.com

# リスク分析
dnsweeper sweep --file domains.csv --output-format json
```

## 🎯 主要機能

### 1. DNS レコード分析

#### ファイル形式サポート
- **Cloudflare CSV**: Name, Type, Content, TTL, Priority
- **Route53 CSV**: Name, Type, Value, TTL, Weight, SetIdentifier  
- **汎用CSV**: Domain, Type, Value

#### 分析項目
- **セキュリティリスク**: SPF/DKIM設定、証明書チェック
- **パフォーマンス**: TTL設定、応答時間
- **設定ミス**: 無効なレコード、重複設定
- **ベストプラクティス**: 命名規則、構造分析

### 2. リアルタイム監視

#### 監視対象
- DNS 解決時間
- レコード健全性
- ゾーン状態
- サービス可用性

#### アラート機能
- 応答時間閾値超過
- DNS 解決失敗
- 設定変更検知
- パフォーマンス劣化

### 3. 変更履歴管理

#### 記録内容
- レコード作成・更新・削除
- 変更前後の値
- 実行ユーザー・日時
- 変更理由・コメント

#### 監査機能
- 完全な変更ログ
- ユーザー行動追跡
- API アクセス記録
- セキュリティイベント

### 4. マルチアカウント対応

#### 組織管理
- 複数組織の切り替え
- 役割ベースアクセス制御
- チーム権限管理
- リソース分離

#### 権限レベル
- **Owner**: 全権限
- **Admin**: 管理権限
- **Editor**: 編集権限  
- **Viewer**: 閲覧のみ

## 🔧 詳細機能

### Web インターフェース

#### ダッシュボード
```
📊 メトリクス概要
├── 総レコード数
├── リスクレベル分布
├── 最近の分析結果
└── システム状態
```

#### ファイルアップロード
```
📤 アップロード機能
├── ドラッグ&ドロップ対応
├── 複数ファイル同時処理
├── 進捗リアルタイム表示
└── エラーハンドリング
```

#### 分析結果
```
📈 結果表示
├── リスクレベル別フィルタ
├── ドメイン検索
├── エクスポート機能
└── 詳細レポート
```

#### リアルタイム監視
```
🔍 監視ダッシュボード
├── ライブメトリクス
├── アラート管理
├── パフォーマンスグラフ
└── ゾーン健全性
```

### CLI コマンド

#### analyze
```bash
# 基本分析
dnsweeper analyze input.csv

# オプション指定
dnsweeper analyze input.csv \
  --format cloudflare \
  --output-format json \
  --output-file results.json \
  --resolve-dns \
  --parallel 10
```

#### list
```bash
# ドメイン一覧
dnsweeper list --domain example.com

# フィルタ指定
dnsweeper list \
  --domain example.com \
  --type A \
  --risk-level high
```

#### lookup
```bash
# DNS 解決 + 分析
dnsweeper lookup example.com

# 複数レコードタイプ
dnsweeper lookup example.com --types A,AAAA,MX,TXT
```

#### sweep
```bash
# 一括解決・分析
dnsweeper sweep --file domains.txt

# 並列処理
dnsweeper sweep \
  --file domains.txt \
  --parallel 20 \
  --timeout 5000
```

#### import
```bash
# CSV インポート
dnsweeper import data.csv --format cloudflare

# ドライラン
dnsweeper import data.csv --dry-run --verbose
```

#### validate
```bash
# DNS 設定検証
dnsweeper validate --domain example.com

# 設定ファイル検証
dnsweeper validate --config dns-config.json
```

#### sync
```bash
# Cloudflare 同期
dnsweeper sync cloudflare --zone-id abc123

# Route53 同期  
dnsweeper sync route53 --hosted-zone-id Z123
```

#### performance
```bash
# パフォーマンス分析
dnsweeper performance --domain example.com

# 継続監視
dnsweeper performance \
  --domain example.com \
  --interval 60 \
  --duration 3600
```

## 📊 レポート・エクスポート

### Web エクスポート

#### サポート形式
- **PDF**: 経営報告・監査用
- **Excel**: 詳細分析・加工用  
- **CSV**: データ連携・移行用
- **JSON**: API 連携・自動化用

#### レポートテンプレート
- **Executive Summary**: 経営層向け
- **Technical Report**: 技術者向け
- **Security Assessment**: セキュリティ監査
- **Performance Analysis**: パフォーマンス分析

### CLI エクスポート

```bash
# JSON 形式
dnsweeper analyze data.csv --output-format json

# テーブル形式
dnsweeper analyze data.csv --output-format table

# CSV 形式  
dnsweeper analyze data.csv --output-format csv

# カスタムフィールド
dnsweeper analyze data.csv \
  --output-format json \
  --fields domain,risk_score,risk_level,issues
```

## 🔒 セキュリティ

### 認証・認可

#### ユーザー管理
- JWT トークン認証
- Refresh トークン自動更新
- パスワード強度要件
- アカウントロック機能

#### API セキュリティ
- Rate limiting
- CORS 設定
- Input validation
- SQL injection 対策

### データ保護

#### 暗号化
- 保存時暗号化（Database）
- 転送時暗号化（HTTPS/TLS）
- パスワードハッシュ化（bcrypt）
- セッション暗号化

#### プライバシー
- データ分離（Multi-tenant）
- アクセスログ
- 監査証跡
- GDPR 準拠

## 🛠️ 設定・カスタマイズ

### Web 設定

#### システム設定
```javascript
{
  "dns": {
    "timeout": 5000,
    "retries": 3,
    "parallel": 10
  },
  "analysis": {
    "riskThresholds": {
      "high": 8.0,
      "medium": 5.0,
      "low": 2.0
    }
  },
  "monitoring": {
    "interval": 300,
    "alertThreshold": 5000
  }
}
```

#### アカウント設定
- プロファイル管理
- 通知設定
- API キー管理
- 権限設定

### CLI 設定

#### 設定ファイル: `~/.dnsweeper/config.json`
```json
{
  "dns": {
    "servers": ["8.8.8.8", "1.1.1.1"],
    "timeout": 5000,
    "retries": 3
  },
  "output": {
    "format": "table",
    "colorize": true
  },
  "api": {
    "cloudflare": {
      "token": "your-token",
      "email": "your-email"
    },
    "route53": {
      "accessKeyId": "your-key",
      "secretAccessKey": "your-secret",
      "region": "us-east-1"
    }
  }
}
```

#### 環境変数
```bash
export DNSWEEPER_CONFIG_PATH=/path/to/config.json
export DNSWEEPER_LOG_LEVEL=info
export DNSWEEPER_OUTPUT_FORMAT=json
export CLOUDFLARE_API_TOKEN=your-token
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

## 🚨 トラブルシューティング

### よくある問題

#### 1. DNS 解決失敗
```bash
# 詳細ログで原因確認
dnsweeper lookup example.com --verbose

# DNS サーバー指定
dnsweeper lookup example.com --dns-server 8.8.8.8

# タイムアウト調整
dnsweeper lookup example.com --timeout 10000
```

#### 2. ファイル形式エラー
```bash
# 形式自動検出
dnsweeper analyze data.csv --format auto

# エンコーディング指定
dnsweeper analyze data.csv --encoding utf-8

# 区切り文字指定
dnsweeper analyze data.csv --delimiter ","
```

#### 3. パフォーマンス問題
```bash
# 並列数調整
dnsweeper sweep --file domains.txt --parallel 5

# バッチサイズ調整
dnsweeper sweep --file domains.txt --batch-size 100

# タイムアウト調整
dnsweeper sweep --file domains.txt --timeout 10000
```

### ログ・デバッグ

#### ログレベル
- `error`: エラーのみ
- `warn`: 警告以上
- `info`: 情報以上（デフォルト）
- `debug`: デバッグ情報
- `silly`: 全詳細情報

#### ログファイル
- CLI: `~/.dnsweeper/logs/`
- Web: `/app/logs/`
- システム: `docker-compose logs`

## 📞 サポート

### ヘルプリソース

- **コマンドヘルプ**: `dnsweeper --help`
- **Web ヘルプ**: アプリ内ヘルプセクション
- **API ドキュメント**: `/docs/API.md`
- **開発者ガイド**: `/docs/DEVELOPMENT.md`

### コミュニティ

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions  
- **Wiki**: GitHub Wiki
- **Examples**: `/docs/examples/`

---

このガイドは DNSweeper v1.0.0 に基づいています。最新の情報は [公式ドキュメント](https://github.com/your-org/dnsweeper) をご確認ください。