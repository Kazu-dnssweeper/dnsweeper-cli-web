/**
 * sweepコマンド - 複数ドメインの一括DNS解決とスキャン
 */

import { readFileSync } from 'fs';

import { Command } from 'commander';

import { CSVProcessor } from '../lib/csv-processor.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import { Logger } from '../lib/logger.js';
import { createFormatter, type AnalysisResult } from '../lib/output-formatter.js';
import { RiskCalculator } from '../lib/risk-calculator.js';

import type { DNSRecordType, IDNSRecord } from '../types/index.js';

/**
 * sweepコマンドのオプション
 */
interface ISweepOptions {
  file?: string;
  csv?: string;
  types?: string;
  format?: 'table' | 'json' | 'csv' | 'text';
  output?: string;
  timeout?: string;
  nameserver?: string;
  concurrency?: string;
  verbose?: boolean;
  json?: boolean;
  quiet?: boolean;
  colors?: boolean;
  analyze?: boolean;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  progress?: boolean;
}

/**
 * ドメインリストのソース
 */
type DomainSource = {
  type: 'inline' | 'file' | 'csv';
  data: string[];
};

/**
 * sweepコマンドを作成
 */
export function createSweepCommand(): Command {
  const sweep = new Command('sweep')
    .alias('scan')
    .description('複数ドメインの一括DNS解決とスキャン')
    .argument('[domains...]', 'スキャンするドメインのリスト')
    .option('-f, --file <file>', 'ドメインリストファイル（1行1ドメイン）')
    .option('--csv <file>', 'CSVファイルからドメインを読み込み')
    .option('-t, --types <types>', 'レコードタイプのリスト（カンマ区切り）', 'A,AAAA,CNAME,MX')
    .option('--format <format>', '出力形式 (table, json, csv, text)', 'table')
    .option('-o, --output <file>', '結果をファイルに出力')
    .option('--timeout <ms>', 'タイムアウト時間（ミリ秒）', '5000')
    .option('--nameserver <server>', '使用するネームサーバー')
    .option('-c, --concurrency <num>', '並列実行数', '5')
    .option('-a, --analyze', 'リスク分析を含める')
    .option('--risk-level <level>', '指定リスクレベル以上のみ表示 (low,medium,high,critical)')
    .option('--progress', '進捗バーを表示')
    .option('-v, --verbose', '詳細出力')
    .option('-j, --json', 'JSON形式で出力（--format jsonと同等）')
    .option('-q, --quiet', 'エラー以外の出力を抑制')
    .option('--no-colors', '色付きを無効化')
    .action(async (domains: string[], options: ISweepOptions) => {
      const logger = new Logger({
        verbose: options.verbose,
        quiet: options.quiet,
      });

      try {
        await executeSweep(domains, options, logger);
      } catch (error) {
        logger.error('スキャンエラー:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return sweep;
}

/**
 * sweep処理を実行
 */
async function executeSweep(
  domains: string[],
  options: ISweepOptions,
  logger: Logger,
): Promise<void> {
  // ドメインリストの取得
  const domainSource = await getDomainSource(domains, options, logger);

  if (domainSource.data.length === 0) {
    throw new Error('スキャンするドメインが指定されていません');
  }

  // パラメータ検証
  validateSweepOptions(options);

  // レコードタイプのパース
  const recordTypes = parseRecordTypes(options.types || 'A,AAAA,CNAME,MX');

  // 出力形式決定
  const format = options.json ? 'json' : options.format || 'table';

  // DNS解決設定
  const resolverConfig = {
    timeout: parseInt(options.timeout || '5000', 10),
    nameserver: options.nameserver,
  };

  const resolver = new DNSResolver(resolverConfig);
  const concurrency = parseInt(options.concurrency || '5', 10);

  logger.info(
    `スキャン開始: ${domainSource.data.length}ドメイン × ${recordTypes.length}レコードタイプ`,
  );
  logger.info(`並列実行数: ${concurrency}`);

  if (options.nameserver) {
    logger.info(`ネームサーバー: ${options.nameserver}`);
  }

  const startTime = Date.now();
  let progress = 0;
  const totalOperations = domainSource.data.length * recordTypes.length;

  if (options.progress && !options.quiet) {
    logger.info(`総操作数: ${totalOperations}`);
  }

  try {
    // 並列DNS解決実行
    const allRecords: IDNSRecord[] = [];
    const errors: Array<{ domain: string; type: DNSRecordType; error: string }> = [];

    // ドメインごとに処理
    for (let i = 0; i < domainSource.data.length; i += concurrency) {
      const batch = domainSource.data.slice(i, i + concurrency);

      if (options.progress && !options.quiet) {
        logger.info(
          `バッチ ${Math.floor(i / concurrency) + 1}/${Math.ceil(domainSource.data.length / concurrency)} 処理中...`,
        );
      }

      // バッチ内の各ドメインを並列処理
      const batchPromises = batch.map(async (domain) => {
        const domainRecords: IDNSRecord[] = [];

        for (const recordType of recordTypes) {
          try {
            const lookupResult = await resolver.resolve(domain, recordType);

            if (lookupResult.status === 'success' && lookupResult.records) {
              const records = convertToIDNSRecords(lookupResult, domain, recordType);
              domainRecords.push(...records);
            }
          } catch (error) {
            errors.push({
              domain,
              type: recordType,
              error: error instanceof Error ? error.message : String(error),
            });
          }

          progress++;

          if (options.progress && !options.quiet && progress % 10 === 0) {
            const percentage = Math.round((progress / totalOperations) * 100);
            logger.info(`進捗: ${progress}/${totalOperations} (${percentage}%)`);
          }
        }

        return domainRecords;
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((records) => allRecords.push(...records));
    }

    const duration = Date.now() - startTime;

    logger.success(`スキャン完了: ${allRecords.length}レコード取得 (${duration}ms)`);

    if (errors.length > 0) {
      logger.warn(`${errors.length}件のエラーが発生しました`);
      if (options.verbose) {
        errors.forEach((err) => {
          logger.warn(`  ${err.domain} (${err.type}): ${err.error}`);
        });
      }
    }

    if (allRecords.length === 0) {
      logger.warn('有効なレコードが見つかりませんでした');
      return;
    }

    // リスク分析（オプション）
    let analysisResult: AnalysisResult;

    if (options.analyze) {
      logger.info('リスク分析を実行中...');
      analysisResult = await performRiskAnalysis(allRecords, duration, errors);
    } else {
      analysisResult = createBasicAnalysisResult(allRecords, duration, errors);
    }

    // リスクレベルフィルタリング
    if (options.riskLevel) {
      analysisResult = filterByRiskLevel(analysisResult, options.riskLevel);
      logger.info(`リスクレベル ${options.riskLevel} 以上のレコードのみ表示`);
    }

    // 結果出力
    await outputResults(analysisResult, format, options, logger);
  } catch (error) {
    throw error;
  }
}

/**
 * ドメインソースを取得
 */
async function getDomainSource(
  domains: string[],
  options: ISweepOptions,
  logger: Logger,
): Promise<DomainSource> {
  // CSVファイルから読み込み
  if (options.csv) {
    logger.info(`CSVファイルからドメインを読み込み: ${options.csv}`);
    const processor = new CSVProcessor();
    const records = await processor.parseAuto(options.csv);

    // CSVの最初の列をドメイン名として扱う
    const csvDomains = records.records
      .map((record: any) => record.domain || record.name || Object.values(record)[0])
      .filter((domain: any) => typeof domain === 'string' && domain.length > 0)
      .map((domain: any) => String(domain).trim());

    return {
      type: 'csv',
      data: [...new Set(csvDomains)] as string[], // 重複除去
    };
  }

  // ファイルから読み込み
  if (options.file) {
    logger.info(`ファイルからドメインを読み込み: ${options.file}`);
    const fileContent = readFileSync(options.file, 'utf-8');
    const fileDomains = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => line.split(/\s+/)[0])
      .filter((domain): domain is string => domain !== undefined); // 最初の単語のみ使用

    return {
      type: 'file',
      data: [...new Set(fileDomains)], // 重複除去
    };
  }

  // コマンドライン引数から
  if (domains && domains.length > 0) {
    return {
      type: 'inline',
      data: [...new Set(domains)], // 重複除去
    };
  }

  return {
    type: 'inline',
    data: [],
  };
}

/**
 * sweepオプションの検証
 */
function validateSweepOptions(options: ISweepOptions): void {
  // 並列実行数の検証
  const concurrency = parseInt(options.concurrency || '5', 10);
  if (isNaN(concurrency) || concurrency <= 0 || concurrency > 50) {
    throw new Error('並列実行数は1-50の範囲で指定してください');
  }

  // タイムアウトの検証
  const timeout = parseInt(options.timeout || '5000', 10);
  if (isNaN(timeout) || timeout <= 0 || timeout > 60000) {
    throw new Error('タイムアウトは1-60000msの範囲で指定してください');
  }

  // 出力形式の検証
  const validFormats = ['table', 'json', 'csv', 'text'];
  const format = options.format || 'table';

  if (!validFormats.includes(format)) {
    throw new Error(`サポートされていない出力形式: ${options.format}`);
  }

  // リスクレベルの検証
  if (options.riskLevel) {
    const validRiskLevels = ['low', 'medium', 'high', 'critical'];
    if (!validRiskLevels.includes(options.riskLevel)) {
      throw new Error(`サポートされていないリスクレベル: ${options.riskLevel}`);
    }
  }
}

/**
 * レコードタイプのパース
 */
function parseRecordTypes(typesString: string): DNSRecordType[] {
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

  const types = typesString
    .split(',')
    .map((type) => type.trim().toUpperCase())
    .filter((type) => type.length > 0);

  const invalidTypes = types.filter((type) => !validTypes.includes(type as DNSRecordType));

  if (invalidTypes.length > 0) {
    throw new Error(`サポートされていないレコードタイプ: ${invalidTypes.join(', ')}`);
  }

  return types as DNSRecordType[];
}

/**
 * DNS解決結果をIDNSRecord形式に変換
 */
function convertToIDNSRecords(
  lookupResult: any,
  domain: string,
  recordType: DNSRecordType,
): IDNSRecord[] {
  if (!lookupResult.records || !Array.isArray(lookupResult.records)) {
    return [];
  }

  const now = new Date();

  return lookupResult.records.map((record: any, index: number): IDNSRecord => {
    let value: string;
    let priority: number | undefined;
    let weight: number | undefined;
    let port: number | undefined;

    // レコードタイプ別の値の処理
    switch (recordType) {
      case 'MX':
        value = record.exchange || record.value || String(record);
        priority = record.priority;
        break;
      case 'SRV':
        value = record.target || record.value || String(record);
        priority = record.priority;
        weight = record.weight;
        port = record.port;
        break;
      case 'TXT':
        value = Array.isArray(record) ? record.join(' ') : String(record);
        break;
      default:
        value = record.address || record.value || String(record);
    }

    return {
      id: `${domain}-${recordType.toLowerCase()}-${index}`,
      name: domain,
      type: recordType,
      value,
      ttl: record.ttl || 300,
      ...(priority !== undefined && { priority }),
      ...(weight !== undefined && { weight }),
      ...(port !== undefined && { port }),
      created: now,
      updated: now,
    };
  });
}

/**
 * リスク分析を実行
 */
async function performRiskAnalysis(
  records: IDNSRecord[],
  duration: number,
  _errors: Array<{ domain: string; type: DNSRecordType; error: string }>,
): Promise<AnalysisResult> {
  const calculator = new RiskCalculator();
  const analysisDate = new Date();

  // リスク分析実行
  const recordsWithRisk = records.map((record) => {
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
      {} as Record<DNSRecordType, number>,
    ),
    byRisk: recordsWithRisk.reduce(
      (acc, record) => {
        acc[record.riskLevel] = (acc[record.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
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
  allTypes.forEach((type) => {
    if (!summary.byType[type]) {
      summary.byType[type] = 0;
    }
  });

  return {
    summary: summary as AnalysisResult['summary'],
    records: recordsWithRisk as AnalysisResult['records'],
    metadata: {
      scannedAt: analysisDate,
      source: `sweep-${records.length}-records`,
      version: '1.0.0',
    },
  };
}

/**
 * 基本的な分析結果を作成（リスク分析なし）
 */
function createBasicAnalysisResult(
  records: IDNSRecord[],
  duration: number,
  _errors: Array<{ domain: string; type: DNSRecordType; error: string }>,
): AnalysisResult {
  // デフォルトのリスク情報付きレコード
  const recordsWithDefaults = records.map((record) => ({
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
      {} as Record<DNSRecordType, number>,
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
  allTypes.forEach((type) => {
    if (!summary.byType[type]) {
      summary.byType[type] = 0;
    }
  });

  return {
    summary: summary as AnalysisResult['summary'],
    records: recordsWithDefaults as AnalysisResult['records'],
    metadata: {
      scannedAt: new Date(),
      source: `sweep-${records.length}-records`,
      version: '1.0.0',
    },
  };
}

/**
 * リスクレベルでフィルタリング
 */
function filterByRiskLevel(result: AnalysisResult, minLevel: string): AnalysisResult {
  const levelOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const minLevelValue = levelOrder[minLevel as keyof typeof levelOrder] ?? 0;

  const filteredRecords = result.records.filter((record) => {
    const recordLevelValue = levelOrder[record.riskLevel as keyof typeof levelOrder] ?? 0;
    return recordLevelValue >= minLevelValue;
  });

  // フィルタされたサマリーを再計算
  const filteredSummary = {
    total: filteredRecords.length,
    byType: filteredRecords.reduce(
      (acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      },
      {} as Record<DNSRecordType, number>,
    ),
    byRisk: filteredRecords.reduce(
      (acc, record) => {
        acc[record.riskLevel] = (acc[record.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    duration: result.summary.duration,
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
  allTypes.forEach((type) => {
    if (!filteredSummary.byType[type]) {
      filteredSummary.byType[type] = 0;
    }
  });

  return {
    summary: filteredSummary as AnalysisResult['summary'],
    records: filteredRecords,
    metadata: result.metadata,
  };
}

/**
 * 結果を出力
 */
async function outputResults(
  result: AnalysisResult,
  format: string,
  options: ISweepOptions,
  logger: Logger,
): Promise<void> {
  const formatter = createFormatter({
    format: format as any,
    colors: options.colors !== false,
    verbose: options.verbose || false,
    compact: format === 'json' && !options.verbose,
  });

  const output = formatter.format(result);

  if (options.output) {
    await formatter.writeToFile(result, options.output);
    logger.success(`結果を ${options.output} に保存しました`);
  } else {
    console.log(output);
  }
}
