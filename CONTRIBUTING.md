# DNSweeperへの貢献ガイド

DNSweeperへの貢献を検討いただき、ありがとうございます！このガイドでは、プロジェクトへの貢献方法について説明します。

## 目次

- [行動規範](#行動規範)
- [貢献の方法](#貢献の方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [コミットメッセージ](#コミットメッセージ)
- [プルリクエスト](#プルリクエスト)
- [テスト](#テスト)
- [ドキュメント](#ドキュメント)

## 行動規範

このプロジェクトは[行動規範](CODE_OF_CONDUCT.md)を採用しています。プロジェクトに参加することで、この規範を遵守することに同意したものとみなされます。

## 貢献の方法

### バグ報告

バグを発見した場合：

1. [既存のIssue](https://github.com/YourUsername/dnsweeper/issues)を確認して、同じ問題が報告されていないか確認してください
2. 新しいIssueを作成し、以下の情報を含めてください：
   - 問題の明確な説明
   - 再現手順
   - 期待される動作
   - 実際の動作
   - 環境情報（OS、Node.jsバージョン、DNSweeperバージョン）
   - 可能であれば、エラーログやスクリーンショット

### 機能提案

新機能を提案する場合：

1. [既存のIssue](https://github.com/YourUsername/dnsweeper/issues)を確認してください
2. 新しいIssueを作成し、以下を含めてください：
   - 機能の詳細な説明
   - なぜこの機能が必要か
   - 想定される使用例
   - 実装のアイデア（あれば）

### コードの貢献

1. リポジトリをフォークする
2. フィーチャーブランチを作成する（`git checkout -b feature/amazing-feature`）
3. 変更をコミットする（[コミットメッセージ規約](#コミットメッセージ)に従う）
4. ブランチにプッシュする（`git push origin feature/amazing-feature`）
5. プルリクエストを作成する

## 開発環境のセットアップ

### 必要条件

- Node.js 20.0.0以上
- npm 9.0.0以上
- Git

### セットアップ手順

```bash
# リポジトリのクローン
git clone https://github.com/YourUsername/dnsweeper.git
cd dnsweeper

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 推奨される開発ツール

- **VSCode**: 推奨される拡張機能は`.vscode/extensions.json`に記載
- **ESLint**: コード品質の確保
- **Prettier**: コードフォーマット
- **TypeScript**: 型安全性

## 開発ワークフロー

### ブランチ戦略

- `main`: 安定版リリース
- `develop`: 開発ブランチ
- `feature/*`: 新機能開発
- `fix/*`: バグ修正
- `docs/*`: ドキュメント更新
- `refactor/*`: リファクタリング

### 開発フロー

1. **Issue作成**: 作業を開始する前に、Issueを作成または既存のIssueを確認
2. **ブランチ作成**: `develop`から新しいブランチを作成
3. **開発**: 機能実装またはバグ修正
4. **テスト**: ユニットテストと統合テストを実行
5. **ドキュメント**: 必要に応じてドキュメントを更新
6. **プルリクエスト**: `develop`へのPRを作成

## コーディング規約

### TypeScript

```typescript
// ✅ 良い例
export interface DNSRecord {
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
}

export function validateDNSRecord(record: DNSRecord): boolean {
  if (!record.name || !record.type || !record.value) {
    return false;
  }
  return true;
}

// ❌ 悪い例
export interface dns_record {
  Name: string;
  Type: any;
  Value: string;
  TTL: number;
}

export function validate(r: any) {
  return r.Name && r.Type && r.Value;
}
```

### 命名規則

- **ファイル名**: kebab-case（例: `dns-resolver.ts`）
- **クラス名**: PascalCase（例: `DNSResolver`）
- **関数名**: camelCase（例: `resolveDNS`）
- **定数**: UPPER_SNAKE_CASE（例: `DEFAULT_TIMEOUT`）
- **インターフェース**: PascalCase with 'I' prefix（例: `IDNSRecord`）

### ファイル構造

```
src/
├── commands/      # CLIコマンド
├── lib/          # コアライブラリ
├── utils/        # ユーティリティ関数
├── types/        # 型定義
└── index.ts      # エントリーポイント
```

### エラーハンドリング

```typescript
// カスタムエラークラスを使用
try {
  const result = await dnsResolver.resolve(domain);
  return result;
} catch (error) {
  if (error instanceof DnsResolutionError) {
    logger.error('DNS resolution failed', { domain, error });
    throw error;
  }
  // 予期しないエラーは再スロー
  throw new DnsSweeperError('Unexpected error during DNS resolution', {
    originalError: error
  });
}
```

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/)規約に従います：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### タイプ

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

### 例

```
feat(csv): Cloudflare CSV形式の自動検出機能を追加

- CSVヘッダーを分析して形式を自動判別
- proxiedフィールドの存在でCloudflare形式を識別
- 検出精度95%以上を達成

Closes #123
```

## プルリクエスト

### PRテンプレート

```markdown
## 概要
このPRの目的と変更内容を簡潔に説明してください。

## 変更内容
- [ ] 機能追加
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント更新
- [ ] その他

## 詳細
変更の詳細を記載してください。

## テスト
- [ ] ユニットテストを追加/更新
- [ ] 統合テストを追加/更新
- [ ] 手動テストを実施

## チェックリスト
- [ ] コードがプロジェクトのスタイルガイドに従っている
- [ ] セルフレビューを実施した
- [ ] コメントを追加した（特に複雑な部分）
- [ ] ドキュメントを更新した
- [ ] 変更によって既存機能が壊れていない
- [ ] 依存関係の更新が必要な場合は対応した
```

### レビュープロセス

1. **自動チェック**: CI/CDによる自動テスト・リンティング
2. **コードレビュー**: 最低1名のメンテナーによるレビュー
3. **フィードバック対応**: レビューコメントへの対応
4. **承認**: レビューが完了したらマージ

## テスト

### ユニットテスト

```bash
# 全てのテストを実行
npm test

# 特定のファイルのみテスト
npm test -- dns-resolver.test.ts

# カバレッジレポート付きで実行
npm run test:coverage

# ウォッチモードで実行
npm run test:watch
```

### テストの書き方

```typescript
import { describe, it, expect, vi } from 'vitest';
import { DNSResolver } from '../src/lib/dns-resolver';

describe('DNSResolver', () => {
  it('should resolve A records', async () => {
    const resolver = new DNSResolver();
    const result = await resolver.resolveA('example.com');
    
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  });

  it('should handle DNS resolution errors', async () => {
    const resolver = new DNSResolver();
    
    await expect(
      resolver.resolveA('non-existent-domain-12345.com')
    ).rejects.toThrow(DnsResolutionError);
  });
});
```

## ドキュメント

### APIドキュメント

```bash
# TypeDocでAPIドキュメントを生成
npm run docs

# ウォッチモードで生成
npm run docs:watch
```

### JSDocコメント

```typescript
/**
 * DNS レコードを解決する
 * 
 * @param domain - 解決するドメイン名
 * @param options - 解決オプション
 * @returns 解決されたDNSレコードの配列
 * @throws {DnsResolutionError} DNS解決に失敗した場合
 * 
 * @example
 * ```typescript
 * const resolver = new DNSResolver();
 * const records = await resolver.resolve('example.com', {
 *   type: 'A',
 *   timeout: 5000
 * });
 * ```
 */
export async function resolveDNS(
  domain: string,
  options?: ResolveOptions
): Promise<DNSRecord[]> {
  // 実装
}
```

## 質問とサポート

- **Discord**: [参加リンク](https://discord.gg/dnsweeper)
- **GitHub Discussions**: [ディスカッション](https://github.com/YourUsername/dnsweeper/discussions)
- **メール**: support@dnsweeper.dev

## ライセンス

貢献いただいたコードは、プロジェクトと同じ[MITライセンス](LICENSE)の下でライセンスされます。

---

ご協力ありがとうございます！ 🎉