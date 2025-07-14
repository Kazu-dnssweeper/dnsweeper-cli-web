# 変更履歴

このプロジェクトのすべての注目すべき変更は、このファイルに記録されます。

フォーマットは[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に基づいており、
このプロジェクトは[セマンティックバージョニング](https://semver.org/lang/ja/)に準拠しています。

## [Unreleased]

### 追加
- 基本的なCLI構造の実装
- CSV処理機能（Cloudflare、Route53、汎用形式対応）
- リスク分析エンジンの実装
- 並列DNS検証機能
- 多様な出力形式（JSON、CSV、テーブル、テキスト）
- Web UIベータ版
- 包括的なテストスイート
- TypeDocによるAPIドキュメント生成
- 詳細な使用例集とコントリビューションガイド

### 変更
- TypeScript strictモードの有効化
- ESLint/Prettier設定の最適化
- ファイル構造のリファクタリング（大きなファイルの分割）

### 修正
- TypeScriptビルドエラーの解決
- テストのタイムアウト問題の修正
- Windows環境でのパス処理問題の解決

## [1.0.0] - 2025-07-14

### 追加
- 初回リリース
- 基本的なDNSレコード管理機能
  - list: レコード一覧表示
  - add: レコード追加
  - delete: レコード削除
  - import: CSV一括インポート
  - analyze: リスク分析
- DNS検証コマンド
  - lookup: 単一ドメインの検証
  - sweep: 一括DNS検証
  - validate: 設定妥当性チェック
- 高度な機能
  - 並列処理による高速化
  - ストリーミングCSV処理
  - 文字エンコーディング自動検出
  - CNAME連鎖追跡
  - IPv6サポート
- 開発環境
  - TypeScript 5.5
  - Vitest テストランナー
  - GitHub Actions CI/CD
  - VSCode統合

[Unreleased]: https://github.com/YourUsername/dnsweeper/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YourUsername/dnsweeper/releases/tag/v1.0.0