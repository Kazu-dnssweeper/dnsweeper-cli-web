# DNSweeper 設定ガイド

DNSweeperは、設定ファイルと環境変数を使用して動作をカスタマイズできます。

## 設定ファイル

DNSweeperは以下の順序で設定ファイルを検索します：

1. コマンドラインで指定されたパス（`--config`オプション）
2. 現在のディレクトリから上位ディレクトリに向かって検索
   - `.dnsweeper.json`
   - `.dnsweeperrc`
   - `dnsweeper.config.json`
3. ホームディレクトリ（`~/.dnsweeper.json`など）

### 設定ファイルの例

```json
{
  "dns": {
    "timeout": 5000,
    "retries": 3,
    "servers": ["8.8.8.8", "1.1.1.1"],
    "concurrent": 10
  },
  "csv": {
    "encoding": "utf8",
    "delimiter": ",",
    "quote": "\"",
    "skipEmptyLines": true,
    "maxRows": 1000000
  },
  "risk": {
    "weights": {
      "unusedDays": 0.4,
      "namingPattern": 0.3,
      "ttl": 0.3
    },
    "thresholds": {
      "high": 70,
      "medium": 40
    }
  },
  "output": {
    "format": "table",
    "colors": true,
    "verbose": false,
    "quiet": false
  },
  "api": {
    "cloudflare": {
      "apiKey": "your-api-key",
      "email": "your-email@example.com",
      "accountId": "your-account-id"
    },
    "route53": {
      "accessKeyId": "your-access-key",
      "secretAccessKey": "your-secret-key",
      "region": "us-east-1"
    }
  }
}
```

## 環境変数

環境変数は設定ファイルの値を上書きします。

### DNS設定

- `DNSWEEPER_DNS_TIMEOUT` - DNS解決タイムアウト（ミリ秒）
- `DNSWEEPER_DNS_SERVERS` - DNSサーバーのカンマ区切りリスト

### API認証情報

#### Cloudflare
- `CLOUDFLARE_API_KEY` - CloudflareのAPIキー
- `CLOUDFLARE_EMAIL` - Cloudflareアカウントのメールアドレス

#### AWS Route53
- `AWS_ACCESS_KEY_ID` - AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY` - AWSシークレットアクセスキー
- `AWS_REGION` - AWSリージョン（デフォルト: us-east-1）

### 出力設定

- `DNSWEEPER_OUTPUT_FORMAT` - 出力形式（json, csv, table）
- `NO_COLOR` または `DNSWEEPER_NO_COLOR` - カラー出力を無効化

## 設定項目の詳細

### DNS設定 (`dns`)

| 項目 | 型 | デフォルト | 説明 |
|------|-----|------------|------|
| `timeout` | number | 5000 | DNS解決のタイムアウト（ミリ秒） |
| `retries` | number | 3 | 失敗時のリトライ回数 |
| `servers` | string[] | システム設定 | 使用するDNSサーバーのリスト |
| `concurrent` | number | 10 | 並列実行数 |

### CSV設定 (`csv`)

| 項目 | 型 | デフォルト | 説明 |
|------|-----|------------|------|
| `encoding` | string | "utf8" | ファイルエンコーディング |
| `delimiter` | string | "," | フィールド区切り文字 |
| `quote` | string | "\"" | クォート文字 |
| `skipEmptyLines` | boolean | true | 空行をスキップするか |
| `maxRows` | number | 1000000 | 処理する最大行数 |

### リスク計算設定 (`risk`)

#### 重み設定 (`weights`)

各要素の重みは合計で1.0になる必要があります。

| 項目 | 型 | デフォルト | 説明 |
|------|-----|------------|------|
| `unusedDays` | number | 0.4 | 未使用期間の重み |
| `namingPattern` | number | 0.3 | 命名パターンの重み |
| `ttl` | number | 0.3 | TTL値の重み |

#### しきい値設定 (`thresholds`)

| 項目 | 型 | デフォルト | 説明 |
|------|-----|------------|------|
| `high` | number | 70 | 高リスクのしきい値（0-100） |
| `medium` | number | 40 | 中リスクのしきい値（0-100） |

### 出力設定 (`output`)

| 項目 | 型 | デフォルト | 説明 |
|------|-----|------------|------|
| `format` | string | "table" | 出力形式（json, csv, table） |
| `colors` | boolean | true | カラー出力を有効にするか |
| `verbose` | boolean | false | 詳細出力モード |
| `quiet` | boolean | false | 静音モード（エラーのみ出力） |

## 優先順位

設定の優先順位は以下の通りです（高い方が優先）：

1. コマンドライン引数
2. 環境変数
3. 設定ファイル
4. デフォルト値

## 使用例

### 設定ファイルを指定して実行

```bash
dnsweeper --config /path/to/config.json list
```

### 環境変数で認証情報を設定

```bash
export CLOUDFLARE_API_KEY="your-api-key"
export CLOUDFLARE_EMAIL="your-email@example.com"
dnsweeper import cloudflare --zone-id xyz123
```

### 出力形式をJSONに変更

```bash
DNSWEEPER_OUTPUT_FORMAT=json dnsweeper analyze suspicious-domains.csv
```

### カラー出力を無効化

```bash
NO_COLOR=1 dnsweeper list
```