# DNSweeper アーキテクチャドキュメント

## 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ設計原則](#アーキテクチャ設計原則)
3. [システム構成](#システム構成)
4. [モジュール構成](#モジュール構成)
5. [データフロー](#データフロー)
6. [技術スタック](#技術スタック)
7. [拡張性と将来の展望](#拡張性と将来の展望)

---

## システム概要

DNSweeperは、大規模なDNSレコードの管理とリスク分析を支援するCLIツールです。モジュラーアーキテクチャを採用し、将来的なWeb UI統合を見据えた設計となっています。

### 主要コンポーネント

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Interface                        │
│                    (Commander.js based)                      │
├─────────────────┬───────────────────┬──────────────────────┤
│   Import CMD    │   Analyze CMD     │    Future CMDs       │
├─────────────────┴───────────────────┴──────────────────────┤
│                      Core Libraries                          │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ DNSResolver  │ CSVProcessor │RiskCalculator│    Logger     │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                     Node.js Runtime                          │
└─────────────────────────────────────────────────────────────┘
```

---

## アーキテクチャ設計原則

### 1. モジュラー設計
- 各機能を独立したモジュールとして実装
- 疎結合な設計により、個別のテストとメンテナンスが容易
- インターフェースを通じた明確な契約

### 2. 型安全性
- TypeScriptによる完全な型定義
- Strict modeとexactOptionalPropertyTypesの有効化
- 実行時エラーの最小化

### 3. 非同期優先
- すべてのI/O操作は非同期で実装
- Promise/async-awaitパターンの一貫した使用
- 並列処理による高速化

### 4. エラーハンドリング
- 予測可能なエラー処理
- ユーザーフレンドリーなエラーメッセージ
- 適切なエラーコードとログ

### 5. 拡張性
- プラグイン可能なアーキテクチャ
- 新しいCSV形式やDNSプロバイダーの追加が容易
- Web UI統合を前提とした設計

---

## システム構成

### ディレクトリ構造

```
dnsweeper/
├── src/
│   ├── index.ts           # エントリーポイント
│   ├── commands/          # CLIコマンド実装
│   │   ├── import.ts      # インポートコマンド
│   │   ├── analyze.ts     # 分析コマンド
│   │   ├── list.ts        # 一覧表示コマンド
│   │   ├── add.ts         # 追加コマンド
│   │   └── delete.ts      # 削除コマンド
│   ├── lib/               # コアライブラリ
│   │   ├── dns-resolver.ts    # DNS解決機能
│   │   ├── csv-processor.ts   # CSV処理機能
│   │   ├── risk-calculator.ts # リスク計算機能
│   │   └── logger.ts          # ロギング機能
│   ├── types/             # TypeScript型定義
│   │   └── index.ts       # 共通型定義
│   └── utils/             # ユーティリティ関数
│       └── index.ts
├── tests/                 # テストファイル
│   ├── unit/             # ユニットテスト
│   ├── integration/      # 統合テスト
│   └── fixtures/         # テストデータ
├── docs/                  # ドキュメント
│   ├── api/              # API仕様書
│   ├── examples/         # 使用例
│   └── architecture.md   # このファイル
└── dist/                  # ビルド成果物
```

### レイヤーアーキテクチャ

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│         (CLI Commands)                  │
├─────────────────────────────────────────┤
│          Business Logic Layer           │
│   (RiskCalculator, Validators)         │
├─────────────────────────────────────────┤
│           Service Layer                 │
│  (DNSResolver, CSVProcessor)           │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│      (File I/O, Network I/O)           │
└─────────────────────────────────────────┘
```

---

## モジュール構成

### 1. CLI Commands (`src/commands/`)

各コマンドは独立したモジュールとして実装され、Commander.jsのCommandオブジェクトを返します。

```typescript
// コマンドインターフェース
interface ICommand {
  createCommand(): Command;
}
```

#### 責務
- コマンドライン引数の解析
- ユーザー入力の検証
- ビジネスロジックの呼び出し
- 結果の表示

### 2. DNSResolver (`src/lib/dns-resolver.ts`)

DNS解決機能を抽象化し、統一されたインターフェースを提供します。

```typescript
class DNSResolver {
  // 単一ドメインの解決
  async resolve(domain: string, type: DNSRecordType): Promise<IDNSResponse>
  
  // バッチ解決（並列処理）
  async resolveBatch(requests: IDNSRequest[]): Promise<IDNSResponse[]>
}
```

#### 特徴
- Node.js標準`dns`モジュールのラッパー
- タイムアウト制御
- リトライロジック
- 並列処理によるバッチ解決

### 3. CSVProcessor (`src/lib/csv-processor.ts`)

複数のCSV形式をサポートし、統一されたデータモデルに変換します。

```typescript
class CSVProcessor {
  // 自動形式検出
  async parseAuto(filePath: string): Promise<ICSVParseResult>
  
  // 形式別パーサー
  async parseCloudflare(filePath: string): Promise<ICSVParseResult>
  async parseRoute53(filePath: string): Promise<ICSVParseResult>
  async parseGeneric(filePath: string): Promise<ICSVParseResult>
  
  // ストリーミング処理
  parseStream(filePath: string, onRecord: Function): Promise<void>
}
```

#### サポート形式
- **Cloudflare**: エクスポート形式
- **Route53**: AWS形式
- **Generic**: 最小限のフィールド

### 4. RiskCalculator (`src/lib/risk-calculator.ts`)

多要因リスク分析アルゴリズムを実装します。

```typescript
class RiskCalculator {
  // 単一レコードのリスク計算
  calculateRisk(record: IDNSRecord, lastSeen?: Date): IRiskScore
  
  // バッチ計算
  calculateBatchRisk(records: IDNSRecord[]): Map<string, IRiskScore>
  
  // サマリー生成
  getRiskSummary(records: IDNSRecord[]): IRiskSummary
}
```

#### リスク要因
1. 未使用期間（最大60点）
2. 命名パターン（最大30点）
3. TTL値（最大30点）
4. レコードタイプ（最大20点）
5. ドメイン階層（最大15点）

### 5. Logger (`src/lib/logger.ts`)

統一されたロギングとUI表示を提供します。

```typescript
class Logger {
  // 基本的なログメソッド
  info(message: string): void
  success(message: string): void
  warn(message: string): void
  error(message: string | Error): void
  
  // UI要素
  startSpinner(message: string): void
  stopSpinner(success: boolean, message?: string): void
  
  // 構造化出力
  json(data: any): void
}
```

---

## データフロー

### 1. Importコマンドフロー

```
User Input → Parse CLI Args → Read CSV File
                                    ↓
                            CSVProcessor.parse()
                                    ↓
                            Validate Records
                                    ↓
                    (Optional) DNSResolver.resolveBatch()
                                    ↓
                            Display Results
```

### 2. Analyzeコマンドフロー

```
User Input → Parse CLI Args → Read CSV File
                                    ↓
                            CSVProcessor.parse()
                                    ↓
                    (Optional) DNSResolver.resolveBatch()
                                    ↓
                        RiskCalculator.calculateBatch()
                                    ↓
                            Generate Report
                                    ↓
                        Output (Console/File/JSON)
```

### 3. データモデル変換

```
CSV Raw Data → ICSVRecord → IDNSRecord → IRiskScore
     ↑              ↑            ↑            ↑
  Parser      Validator    Transformer   Calculator
```

---

## 技術スタック

### コア技術

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Node.js | >=20.0.0 | ランタイム環境 |
| TypeScript | 5.5.x | 型安全な開発 |
| Commander.js | 11.x | CLIフレームワーク |
| Papaparse | 5.x | CSV解析 |

### 開発ツール

| ツール | 用途 |
|--------|------|
| ESLint | コード品質管理 |
| Prettier | コードフォーマット |
| Vitest | テストフレームワーク |
| tsx | TypeScript実行 |

### ビルドツール

| ツール | 用途 |
|--------|------|
| TypeScript Compiler | トランスパイル |
| npm scripts | タスク自動化 |

---

## 拡張性と将来の展望

### 1. プロバイダー抽象化

現在は汎用的なDNS解決のみですが、将来的にプロバイダー固有の実装を追加可能：

```typescript
interface IDNSProvider {
  name: string;
  resolve(domain: string, type: string): Promise<IDNSResponse>;
  create(record: IDNSRecord): Promise<void>;
  update(id: string, record: IDNSRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

// 実装例
class CloudflareProvider implements IDNSProvider { }
class Route53Provider implements IDNSProvider { }
```

### 2. Web UI統合

CLIコアライブラリは独立しているため、Web UIからの利用が容易：

```typescript
// Web APIサーバー例
app.post('/api/analyze', async (req, res) => {
  const processor = new CSVProcessor();
  const calculator = new RiskCalculator();
  
  const records = await processor.parse(req.file);
  const risks = calculator.calculateBatchRisk(records);
  
  res.json({ risks });
});
```

### 3. プラグインシステム

将来的なプラグインアーキテクチャ：

```typescript
interface IPlugin {
  name: string;
  version: string;
  
  // フック
  beforeParse?(data: any): void;
  afterParse?(records: IDNSRecord[]): void;
  beforeAnalyze?(records: IDNSRecord[]): void;
  afterAnalyze?(results: IRiskScore[]): void;
}

class PluginManager {
  register(plugin: IPlugin): void;
  execute(hook: string, data: any): void;
}
```

### 4. データベース統合

現在はメモリ内処理のみですが、将来的にDB統合が可能：

```typescript
interface IDataStore {
  saveRecords(records: IDNSRecord[]): Promise<void>;
  getRecords(filter?: IRecordFilter): Promise<IDNSRecord[]>;
  saveAnalysis(analysis: IAnalysisResult): Promise<void>;
  getAnalysisHistory(): Promise<IAnalysisResult[]>;
}

// 実装例
class PostgresDataStore implements IDataStore { }
class MongoDataStore implements IDataStore { }
```

### 5. リアルタイム監視

継続的なDNS監視機能の追加：

```typescript
class DNSMonitor {
  // 定期的な監視
  startMonitoring(records: IDNSRecord[], interval: number): void;
  
  // 変更検知
  onRecordChanged(callback: (change: IRecordChange) => void): void;
  
  // アラート
  onRiskThresholdExceeded(callback: (alert: IRiskAlert) => void): void;
}
```

---

## パフォーマンス考慮事項

### 1. 並列処理

DNS解決は並列実行により高速化：

```typescript
// 並列度の制御
const BATCH_SIZE = 10;
const results = await Promise.all(
  chunk(domains, BATCH_SIZE).map(batch => 
    resolver.resolveBatch(batch)
  )
);
```

### 2. ストリーミング処理

大容量CSVファイルはストリーミングで処理：

```typescript
// メモリ効率的な処理
await processor.parseStream(filePath, async (record) => {
  // 1レコードずつ処理
  await processRecord(record);
});
```

### 3. キャッシング

DNS解決結果のキャッシング（将来実装）：

```typescript
class CachedDNSResolver extends DNSResolver {
  private cache = new Map<string, ICacheEntry>();
  
  async resolve(domain: string, type: string): Promise<IDNSResponse> {
    const cacheKey = `${domain}:${type}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.value;
    }
    
    const result = await super.resolve(domain, type);
    this.cache.set(cacheKey, { value: result, expires: Date.now() + TTL });
    return result;
  }
}
```

---

## セキュリティ考慮事項

### 1. 入力検証

すべての入力は厳密に検証：

```typescript
// ドメイン名検証
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;

// ファイルパス検証
const sanitizePath = (path: string): string => {
  return path.replace(/[^a-zA-Z0-9-_./]/g, '');
};
```

### 2. 情報漏洩防止

- ログにセンシティブ情報を含めない
- エラーメッセージに内部構造を露出しない
- DNS解決結果のフィルタリング

### 3. リソース制限

- ファイルサイズ制限
- 並列処理数の制限
- タイムアウト設定

---

## まとめ

DNSweeperは、モジュラーで拡張可能なアーキテクチャを採用し、将来の機能拡張やWeb UI統合を見据えた設計となっています。型安全性、非同期処理、エラーハンドリングを重視し、エンタープライズグレードの信頼性を提供します。