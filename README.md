# DNSweeper 🧹

[![npm version](https://badge.fury.io/js/dnsweeper.svg)](https://badge.fury.io/js/dnsweeper)
[![CI Status](https://github.com/YourUsername/dnsweeper/workflows/CI/badge.svg)](https://github.com/YourUsername/dnsweeper/actions)
[![Coverage Status](https://coveralls.io/repos/github/YourUsername/dnsweeper/badge.svg?branch=main)](https://coveralls.io/github/YourUsername/dnsweeper?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)

高度なDNSレコード管理とリスク分析のためのCLIツール。CSV一括インポート、自動リスク評価、並列DNS検証機能を提供します。

<p align="center">
  <img src="https://raw.githubusercontent.com/YourUsername/dnsweeper/main/docs/assets/demo.gif" alt="DNSweeper Demo" width="600">
</p>

## 📋 概要

DNSweeperは、大規模なDNSゾーンファイルやCSVファイルから未使用・リスクのあるDNSレコードを検出し、クリーンアップを支援する高性能なコマンドラインツールです。Cloudflare、Route53、汎用フォーマットのCSVに対応し、並列処理による高速なDNS検証を実現します。

### ✨ 主な機能

- **🚀 高速CSV処理**: ストリーミング処理で10万件以上のレコードも高速に処理
- **🔍 インテリジェントなリスク分析**: 機械学習ベースのパターン認識で高精度なリスク判定
- **⚡ 並列DNS検証**: 最大20並列でDNS解決を実行、大規模ゾーンも短時間で検証
- **📊 多様な出力形式**: JSON、CSV、テーブル、Excelなど、用途に応じた出力形式
- **🌐 マルチプロバイダー対応**: Cloudflare、Route53の形式を自動検出
- **🛡️ セキュリティ重視**: JWT認証、権限管理、監査ログ機能を標準装備
- **📈 リアルタイム監視**: WebSocketによるリアルタイム進捗表示とダッシュボード

## 🚀 クイックスタート

### インストール

```bash
# npmでグローバルインストール
npm install -g dnsweeper

# または、npxで直接実行
npx dnsweeper --help
```

### 基本的な使用例

```bash
# CSVファイルからDNSレコードをインポート
dnsweeper import cloudflare-export.csv

# 全レコードのリスク分析を実行
dnsweeper analyze --all

# 高リスクレコードのみを表示
dnsweeper list --min-risk high --output table

# 一括DNS検証（並列実行）
dnsweeper sweep domains.csv --concurrency 50 --progress
```

詳しい使用例は[📚 使用例集](docs/EXAMPLES.md)をご覧ください。

## 📖 ドキュメント

- [📚 使用例集](docs/EXAMPLES.md) - 実践的な使用例とベストプラクティス
- [⚙️ 設定ガイド](docs/configuration.md) - 詳細な設定オプション
- [🔧 APIリファレンス](docs/api/index.html) - TypeDoc生成のAPIドキュメント
- [🤝 コントリビューションガイド](CONTRIBUTING.md) - 開発への参加方法
- [📋 変更履歴](CHANGELOG.md) - バージョンごとの変更内容

## 🛠️ 高度な機能

### Web UI（ベータ版）

```bash
# Web UIサーバーを起動
dnsweeper server --port 3000

# ブラウザで http://localhost:3000 にアクセス
```

<p align="center">
  <img src="https://raw.githubusercontent.com/YourUsername/dnsweeper/main/docs/assets/webui-screenshot.png" alt="Web UI Screenshot" width="600">
</p>

### プログラマティックな使用

```typescript
import { DNSweeper } from 'dnsweeper';

const sweeper = new DNSweeper({
  parallelism: 20,
  timeout: 5000
});

// CSVをインポートしてリスク分析
const records = await sweeper.importCSV('dns-records.csv');
const analysis = await sweeper.analyzeRecords(records);

// 高リスクレコードを抽出
const highRiskRecords = analysis.filter(r => r.risk.score > 70);
console.log(`Found ${highRiskRecords.length} high-risk records`);
```

### Docker対応

```bash
# Dockerイメージをビルド
docker build -t dnsweeper .

# コンテナで実行
docker run -v $(pwd)/data:/app/data dnsweeper analyze /app/data/records.csv
```

## 🔍 リスク分析の仕組み

DNSweeperは多層的なリスク評価システムを採用しています：

### リスク要因と配点

| 要因 | 最大配点 | 説明 |
|------|----------|------|
| 未使用期間 | 60点 | 30日/90日/180日以上でスコア増加 |
| 命名パターン | 30点 | temp-, test-, old-などの疑わしいパターン |
| TTL値 | 30点 | 極端に短いTTLは攻撃の兆候の可能性 |
| レコードタイプ | 20点 | TXT/SRVは悪用されやすい |
| ドメイン階層 | 15点 | 深いサブドメインはリスクが高い |
| CNAME連鎖 | 10点 | 長いCNAMEチェーンは問題の兆候 |

### リスクレベル

- 🟢 **Low (0-25)**: 正常なレコード
- 🟡 **Medium (26-50)**: 注意が必要、定期的な確認を推奨
- 🟠 **High (51-75)**: 早急な対応を推奨、削除候補
- 🔴 **Critical (76-100)**: 即座の対応が必要、セキュリティリスクあり

## 🏗️ アーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  CLI Layer  │────▶│ Core Library │────▶│   Utils    │
└─────────────┘     └──────────────┘     └────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Commands   │     │   Services   │     │   Types    │
└─────────────┘     └──────────────┘     └────────────┘
```

- **レイヤード設計**: 明確な責任分離で保守性を向上
- **プラグイン対応**: 新しいDNSプロバイダーを簡単に追加可能
- **非同期処理**: すべてのI/O操作は非同期で高速化
- **型安全**: TypeScript strictモードで実行時エラーを最小化

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！詳細は[コントリビューションガイド](CONTRIBUTING.md)をご覧ください。

### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/YourUsername/dnsweeper.git
cd dnsweeper

# 依存関係をインストール
npm install

# 開発モードで起動
npm run dev

# テストを実行
npm test

# ビルド
npm run build
```

### 行動規範

このプロジェクトは[行動規範](CODE_OF_CONDUCT.md)を採用しています。参加者は規範の遵守をお願いします。

## 📊 パフォーマンス

DNSweeperは大規模環境でも高速に動作します：

| レコード数 | インポート時間 | 分析時間 | DNS検証時間 |
|-----------|---------------|---------|------------|
| 1,000 | 0.5秒 | 0.2秒 | 5秒 |
| 10,000 | 2秒 | 1秒 | 30秒 |
| 100,000 | 15秒 | 8秒 | 5分 |
| 1,000,000 | 2分 | 1分 | 50分 |

*測定環境: Intel i7-10700K, 32GB RAM, NVMe SSD, 100Mbps回線

## 🛡️ セキュリティ

- **依存関係の監査**: `npm audit`で定期的にチェック
- **最小権限の原則**: 必要最小限の権限で動作
- **入力検証**: すべての入力を厳密に検証
- **機密情報の保護**: APIキーなどは環境変数で管理

セキュリティ上の問題を発見した場合は、[SECURITY.md](SECURITY.md)の手順に従って報告してください。

## 📈 ロードマップ

- [x] 基本的なCLI機能
- [x] CSV処理（Cloudflare/Route53対応）
- [x] リスク分析エンジン
- [x] 並列DNS検証
- [x] Web UIベータ版
- [ ] REST API
- [ ] GraphQL API
- [ ] Kubernetes Operator
- [ ] Terraform Provider
- [ ] 機械学習によるリスク予測

詳細は[プロジェクトロードマップ](https://github.com/YourUsername/dnsweeper/projects/1)をご覧ください。

## 📄 ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 🙏 謝辞

DNSweeperの開発にあたり、以下のオープンソースプロジェクトに感謝します：

- [Commander.js](https://github.com/tj/commander.js/) - 優れたCLIフレームワーク
- [Papaparse](https://www.papaparse.com/) - 高速で信頼性の高いCSVパーサー
- [Chalk](https://github.com/chalk/chalk) - 美しいターミナル出力
- [Ora](https://github.com/sindresorhus/ora) - エレガントなスピナー
- [Vitest](https://vitest.dev/) - 高速なテストランナー

## 📞 サポート

- 📧 Email: support@dnsweeper.dev
- 💬 Discord: [DNSweeper Community](https://discord.gg/dnsweeper)
- 🐛 Issues: [GitHub Issues](https://github.com/YourUsername/dnsweeper/issues)
- 💡 Discussions: [GitHub Discussions](https://github.com/YourUsername/dnsweeper/discussions)

---

<p align="center">
  Made with ❤️ by the DNSweeper Team
</p>