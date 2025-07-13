# DNSweeper

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)

DNSレコードのリスク分析とクリーンアップを支援するCLIツール

## 📋 概要

DNSweeperは、大規模なDNSゾーンファイルやCSVファイルから未使用・リスクのあるDNSレコードを検出し、クリーンアップを支援するコマンドラインツールです。

### 主な機能

- **CSVインポート**: Cloudflare、Route53、汎用フォーマットのCSVファイルに対応
- **リスク分析**: 未使用期間、命名パターン、TTL値などに基づく多角的なリスク評価
- **DNS検証**: 実際のDNS解決を行い、レコードの存在を確認
- **詳細レポート**: JSON/テキスト形式での分析結果出力

## 🚀 インストール

### 前提条件

- Node.js v20.0.0以上
- npm v10.0.0以上

### グローバルインストール

```bash
npm install -g dnsweeper
```

### ローカル開発

```bash
git clone https://github.com/your-username/dnsweeper.git
cd dnsweeper
npm install
npm run build
```

## 📖 使用方法

### 基本的な使用方法

```bash
# CSVファイルをインポート
dnsweeper import dns-records.csv

# DNS検証付きでインポート
dnsweeper import dns-records.csv --resolve

# リスク分析を実行
dnsweeper analyze dns-records.csv

# JSON形式でレポート出力
dnsweeper analyze dns-records.csv --json --output report.json
```

### コマンド一覧

#### `import` - CSVファイルのインポート

```bash
dnsweeper import <file> [options]
```

オプション:
- `-f, --format <format>` - CSV形式を指定 (cloudflare/route53/generic/auto)
- `-r, --resolve` - インポート後にDNS解決を実行
- `-s, --streaming` - 大容量ファイル用ストリーミング処理
- `-v, --verbose` - 詳細な出力を表示

#### `analyze` - リスク分析

```bash
dnsweeper analyze <file> [options]
```

オプション:
- `-f, --format <format>` - CSV形式を指定
- `-l, --level <level>` - 報告する最小リスクレベル (low/medium/high/critical)
- `-c, --check-dns` - 各レコードの現在のDNSステータスを確認
- `-o, --output <file>` - レポートをファイルに保存
- `-j, --json` - JSON形式で出力
- `-q, --quiet` - エラー以外の出力を抑制

### CSV形式

#### Cloudflare形式
```csv
domain,record_type,value,ttl,priority
example.com,A,192.168.1.1,3600,
mail.example.com,MX,mail-server.example.com,3600,10
```

#### Route53形式
```csv
Name,Type,Value,TTL,SetIdentifier
example.com,A,192.168.1.1,3600,
example.com,MX,10 mail.example.com,3600,
```

#### 汎用形式
```csv
domain,type,value,ttl
example.com,A,192.168.1.1,3600
www.example.com,CNAME,example.com,3600
```

## 🔍 リスク分析の仕組み

DNSweeperは以下の要因を組み合わせてリスクスコアを算出します：

1. **未使用期間** (最大60点)
   - 30日以上: 10点
   - 90日以上: 30点
   - 180日以上: 60点

2. **命名パターン** (最大30点)
   - temp-, test-, old-, backup-などの疑わしいパターンを検出

3. **TTL値** (最大30点)
   - 300秒未満: 30点（非常に短い）
   - 3600秒未満: 20点（短い）
   - 86400秒未満: 10点（やや短い）

4. **レコードタイプ** (最大20点)
   - SRV/TXT: 高リスク
   - CNAME: 中リスク
   - A/AAAA/MX: 低リスク

5. **ドメイン階層** (最大15点)
   - 深いサブドメインはリスクが高い

### リスクレベル

- 🟢 **Low** (0-25): 通常のレコード
- 🟡 **Medium** (26-50): 注意が必要
- 🟠 **High** (51-75): 早急な対応を推奨
- 🔴 **Critical** (76-100): 即座の対応が必要

## 📝 出力例

### テキスト形式

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
   - Domain name contains suspicious pattern. Verify if this is a temporary record.
   - Very short TTL (60s) detected. Consider increasing TTL if record is stable.
```

### JSON形式

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
          "Domain name contains suspicious pattern.",
          "Very short TTL (60s) detected."
        ]
      }
    }
  ]
}
```

## 🛠️ 開発

### セットアップ

```bash
# 依存関係をインストール
npm install

# TypeScriptをビルド
npm run build

# 開発モードで実行
npm run dev

# テストを実行
npm test

# リントを実行
npm run lint
```

### プロジェクト構造

```
dnsweeper/
├── src/
│   ├── commands/      # CLIコマンド実装
│   ├── lib/           # コアライブラリ
│   ├── types/         # TypeScript型定義
│   └── index.ts       # エントリーポイント
├── tests/             # テストファイル
├── docs/              # ドキュメント
└── package.json
```

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更を行う場合は、まずissueを作成して変更内容について議論してください。

1. プロジェクトをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [Commander.js](https://github.com/tj/commander.js/) - CLIフレームワーク
- [Papaparse](https://www.papaparse.com/) - CSV解析ライブラリ
- [Chalk](https://github.com/chalk/chalk) - ターミナル文字装飾
- [Ora](https://github.com/sindresorhus/ora) - エレガントなターミナルスピナー