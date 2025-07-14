# DNSweeper 使用例集

このドキュメントでは、DNSweeperの各機能の具体的な使用例を紹介します。

## 目次

- [基本的な使い方](#基本的な使い方)
- [DNSレコード管理](#dnsレコード管理)
- [CSV処理](#csv処理)
- [リスク分析](#リスク分析)
- [包括的なDNS監査](#包括的なdns監査)
- [高度な使用例](#高度な使用例)

## 基本的な使い方

### ヘルプの表示

```bash
# メインヘルプ
dnsweeper --help

# 特定のコマンドのヘルプ
dnsweeper lookup --help
dnsweeper analyze --help
```

### バージョンの確認

```bash
dnsweeper --version
```

## DNSレコード管理

### レコードの一覧表示

```bash
# 全レコードを表示
dnsweeper list

# テーブル形式で表示（デフォルト）
dnsweeper list --output table

# JSON形式で表示
dnsweeper list --output json

# CSV形式でファイルに保存
dnsweeper list --output csv --file records.csv
```

### レコードの追加

```bash
# Aレコードの追加
dnsweeper add example.com A 192.168.1.1

# CNAMEレコードの追加
dnsweeper add www.example.com CNAME example.com

# MXレコードの追加（優先度付き）
dnsweeper add example.com MX mail.example.com --priority 10

# TXTレコードの追加
dnsweeper add example.com TXT "v=spf1 include:_spf.google.com ~all"
```

### レコードの削除

```bash
# 特定のレコードを削除
dnsweeper delete example.com A

# 確認プロンプトをスキップ
dnsweeper delete example.com A --force
```

## CSV処理

### CSV形式でのインポート

```bash
# Cloudflare形式のCSVをインポート
dnsweeper import cloudflare-export.csv

# Route53形式のCSVをインポート
dnsweeper import route53-export.csv --format route53

# 汎用形式のCSVをインポート（自動検出）
dnsweeper import dns-records.csv --format generic

# 文字エンコーディングを指定
dnsweeper import japanese-records.csv --encoding shift_jis

# ドライラン（実際にはインポートしない）
dnsweeper import records.csv --dry-run
```

### CSVインポートの詳細例

#### Cloudflare形式
```csv
type,name,content,ttl,priority,proxied
A,example.com,192.168.1.1,3600,,false
CNAME,www,example.com,3600,,true
MX,@,mail.example.com,3600,10,false
```

#### Route53形式
```csv
Name,Type,Value,TTL,SetIdentifier
example.com.,A,192.168.1.1,300,
www.example.com.,CNAME,example.com.,300,
example.com.,MX,10 mail.example.com.,300,
```

#### 汎用形式
```csv
domain,type,value,ttl
example.com,A,192.168.1.1,3600
www.example.com,CNAME,example.com,3600
example.com,MX,mail.example.com,3600
```

## リスク分析

### 単一ドメインの分析

```bash
# 基本的な分析
dnsweeper analyze example.com

# 詳細な分析結果を表示
dnsweeper analyze example.com --verbose

# JSON形式で結果を保存
dnsweeper analyze example.com --output json --file analysis.json
```

### バッチ分析

```bash
# インポートしたレコードを全て分析
dnsweeper analyze --all

# 特定のタイプのレコードのみ分析
dnsweeper analyze --all --type A,CNAME

# リスクレベルでフィルタリング
dnsweeper analyze --all --min-risk high
```

## 包括的なDNS監査

### DNS解決の検証

```bash
# 単一ドメインのDNS解決
dnsweeper lookup example.com

# 全レコードタイプを検証
dnsweeper lookup example.com --type ALL

# 特定のレコードタイプのみ
dnsweeper lookup example.com --type A,AAAA,MX

# カスタムDNSサーバーを使用
dnsweeper lookup example.com --server 8.8.8.8

# タイムアウトを設定
dnsweeper lookup example.com --timeout 10
```

### 一括DNS検証（sweep）

```bash
# CSVファイルから一括検証
dnsweeper sweep domains.csv

# 標準入力から読み込み
cat domains.txt | dnsweeper sweep -

# インポート済みレコードを全て検証
dnsweeper sweep --all

# 並列実行数を指定
dnsweeper sweep domains.csv --concurrency 50

# 結果をファイルに保存
dnsweeper sweep domains.csv --output json --file results.json

# プログレスバーを表示
dnsweeper sweep large-domains.csv --progress
```

### DNS設定の妥当性検証

```bash
# 基本的な検証
dnsweeper validate example.com

# 全ての検証項目を実行
dnsweeper validate example.com --checks all

# 特定の検証のみ実行
dnsweeper validate example.com --checks mx,spf,nameservers

# しきい値を設定
dnsweeper validate example.com --max-cname-depth 5 --min-ttl 300

# 詳細な検証結果
dnsweeper validate example.com --verbose
```

## 高度な使用例

### 設定ファイルの使用

`.dnsweeper.json`を作成して、デフォルト設定をカスタマイズ：

```json
{
  "defaultFormat": "table",
  "defaultTimeout": 10,
  "parallelism": 20,
  "riskThresholds": {
    "low": 30,
    "medium": 60,
    "high": 80
  },
  "logging": {
    "level": "info",
    "file": "dnsweeper.log"
  }
}
```

### 環境変数の使用

```bash
# デフォルトの出力形式を設定
export DNSWEEPER_OUTPUT_FORMAT=json

# ログレベルを設定
export DNSWEEPER_LOG_LEVEL=debug

# カラー出力を無効化
export NO_COLOR=1
```

### パイプラインでの使用

```bash
# リスクの高いレコードを抽出してCSVに保存
dnsweeper analyze --all --output json | \
  jq '.[] | select(.riskScore > 70)' | \
  dnsweeper export --format csv > high-risk-records.csv

# DNSレコードの変更を監視
dnsweeper lookup example.com --output json > before.json
# ... 時間経過 ...
dnsweeper lookup example.com --output json > after.json
diff before.json after.json
```

### スクリプトでの活用

```bash
#!/bin/bash
# high-risk-cleanup.sh

# リスクの高いレコードを検出して削除候補リストを作成
dnsweeper analyze --all --min-risk high --output json | \
  jq -r '.[] | "\(.name) \(.type)"' > deletion-candidates.txt

# 削除候補を確認
echo "以下のレコードが削除候補です："
cat deletion-candidates.txt

# ユーザーの確認を求める
read -p "削除を実行しますか？ (y/N): " confirm

if [[ $confirm == "y" ]]; then
  while read -r name type; do
    dnsweeper delete "$name" "$type" --force
  done < deletion-candidates.txt
fi
```

### CI/CDパイプラインでの使用

```yaml
# .github/workflows/dns-audit.yml
name: DNS Audit

on:
  schedule:
    - cron: '0 0 * * 0'  # 毎週日曜日に実行
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install DNSweeper
        run: npm install -g dnsweeper
      
      - name: Import DNS records
        run: dnsweeper import dns-records.csv
      
      - name: Run DNS validation
        run: |
          dnsweeper sweep --all --output json > validation-results.json
          dnsweeper analyze --all --output json > analysis-results.json
      
      - name: Check for high-risk records
        run: |
          high_risk_count=$(jq '[.[] | select(.riskScore > 80)] | length' analysis-results.json)
          if [ $high_risk_count -gt 0 ]; then
            echo "::warning::Found $high_risk_count high-risk DNS records"
            exit 1
          fi
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: dns-audit-results
          path: |
            validation-results.json
            analysis-results.json
```

### Docker環境での使用

```dockerfile
# Dockerfile
FROM node:20-alpine
RUN npm install -g dnsweeper
WORKDIR /app
COPY dns-records.csv .
CMD ["dnsweeper", "import", "dns-records.csv"]
```

```bash
# Docker Composeでの使用例
docker run -it --rm \
  -v $(pwd)/records:/app/records \
  dnsweeper \
  dnsweeper analyze --all --output json
```

## トラブルシューティング

### デバッグモードの有効化

```bash
# 詳細なデバッグ情報を表示
DNSWEEPER_LOG_LEVEL=debug dnsweeper lookup example.com

# ネットワークトレースを有効化
dnsweeper lookup example.com --trace
```

### よくある問題と解決策

1. **DNS解決のタイムアウト**
   ```bash
   # タイムアウトを延長
   dnsweeper lookup slow-domain.com --timeout 30
   ```

2. **文字化けの問題**
   ```bash
   # エンコーディングを明示的に指定
   dnsweeper import japanese-records.csv --encoding shift_jis
   ```

3. **メモリ不足エラー**
   ```bash
   # 並列実行数を減らす
   dnsweeper sweep large-file.csv --concurrency 10
   ```

## まとめ

DNSweeperは、シンプルなコマンドラインインターフェースでありながら、強力なDNS管理機能を提供します。この使用例集を参考に、あなたの環境に合わせた使い方を見つけてください。

さらなる情報は、[APIドキュメント](./api/index.html)や[設定ガイド](./configuration.md)を参照してください。