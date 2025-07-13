# DNSweeper API仕様書

このドキュメントは、DNSweeperの主要コンポーネントのAPI仕様を記載しています。

## 目次

1. [DNSResolver](#dnsresolver)
2. [CSVProcessor](#csvprocessor)
3. [RiskCalculator](#riskcalculator)
4. [Logger](#logger)

---

## DNSResolver

DNS解決機能を提供するクラス。Node.jsの標準`dns`モジュールをラップし、統一されたインターフェースを提供します。

### インポート

```typescript
import { DNSResolver } from '@/lib/dns-resolver';
```

### コンストラクタ

```typescript
const resolver = new DNSResolver(options?: IDNSResolverOptions);
```

#### パラメータ

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|------------|------|
| options | `IDNSResolverOptions` | いいえ | `{}` | リゾルバの設定オプション |

#### IDNSResolverOptions

```typescript
interface IDNSResolverOptions {
  timeout?: number;      // タイムアウト時間（ミリ秒）、デフォルト: 5000
  servers?: string[];    // DNSサーバーのリスト
  retries?: number;      // リトライ回数、デフォルト: 3
}
```

### メソッド

#### resolve()

指定されたドメインとレコードタイプのDNS解決を実行します。

```typescript
async resolve(domain: string, type: DNSRecordType): Promise<IDNSResponse>
```

##### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| domain | `string` | はい | 解決するドメイン名 |
| type | `DNSRecordType` | はい | DNSレコードタイプ |

##### 戻り値

```typescript
interface IDNSResponse {
  status: 'success' | 'error';
  domain: string;
  type: DNSRecordType;
  records?: IDNSRecord[];
  error?: string;
  responseTime: number;
}
```

##### 使用例

```typescript
const resolver = new DNSResolver({ timeout: 3000 });

// Aレコードの解決
const result = await resolver.resolve('example.com', 'A');
if (result.status === 'success') {
  console.log('IPアドレス:', result.records);
}

// MXレコードの解決
const mxResult = await resolver.resolve('example.com', 'MX');
```

#### resolveBatch()

複数のドメインを並列で解決します。

```typescript
async resolveBatch(
  requests: Array<{ domain: string; type: DNSRecordType }>
): Promise<IDNSResponse[]>
```

##### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| requests | `Array<{domain, type}>` | はい | 解決リクエストの配列 |

##### 使用例

```typescript
const requests = [
  { domain: 'example.com', type: 'A' },
  { domain: 'example.com', type: 'MX' },
  { domain: 'subdomain.example.com', type: 'CNAME' }
];

const results = await resolver.resolveBatch(requests);
```

### サポートされるDNSレコードタイプ

```typescript
type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 
                     'NS' | 'SOA' | 'SRV' | 'PTR' | 'CAA';
```

---

## CSVProcessor

CSV形式のDNSレコードデータを解析・処理するクラス。

### インポート

```typescript
import { CSVProcessor } from '@/lib/csv-processor';
```

### コンストラクタ

```typescript
const processor = new CSVProcessor(options?: ICSVProcessorOptions);
```

#### ICSVProcessorOptions

```typescript
interface ICSVProcessorOptions {
  encoding?: string;      // ファイルエンコーディング、デフォルト: 'utf-8'
  delimiter?: string;     // CSVデリミタ、デフォルト: ','
  maxFileSize?: number;   // 最大ファイルサイズ（バイト）
}
```

### メソッド

#### parseAuto()

CSVファイルの形式を自動検出して解析します。

```typescript
async parseAuto(filePath: string): Promise<ICSVParseResult>
```

##### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| filePath | `string` | はい | CSVファイルのパス |

##### 戻り値

```typescript
interface ICSVParseResult {
  format: 'cloudflare' | 'route53' | 'generic' | 'unknown';
  records: ICSVRecord[];
  errors: ICSVParseError[];
  meta: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    detectedFormat: string;
  };
}
```

#### parseCloudflare()

Cloudflare形式のCSVファイルを解析します。

```typescript
async parseCloudflare(filePath: string): Promise<ICSVParseResult>
```

##### Cloudflare CSV形式

```csv
domain,record_type,value,ttl,priority
example.com,A,192.168.1.1,3600,
mail.example.com,MX,mail-server.example.com,3600,10
```

#### parseRoute53()

AWS Route53形式のCSVファイルを解析します。

```typescript
async parseRoute53(filePath: string): Promise<ICSVParseResult>
```

##### Route53 CSV形式

```csv
Name,Type,Value,TTL,SetIdentifier
example.com,A,192.168.1.1,3600,
example.com,MX,10 mail.example.com,3600,
```

#### parseGeneric()

汎用形式のCSVファイルを解析します。

```typescript
async parseGeneric(filePath: string): Promise<ICSVParseResult>
```

##### 汎用CSV形式

```csv
domain,type,value,ttl
example.com,A,192.168.1.1,3600
www.example.com,CNAME,example.com,3600
```

#### parseStream()

大容量ファイル用のストリーミング解析を実行します。

```typescript
parseStream(
  filePath: string,
  format: CSVFormat,
  onRecord: (record: ICSVRecord) => void | Promise<void>,
  onError?: (error: ICSVParseError) => void
): Promise<ICSVStreamResult>
```

##### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| filePath | `string` | はい | CSVファイルのパス |
| format | `CSVFormat` | はい | CSV形式 |
| onRecord | `Function` | はい | レコード処理コールバック |
| onError | `Function` | いいえ | エラー処理コールバック |

##### 使用例

```typescript
const processor = new CSVProcessor();

// ストリーミング処理
await processor.parseStream(
  'large-dns-records.csv',
  'cloudflare',
  async (record) => {
    // 各レコードを処理
    console.log(`処理中: ${record.domain}`);
  },
  (error) => {
    console.error('エラー:', error.message);
  }
);
```

---

## RiskCalculator

DNSレコードのリスクスコアを計算するクラス。

### インポート

```typescript
import { RiskCalculator } from '@/lib/risk-calculator';
```

### コンストラクタ

```typescript
const calculator = new RiskCalculator(config?: IRiskCalculatorConfig);
```

#### IRiskCalculatorConfig

```typescript
interface IRiskCalculatorConfig {
  weights?: {
    unusedTime?: number;      // 未使用期間の重み（0-1）
    namingPattern?: number;   // 命名パターンの重み（0-1）
    ttl?: number;            // TTL値の重み（0-1）
    recordType?: number;     // レコードタイプの重み（0-1）
    domainDepth?: number;    // ドメイン階層の重み（0-1）
  };
  thresholds?: {
    low?: number;            // 低リスクしきい値
    medium?: number;         // 中リスクしきい値
    high?: number;           // 高リスクしきい値
  };
}
```

### メソッド

#### calculateRisk()

単一のDNSレコードのリスクスコアを計算します。

```typescript
calculateRisk(
  record: IDNSRecord,
  lastSeenDate?: Date
): IRiskScore
```

##### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| record | `IDNSRecord` | はい | DNSレコード |
| lastSeenDate | `Date` | いいえ | 最後に確認された日時 |

##### 戻り値

```typescript
interface IRiskScore {
  total: number;           // 総合スコア（0-100）
  level: RiskLevel;        // リスクレベル
  factors: {
    lastSeenDays: number;
    hasSuspiciousPattern: boolean;
    ttlScore: number;
    recordTypeRisk: number;
    domainDepth: number;
  };
  recommendations: string[];
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
```

##### 使用例

```typescript
const calculator = new RiskCalculator();

const record = {
  id: '1',
  name: 'old-backup.example.com',
  type: 'A',
  value: '192.168.1.1',
  ttl: 60,
  created: new Date('2023-01-01'),
  updated: new Date('2023-01-01')
};

const risk = calculator.calculateRisk(record);
console.log(`リスクスコア: ${risk.total}/100`);
console.log(`リスクレベル: ${risk.level}`);
```

#### calculateBatchRisk()

複数のDNSレコードのリスクスコアを一括計算します。

```typescript
calculateBatchRisk(
  records: IDNSRecord[],
  lastSeenDates?: Map<string, Date>
): Map<string, IRiskScore>
```

##### パラメータ

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| records | `IDNSRecord[]` | はい | DNSレコードの配列 |
| lastSeenDates | `Map<string, Date>` | いいえ | ドメイン名と最終確認日のマップ |

#### getRiskSummary()

リスク分析の統計サマリーを生成します。

```typescript
getRiskSummary(
  records: IDNSRecord[],
  lastSeenDates?: Map<string, Date>
): IRiskSummary
```

##### 戻り値

```typescript
interface IRiskSummary {
  totalRecords: number;
  averageScore: number;
  byLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recommendations: number;
  topRisks: Array<{
    domain: string;
    score: number;
    level: RiskLevel;
  }>;
}
```

#### filterByRiskLevel()

指定されたリスクレベル以上のレコードをフィルタリングします。

```typescript
filterByRiskLevel(
  records: IDNSRecord[],
  minLevel: RiskLevel
): IDNSRecord[]
```

##### 使用例

```typescript
// 高リスク以上のレコードを取得
const highRiskRecords = calculator.filterByRiskLevel(records, 'high');

// サマリーを生成
const summary = calculator.getRiskSummary(records);
console.log(`平均リスクスコア: ${summary.averageScore}`);
console.log(`クリティカルなレコード数: ${summary.byLevel.critical}`);
```

### リスクスコア計算ロジック

1. **未使用期間スコア** (0-60点)
   ```
   30日以上: 10点
   90日以上: 30点
   180日以上: 60点
   ```

2. **命名パターンスコア** (0-30点)
   - 疑わしいパターン: `temp-`, `test-`, `old-`, `backup-`, `demo-`, `dev-`, `staging-`
   - パターンが含まれる場合: 30点

3. **TTLスコア** (0-30点)
   ```
   300秒未満: 30点
   3600秒未満: 20点
   86400秒未満: 10点
   ```

4. **レコードタイプスコア** (0-20点)
   ```
   SRV: 20点
   TXT: 10-20点（内容による）
   CNAME: 15点（未使用の場合）
   その他: 5点
   ```

5. **ドメイン階層スコア** (0-15点)
   ```
   サブドメイン階層数 × 5点（最大15点）
   ```

---

## Logger

統一されたロギング機能を提供するクラス。

### インポート

```typescript
import { Logger } from '@/lib/logger';
```

### コンストラクタ

```typescript
const logger = new Logger(options?: ILoggerOptions);
```

#### ILoggerOptions

```typescript
interface ILoggerOptions {
  verbose?: boolean;    // 詳細ログを出力
  quiet?: boolean;      // エラー以外を抑制
  json?: boolean;       // JSON形式で出力
  timestamp?: boolean;  // タイムスタンプを付与
}
```

### メソッド

#### 基本的なロギング

```typescript
logger.info(message: string): void
logger.success(message: string): void
logger.warn(message: string): void
logger.error(message: string | Error): void
logger.debug(message: string): void
```

#### スピナー表示

```typescript
// スピナーを開始
logger.startSpinner(message: string): void

// スピナーを停止
logger.stopSpinner(success: boolean, message?: string): void
```

#### JSON出力

```typescript
logger.json(data: any): void
```

### 使用例

```typescript
const logger = new Logger({ verbose: true });

logger.info('処理を開始します');
logger.startSpinner('DNSレコードを解析中...');

// 処理実行

logger.stopSpinner(true, '解析完了');
logger.success('✅ すべての処理が完了しました');

// エラー処理
try {
  // 何か処理
} catch (error) {
  logger.error(error);
}
```