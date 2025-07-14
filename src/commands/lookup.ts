/**
 * lookupコマンド - DNS解決を実行して結果を表示
 */

import { Command } from 'commander';

import { DNSResolver } from '../lib/dns-resolver.js';
import { Logger } from '../lib/logger.js';
import {
  createFormatter,
  type AnalysisResult,
  type OutputFormat,
} from '../lib/output-formatter.js';
import { RiskCalculator } from '../lib/risk-calculator.js';

import type { DNSRecordType, IDNSRecord } from '../types/index.js';

/**
 * lookupコマンドのオプション
 */
interface ILookupOptions {
  type?: DNSRecordType;
  format?: 'table' | 'json' | 'csv' | 'text';
  output?: string;
  timeout?: string;
  nameserver?: string;
  verbose?: boolean;
  json?: boolean;
  quiet?: boolean;
  colors?: boolean;
  analyze?: boolean;
}

/**
 * lookupコマンドを作成
 */
export function createLookupCommand(): Command {
  const lookup = new Command('lookup')
    .alias('resolve')
    .description('DNS解決を実行して結果を表示')
    .argument('<domain>', '解決するドメイン名')
    .option(
      '-t, --type <type>',
      'レコードタイプ (A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR)',
      'A'
    )
    .option(
      '-f, --format <format>',
      '出力形式 (table, json, csv, text)',
      'table'
    )
    .option('-o, --output <file>', '結果をファイルに出力')
    .option('--timeout <ms>', 'タイムアウト時間（ミリ秒）', '5000')
    .option('--nameserver <server>', '使用するネームサーバー')
    .option('-a, --analyze', 'リスク分析を含める')
    .option('-v, --verbose', '詳細出力')
    .option('-j, --json', 'JSON形式で出力（--format jsonと同等）')
    .option('-q, --quiet', 'エラー以外の出力を抑制')
    .option('--no-colors', '色付きを無効化')
    .action(async (domain: string, options: ILookupOptions) => {
      const logger = new Logger({
        verbose: options.verbose,
        quiet: options.quiet,
      });

      try {
        await executeLookup(domain, options, logger);
      } catch (error) {
        logger.error(
          'DNS解決エラー:',
          error instanceof Error ? error : new Error(String(error))
        );
        process.exit(1);
      }
    });

  return lookup;
}

/**
 * lookup処理を実行
 */
async function executeLookup(
  domain: string,
  options: ILookupOptions,
  logger: Logger
): Promise<void> {
  // パラメータ検証
  validateDomain(domain);
  validateOptions(options);

  // 出力形式決定
  const format = options.json ? 'json' : options.format || 'table';

  // DNS解決設定
  const resolverConfig = {
    timeout: parseInt(options.timeout || '5000', 10),
    nameserver: options.nameserver,
  };

  const resolver = new DNSResolver(resolverConfig);
  const recordType = (options.type || 'A').toUpperCase() as DNSRecordType;

  logger.info(`DNS解決開始: ${domain} (${recordType})`);

  if (options.nameserver) {
    logger.info(`ネームサーバー: ${options.nameserver}`);
  }

  if (!options.quiet) {
    logger.startSpinner(`${domain} の ${recordType} レコードを解決中...`);
  }

  try {
    const startTime = Date.now();

    // DNS解決実行
    const lookupResult = await resolver.resolve(domain, recordType);

    const duration = Date.now() - startTime;

    if (!options.quiet) {
      logger.stopSpinner();
    }

    if (lookupResult.status === 'error') {
      throw new Error(`DNS解決失敗: ${lookupResult.error}`);
    }

    // 結果をIDNSRecord形式に変換
    const records = convertToIDNSRecords(lookupResult, domain, recordType);

    logger.success(`DNS解決完了 (${duration}ms)`);

    if (records.length === 0) {
      logger.warn(`${domain} の ${recordType} レコードが見つかりませんでした`);
      return;
    }

    // リスク分析（オプション）
    let analysisResult: AnalysisResult;

    if (options.analyze) {
      logger.info('リスク分析を実行中...');
      analysisResult = await performRiskAnalysis(records, domain, duration);
    } else {
      analysisResult = createBasicAnalysisResult(records, domain, duration);
    }

    // 結果出力
    await outputResults(analysisResult, format, options, logger);
  } catch (error) {
    if (!options.quiet) {
      logger.stopSpinner();
    }
    throw error;
  }
}

/**
 * ドメイン名の検証
 */
function validateDomain(domain: string): void {
  if (!domain || typeof domain !== 'string') {
    throw new Error('ドメイン名が指定されていません');
  }

  // 基本的なドメイン名検証
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!domainRegex.test(domain)) {
    throw new Error(`無効なドメイン名: ${domain}`);
  }

  if (domain.length > 253) {
    throw new Error('ドメイン名が長すぎます（253文字以下）');
  }
}

/**
 * オプションの検証
 */
function validateOptions(options: ILookupOptions): void {
  // レコードタイプの検証
  const validTypes: DNSRecordType[] = [
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SOA',
    'SRV',
    'PTR',
    'CAA',
  ];
  const recordType = (options.type || 'A').toUpperCase();

  if (!validTypes.includes(recordType as DNSRecordType)) {
    throw new Error(`サポートされていないレコードタイプ: ${options.type}`);
  }

  // 出力形式の検証
  const validFormats = ['table', 'json', 'csv', 'text'];
  const format = options.format || 'table';

  if (!validFormats.includes(format)) {
    throw new Error(`サポートされていない出力形式: ${options.format}`);
  }

  // タイムアウトの検証
  const timeout = parseInt(options.timeout || '5000', 10);
  if (isNaN(timeout) || timeout <= 0 || timeout > 60000) {
    throw new Error('タイムアウトは1-60000msの範囲で指定してください');
  }
}

// DNS レコード型定義
interface DNSRecordData {
  exchange?: string;
  value?: string;
  priority?: number;
  target?: string;
  weight?: number;
  port?: number;
  address?: string;
  ttl?: number;
}

// 型ガード関数
function isDNSRecordData(record: unknown): record is DNSRecordData {
  return typeof record === 'object' && record !== null;
}

/**
 * DNS解決結果をIDNSRecord形式に変換
 */
function convertToIDNSRecords(
  lookupResult: { records: unknown[] },
  domain: string,
  recordType: DNSRecordType
): IDNSRecord[] {
  if (!lookupResult.records || !Array.isArray(lookupResult.records)) {
    return [];
  }

  const now = new Date();

  return lookupResult.records.map(
    (record: unknown, index: number): IDNSRecord => {
      let value: string;
      let priority: number | undefined;
      let weight: number | undefined;
      let port: number | undefined;

      // 安全な型変換
      const recordData = isDNSRecordData(record) ? record : {};

      // レコードタイプ別の値の処理
      switch (recordType) {
        case 'MX':
          value = recordData.exchange || recordData.value || String(record);
          priority = recordData.priority;
          break;
        case 'SRV':
          value = recordData.target || recordData.value || String(record);
          priority = recordData.priority;
          weight = recordData.weight;
          port = recordData.port;
          break;
        case 'TXT':
          value = Array.isArray(record) ? record.join(' ') : String(record);
          break;
        default:
          value = recordData.address || recordData.value || String(record);
      }

      return {
        id: `${domain}-${recordType.toLowerCase()}-${index}`,
        name: domain,
        type: recordType,
        value,
        ttl: recordData.ttl || 300,
        ...(priority !== undefined && { priority }),
        ...(weight !== undefined && { weight }),
        ...(port !== undefined && { port }),
        created: now,
        updated: now,
      };
    }
  );
}

/**
 * リスク分析を実行
 */
async function performRiskAnalysis(
  records: IDNSRecord[],
  domain: string,
  duration: number
): Promise<AnalysisResult> {
  const calculator = new RiskCalculator();
  const analysisDate = new Date();

  // リスク分析実行
  const recordsWithRisk = records.map(record => {
    const riskResult = calculator.calculateRisk(record, analysisDate);
    return {
      ...record,
      riskLevel: riskResult.level,
      riskScore: riskResult.total,
      recommendations: riskResult.recommendations,
    };
  });

  // サマリー情報生成
  const summary = {
    total: records.length,
    byType: records.reduce(
      (acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      },
      {} as Record<DNSRecordType, number>
    ),
    byRisk: recordsWithRisk.reduce(
      (acc, record) => {
        acc[record.riskLevel] = (acc[record.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    duration,
  };

  // 全レコードタイプの初期化
  const allTypes: DNSRecordType[] = [
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SOA',
    'SRV',
    'PTR',
    'CAA',
  ];
  allTypes.forEach(type => {
    if (!summary.byType[type]) {
      summary.byType[type] = 0;
    }
  });

  return {
    summary: summary as AnalysisResult['summary'],
    records: recordsWithRisk as AnalysisResult['records'],
    metadata: {
      scannedAt: analysisDate,
      source: domain,
      version: '1.0.0',
    },
  };
}

/**
 * 基本的な分析結果を作成（リスク分析なし）
 */
function createBasicAnalysisResult(
  records: IDNSRecord[],
  domain: string,
  duration: number
): AnalysisResult {
  // デフォルトのリスク情報付きレコード
  const recordsWithDefaults = records.map(record => ({
    ...record,
    riskLevel: 'low' as const,
    riskScore: 0,
    recommendations: [],
  }));

  const summary = {
    total: records.length,
    byType: records.reduce(
      (acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      },
      {} as Record<DNSRecordType, number>
    ),
    byRisk: {
      low: records.length,
      medium: 0,
      high: 0,
      critical: 0,
    },
    duration,
  };

  // 全レコードタイプの初期化
  const allTypes: DNSRecordType[] = [
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SOA',
    'SRV',
    'PTR',
    'CAA',
  ];
  allTypes.forEach(type => {
    if (!summary.byType[type]) {
      summary.byType[type] = 0;
    }
  });

  return {
    summary: summary as AnalysisResult['summary'],
    records: recordsWithDefaults as AnalysisResult['records'],
    metadata: {
      scannedAt: new Date(),
      source: domain,
      version: '1.0.0',
    },
  };
}

/**
 * 結果を出力
 */
async function outputResults(
  result: AnalysisResult,
  format: string,
  options: ILookupOptions,
  logger: Logger
): Promise<void> {
  const formatter = createFormatter({
    format: format as OutputFormat,
    colors: options.colors !== false,
    verbose: options.verbose || false,
    compact: format === 'json' && !options.verbose,
  });

  const output = formatter.format(result);

  if (options.output) {
    await formatter.writeToFile(result, options.output);
    logger.success(`結果を ${options.output} に保存しました`);
  } else {
    logger.info(output);
  }
}
