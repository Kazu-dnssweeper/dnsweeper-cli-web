# DNSweeper CLIコマンドリファレンス

このドキュメントでは、DNSweeperで利用可能なすべてのCLIコマンドについて詳しく説明します。

## 目次

1. [グローバルオプション](#グローバルオプション)
2. [importコマンド](#importコマンド)
3. [analyzeコマンド](#analyzeコマンド)
4. [その他のコマンド](#その他のコマンド)

---

## グローバルオプション

すべてのコマンドで利用可能なオプション：

| オプション | 短縮形 | 説明 |
|-----------|--------|------|
| `--version` | `-V` | バージョン番号を表示 |
| `--help` | `-h` | ヘルプを表示 |

---

## importコマンド

CSVファイルからDNSレコードをインポートし、オプションでDNS検証を実行します。

### 構文

```bash
dnsweeper import <file> [options]
```

### 引数

| 引数 | 必須 | 説明 |
|------|------|------|
| `file` | はい | インポートするCSVファイルのパス |

### オプション

| オプション | 短縮形 | 値 | デフォルト | 説明 |
|-----------|--------|-----|------------|------|
| `--format` | `-f` | `cloudflare\|route53\|generic\|auto` | `auto` | CSV形式を指定 |
| `--resolve` | `-r` | - | `false` | インポート後にDNS解決を実行 |
| `--streaming` | `-s` | - | `false` | 大容量ファイル用ストリーミング処理を使用 |
| `--verbose` | `-v` | - | `false` | 詳細な出力を表示 |
| `--quiet` | `-q` | - | `false` | エラー以外の出力を抑制 |
| `--json` | `-j` | - | `false` | 結果をJSON形式で出力 |

### 使用例

#### 基本的な使用方法

```bash
# 自動形式検出でインポート
dnsweeper import dns-records.csv

# Cloudflare形式を明示的に指定
dnsweeper import cloudflare-export.csv --format cloudflare

# Route53形式でインポート
dnsweeper import route53-zones.csv --format route53
```

#### DNS検証付きインポート

```bash
# インポート後、各レコードのDNS解決を実行
dnsweeper import dns-records.csv --resolve

# 詳細な出力付き
dnsweeper import dns-records.csv --resolve --verbose
```

#### 大容量ファイルの処理

```bash
# ストリーミング処理を使用（メモリ効率的）
dnsweeper import large-dns-export.csv --streaming

# ストリーミング + DNS検証
dnsweeper import large-dns-export.csv --streaming --resolve
```

#### JSON出力

```bash
# インポート結果をJSON形式で出力
dnsweeper import dns-records.csv --json

# JSON出力をファイルに保存
dnsweeper import dns-records.csv --json > import-result.json
```

### CSV形式の詳細

#### Cloudflare形式

```csv
domain,record_type,value,ttl,priority
example.com,A,192.168.1.1,3600,
www.example.com,CNAME,example.com,3600,
mail.example.com,MX,mail-server.example.com,3600,10
_service._tcp.example.com,SRV,server.example.com,3600,10
```

必須フィールド：
- `domain`: ドメイン名
- `record_type`: レコードタイプ（A, AAAA, CNAME, MX, TXT, NS, SRV等）
- `value`: レコードの値
- `ttl`: Time To Live（秒）

オプションフィールド：
- `priority`: MX/SRVレコード用の優先度

#### Route53形式

```csv
Name,Type,Value,TTL,SetIdentifier
example.com,A,192.168.1.1,3600,
example.com,MX,10 mail.example.com,3600,
_service._tcp.example.com,SRV,10 5 443 server.example.com,3600,
```

注意点：
- MXレコードの値に優先度が含まれる
- SRVレコードの値に優先度、重み、ポートが含まれる

#### 汎用形式

```csv
domain,type,value,ttl
example.com,A,192.168.1.1,3600
www.example.com,CNAME,example.com,3600
example.com,TXT,"v=spf1 include:_spf.example.com ~all",3600
```

最小限の必須フィールドのみのシンプルな形式。

### 出力例

#### 通常出力

```
Importing DNS records from cloudflare-export.csv...
✅ Successfully imported 150 DNS records

Summary:
- Format detected: cloudflare
- Total records: 150
- Valid records: 148
- Skipped records: 2
- Parse errors: 0

Record type distribution:
  A: 45
  AAAA: 12
  CNAME: 38
  MX: 15
  TXT: 25
  SRV: 10
  NS: 5
```

#### JSON出力

```json
{
  "success": true,
  "format": "cloudflare",
  "summary": {
    "totalRecords": 150,
    "validRecords": 148,
    "skippedRecords": 2,
    "errors": 0
  },
  "recordTypes": {
    "A": 45,
    "AAAA": 12,
    "CNAME": 38,
    "MX": 15,
    "TXT": 25,
    "SRV": 10,
    "NS": 5
  },
  "errors": []
}
```

---

## analyzeコマンド

DNSレコードのリスク分析を実行し、詳細なレポートを生成します。

### 構文

```bash
dnsweeper analyze <file> [options]
```

### エイリアス

- `scan` - `analyze`と同じ機能

### 引数

| 引数 | 必須 | 説明 |
|------|------|------|
| `file` | はい | 分析するCSVファイルのパス |

### オプション

| オプション | 短縮形 | 値 | デフォルト | 説明 |
|-----------|--------|-----|------------|------|
| `--format` | `-f` | `cloudflare\|route53\|generic\|auto` | `auto` | CSV形式を指定 |
| `--level` | `-l` | `low\|medium\|high\|critical` | `medium` | 報告する最小リスクレベル |
| `--check-dns` | `-c` | - | `false` | 各レコードの現在のDNSステータスを確認 |
| `--output` | `-o` | ファイルパス | - | レポートをファイルに保存 |
| `--json` | `-j` | - | `false` | JSON形式で出力 |
| `--verbose` | `-v` | - | `false` | 詳細な出力を表示 |
| `--quiet` | `-q` | - | `false` | エラー以外の出力を抑制 |

### 使用例

#### 基本的なリスク分析

```bash
# デフォルト設定で分析（中リスク以上を表示）
dnsweeper analyze dns-records.csv

# 高リスク以上のレコードのみ表示
dnsweeper analyze dns-records.csv --level high

# すべてのリスクレベルを表示
dnsweeper analyze dns-records.csv --level low
```

#### DNS検証付き分析

```bash
# 現在のDNSステータスを確認しながら分析
dnsweeper analyze dns-records.csv --check-dns

# 詳細出力付き
dnsweeper analyze dns-records.csv --check-dns --verbose
```

#### レポート出力

```bash
# テキストレポートをファイルに保存
dnsweeper analyze dns-records.csv --output risk-report.txt

# JSONレポートを生成
dnsweeper analyze dns-records.csv --json --output risk-report.json

# 高リスクのみのJSONレポート
dnsweeper analyze dns-records.csv --level high --json --output high-risk.json
```

### リスク分析の詳細

#### リスクレベル

| レベル | スコア範囲 | 説明 |
|--------|-----------|------|
| 🟢 Low | 0-25 | 通常のレコード、特に問題なし |
| 🟡 Medium | 26-50 | 注意が必要、レビュー推奨 |
| 🟠 High | 51-75 | 高リスク、早急な対応を推奨 |
| 🔴 Critical | 76-100 | 非常に高リスク、即座の対応が必要 |

#### リスク要因

1. **未使用期間**
   - DNS解決できない期間が長いほど高リスク
   - 30日、90日、180日でスコアが段階的に上昇

2. **疑わしい命名パターン**
   - `temp-`, `test-`, `old-`, `backup-`などのプレフィックス
   - 一時的または廃止予定のレコードを示唆

3. **TTL値**
   - 非常に短いTTL（300秒未満）は高リスク
   - 頻繁な変更や不安定な設定を示唆

4. **レコードタイプ**
   - SRVレコード：サービス設定の変更リスク
   - TXTレコード：認証情報の漏洩リスク
   - CNAMEレコード：参照先不明のリスク

5. **ドメイン階層の深さ**
   - 深いサブドメインは管理が複雑
   - 忘れられやすく、セキュリティリスクが高い

### 出力例

#### テキスト形式（デフォルト）

```
📊 Risk Analysis Summary
========================
Total records analyzed: 150
Records at risk (medium+): 23
Average risk score: 42/100

Risk Distribution:
  🟢 Low: 127
  🟡 Medium: 15
  🟠 High: 6
  🔴 Critical: 2

🚨 Top Risk Records:
===================

🔴 old-backup.example.com (A)
   Risk Score: 95/100 [CRITICAL]
   TTL: 60s | Value: 192.168.1.2
   Recommendations:
   - Record unused for 180 days. Consider removal if no longer needed.
   - Domain name contains suspicious pattern. Verify if this is a temporary or test record.
   - Very short TTL (60s) detected. Consider increasing TTL if record is stable.
   - CRITICAL: This record should be reviewed immediately.

🔴 temp-dev.example.com (CNAME)
   Risk Score: 92/100 [CRITICAL]
   TTL: 300s | Value: dev.example.com
   Recommendations:
   - Record unused for 90 days. Consider removal if no longer needed.
   - Domain name contains suspicious pattern. Verify if this is a temporary or test record.
   - CNAME target may not exist. Verify the target domain.

🟠 unused-staging.example.com (A)
   Risk Score: 68/100 [HIGH]
   TTL: 3600s | Value: 10.0.0.5
   Recommendations:
   - Record unused for 60 days. Consider removal if no longer needed.
   - Domain name suggests staging environment. Ensure it's still needed.

... and 20 more records

✅ Analysis complete!
Found 23 records that need attention.
```

#### JSON形式

```json
{
  "summary": {
    "totalRecords": 150,
    "analyzedRecords": 150,
    "riskyRecords": 23,
    "riskBreakdown": {
      "low": 127,
      "medium": 15,
      "high": 6,
      "critical": 2
    },
    "averageRiskScore": 42,
    "totalRecommendations": 89
  },
  "records": [
    {
      "domain": "old-backup.example.com",
      "type": "A",
      "value": "192.168.1.2",
      "ttl": 60,
      "risk": {
        "score": 95,
        "level": "critical",
        "factors": {
          "lastSeenDays": 180,
          "hasSuspiciousPattern": true,
          "ttlScore": 30,
          "recordTypeRisk": 5,
          "domainDepth": 5
        },
        "recommendations": [
          "Record unused for 180 days. Consider removal if no longer needed.",
          "Domain name contains suspicious pattern. Verify if this is a temporary or test record.",
          "Very short TTL (60s) detected. Consider increasing TTL if record is stable.",
          "CRITICAL: This record should be reviewed immediately."
        ]
      }
    }
  ],
  "metadata": {
    "analyzedAt": "2025-07-13T10:30:00Z",
    "version": "1.0.0",
    "options": {
      "level": "medium",
      "checkDns": true
    }
  }
}
```

### エラー処理

コマンドは以下の終了コードを返します：

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | 一般的なエラー（ファイルが見つからない、パースエラーなど） |
| 2 | 無効なオプションまたは引数 |

エラー例：

```bash
# ファイルが存在しない場合
$ dnsweeper analyze nonexistent.csv
❌ Analysis failed
File not found: /path/to/nonexistent.csv

# 無効な形式指定
$ dnsweeper analyze records.csv --format invalid
❌ Invalid format: invalid
Supported formats: cloudflare, route53, generic, auto
```

---

## その他のコマンド

### list（未実装）

登録されているDNSレコードを一覧表示します。

```bash
dnsweeper list [options]
```

### add（未実装）

新しいDNSレコードを追加します。

```bash
dnsweeper add <domain> <type> <value> [options]
```

### delete（未実装）

既存のDNSレコードを削除します。

```bash
dnsweeper delete <record-id> [options]
```

---

## 設定ファイル

DNSweeperは`.dnsweeper.json`設定ファイルをサポートします：

```json
{
  "defaultFormat": "cloudflare",
  "riskThresholds": {
    "low": 25,
    "medium": 50,
    "high": 75
  },
  "dnsResolver": {
    "timeout": 3000,
    "retries": 3
  }
}
```

設定ファイルは以下の順序で検索されます：
1. 現在のディレクトリ
2. ホームディレクトリ
3. グローバル設定ディレクトリ

---

## 環境変数

以下の環境変数がサポートされています：

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `DNSWEEPER_FORMAT` | デフォルトのCSV形式 | `auto` |
| `DNSWEEPER_DNS_TIMEOUT` | DNS解決のタイムアウト（ミリ秒） | `5000` |
| `DNSWEEPER_LOG_LEVEL` | ログレベル（debug/info/warn/error） | `info` |
| `NO_COLOR` | 色付き出力を無効化 | - |