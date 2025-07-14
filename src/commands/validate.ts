/**
 * validateコマンド - DNS設定の妥当性をチェック
 */

import { Command } from 'commander';

import { DNSResolver } from '../lib/dns-resolver.js';
import { Logger } from '../lib/logger.js';
import {
  createFormatter,
  type AnalysisResult,
} from '../lib/output-formatter.js';

import type { DNSRecordType, IDNSRecord, RiskLevel } from '../types/index.js';

/**
 * validateコマンドのオプション
 */
interface IValidateOptions {
  format?: 'table' | 'json' | 'csv' | 'text';
  output?: string;
  timeout?: string;
  nameserver?: string;
  verbose?: boolean;
  json?: boolean;
  quiet?: boolean;
  colors?: boolean;
  checks?: string;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * 検証チェック項目
 */
interface IValidationCheck {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  execute: (records: IDNSRecord[], domain: string) => IValidationResult[];
}

/**
 * 検証結果
 */
interface IValidationResult {
  checkId: string;
  checkName: string;
  severity: 'info' | 'warning' | 'error';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  recommendations?: string[];
  affectedRecords?: string[];
}

/**
 * validateコマンドを作成
 */
export function createValidateCommand(): Command {
  const validate = new Command('validate')
    .alias('check')
    .description('DNS設定の妥当性をチェック')
    .argument('<domain>', 'チェックするドメイン名')
    .option(
      '-f, --format <format>',
      '出力形式 (table, json, csv, text)',
      'table'
    )
    .option('-o, --output <file>', '結果をファイルに出力')
    .option('--timeout <ms>', 'タイムアウト時間（ミリ秒）', '5000')
    .option('--nameserver <server>', '使用するネームサーバー')
    .option('--checks <checks>', '実行するチェック項目（カンマ区切り）')
    .option(
      '--severity <level>',
      '表示する最小重要度 (info, warning, error)',
      'info'
    )
    .option('-v, --verbose', '詳細出力')
    .option('-j, --json', 'JSON形式で出力（--format jsonと同等）')
    .option('-q, --quiet', 'エラー以外の出力を抑制')
    .option('--no-colors', '色付きを無効化')
    .action(async (domain: string, options: IValidateOptions) => {
      const logger = new Logger({
        verbose: options.verbose,
        quiet: options.quiet,
      });

      try {
        await executeValidate(domain, options, logger);
      } catch (error) {
        logger.error(
          'DNS検証エラー:',
          error instanceof Error ? error : new Error(String(error))
        );
        process.exit(1);
      }
    });

  return validate;
}

/**
 * validate処理を実行
 */
async function executeValidate(
  domain: string,
  options: IValidateOptions,
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
  const recordTypes: DNSRecordType[] = [
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SOA',
  ];

  logger.info(`DNS検証開始: ${domain}`);

  if (options.nameserver) {
    logger.info(`ネームサーバー: ${options.nameserver}`);
  }

  if (!options.quiet) {
    logger.startSpinner(`${domain} のDNS設定を検証中...`);
  }

  try {
    const startTime = Date.now();

    // 全レコードタイプのDNS解決
    const allRecords: IDNSRecord[] = [];
    const errors: Array<{ type: DNSRecordType; error: string }> = [];

    for (const recordType of recordTypes) {
      try {
        const lookupResult = await resolver.resolve(domain, recordType);

        if (lookupResult.status === 'success' && lookupResult.records) {
          const records = convertToIDNSRecords(
            lookupResult,
            domain,
            recordType
          );
          allRecords.push(...records);
        }
      } catch (error) {
        errors.push({
          type: recordType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const duration = Date.now() - startTime;

    if (!options.quiet) {
      logger.stopSpinner();
    }

    logger.success(`DNS解決完了 (${duration}ms)`);

    if (allRecords.length === 0) {
      logger.warn(`${domain} のDNSレコードが見つかりませんでした`);
      return;
    }

    logger.info(`${allRecords.length}件のレコードを取得、検証を開始します`);

    // 検証チェック実行
    const validationResults = await performValidation(
      allRecords,
      domain,
      options,
      logger
    );

    // 検証結果の分析と出力
    await outputValidationResults(
      validationResults,
      domain,
      format,
      options,
      logger
    );
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
function validateOptions(options: IValidateOptions): void {
  // 出力形式の検証
  const validFormats = ['table', 'json', 'csv', 'text'];
  const format = options.format || 'table';

  if (!validFormats.includes(format)) {
    throw new Error(`サポートされていない出力形式: ${options.format}`);
  }

  // 重要度の検証
  if (options.severity) {
    const validSeverities = ['info', 'warning', 'error'];
    if (!validSeverities.includes(options.severity)) {
      throw new Error(`サポートされていない重要度: ${options.severity}`);
    }
  }

  // タイムアウトの検証
  const timeout = parseInt(options.timeout || '5000', 10);
  if (isNaN(timeout) || timeout <= 0 || timeout > 60000) {
    throw new Error('タイムアウトは1-60000msの範囲で指定してください');
  }
}

/**
 * DNS解決結果をIDNSRecord形式に変換
 */
function convertToIDNSRecords(
  lookupResult: { records?: unknown[] },
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

      // レコードタイプ別の値の処理
      const recordObj = record as Record<string, unknown>;
      switch (recordType) {
        case 'MX':
          value = String(recordObj.exchange || recordObj.value || record);
          priority = recordObj.priority
            ? Number(recordObj.priority)
            : undefined;
          break;
        case 'SRV':
          value = String(recordObj.target || recordObj.value || record);
          priority = recordObj.priority
            ? Number(recordObj.priority)
            : undefined;
          weight = recordObj.weight ? Number(recordObj.weight) : undefined;
          port = recordObj.port ? Number(recordObj.port) : undefined;
          break;
        case 'TXT':
          value = Array.isArray(record) ? record.join(' ') : String(record);
          break;
        default:
          value = String(recordObj.address || recordObj.value || record);
      }

      return {
        id: `${domain}-${recordType.toLowerCase()}-${index}`,
        name: domain,
        type: recordType,
        value,
        ttl: recordObj.ttl ? Number(recordObj.ttl) : 300,
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
 * 検証チェックを実行
 */
async function performValidation(
  records: IDNSRecord[],
  domain: string,
  options: IValidateOptions,
  logger: Logger
): Promise<IValidationResult[]> {
  const checks = getValidationChecks();
  const enabledChecks = filterEnabledChecks(checks, options.checks);
  const results: IValidationResult[] = [];

  logger.info(`${enabledChecks.length}項目の検証チェックを実行します`);

  for (const check of enabledChecks) {
    logger.info(`チェック実行: ${check.name}`);
    try {
      const checkResults = check.execute(records, domain);
      results.push(...checkResults);
    } catch (error) {
      results.push({
        checkId: check.id,
        checkName: check.name,
        severity: 'error',
        status: 'fail',
        message: `チェック実行エラー: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return results;
}

/**
 * 利用可能な検証チェック一覧を取得
 */
function getValidationChecks(): IValidationCheck[] {
  return [
    {
      id: 'a-record-exists',
      name: 'Aレコード存在チェック',
      description: 'ドメインにAレコードが設定されているかチェック',
      severity: 'error',
      execute: records => {
        const aRecords = records.filter(r => r.type === 'A');
        return [
          {
            checkId: 'a-record-exists',
            checkName: 'Aレコード存在チェック',
            severity: 'error',
            status: aRecords.length > 0 ? 'pass' : 'fail',
            message:
              aRecords.length > 0
                ? `Aレコードが${aRecords.length}件設定されています`
                : 'Aレコードが設定されていません',
            details:
              aRecords.length > 0
                ? `設定値: ${aRecords.map(r => r.value).join(', ')}`
                : undefined,
            recommendations:
              aRecords.length === 0
                ? [
                    'Aレコードを設定してドメインをIPアドレスに解決できるようにしてください',
                  ]
                : undefined,
            affectedRecords: aRecords.map(r => r.id),
          },
        ];
      },
    },
    {
      id: 'mx-record-exists',
      name: 'MXレコード存在チェック',
      description: 'メール配信のためのMXレコードが設定されているかチェック',
      severity: 'warning',
      execute: records => {
        const mxRecords = records.filter(r => r.type === 'MX');
        return [
          {
            checkId: 'mx-record-exists',
            checkName: 'MXレコード存在チェック',
            severity: 'warning',
            status: mxRecords.length > 0 ? 'pass' : 'warning',
            message:
              mxRecords.length > 0
                ? `MXレコードが${mxRecords.length}件設定されています`
                : 'MXレコードが設定されていません',
            details:
              mxRecords.length > 0
                ? `設定値: ${mxRecords.map(r => `${r.value} (priority: ${r.priority})`).join(', ')}`
                : undefined,
            recommendations:
              mxRecords.length === 0
                ? ['メール受信が必要な場合、MXレコードを設定してください']
                : undefined,
            affectedRecords: mxRecords.map(r => r.id),
          },
        ];
      },
    },
    {
      id: 'ttl-consistency',
      name: 'TTL値の整合性チェック',
      description: '同じタイプのレコードでTTL値が統一されているかチェック',
      severity: 'info',
      execute: records => {
        const results: IValidationResult[] = [];
        const recordsByType = records.reduce(
          (acc, record) => {
            if (!acc[record.type]) acc[record.type] = [];
            acc[record.type].push(record);
            return acc;
          },
          {} as Record<DNSRecordType, IDNSRecord[]>
        );

        Object.entries(recordsByType).forEach(([type, typeRecords]) => {
          if (typeRecords.length > 1) {
            const ttls = [...new Set(typeRecords.map(r => r.ttl))];
            if (ttls.length > 1) {
              results.push({
                checkId: 'ttl-consistency',
                checkName: 'TTL値の整合性チェック',
                severity: 'info',
                status: 'warning',
                message: `${type}レコードのTTL値が統一されていません`,
                details: `TTL値: ${ttls.join(', ')}`,
                recommendations: [
                  '同じタイプのレコードは同じTTL値に統一することを推奨します',
                  'よく使われるTTL値: 300 (5分)、1800 (30分)、3600 (1時間)',
                ],
                affectedRecords: typeRecords.map(r => r.id),
              });
            }
          }
        });

        return results;
      },
    },
    {
      id: 'cname-conflicts',
      name: 'CNAMEレコード競合チェック',
      description: 'CNAMEレコードと他のレコードが競合していないかチェック',
      severity: 'error',
      execute: records => {
        const results: IValidationResult[] = [];
        const cnameRecords = records.filter(r => r.type === 'CNAME');

        cnameRecords.forEach(cnameRecord => {
          const conflictingRecords = records.filter(
            r => r.name === cnameRecord.name && r.type !== 'CNAME'
          );

          if (conflictingRecords.length > 0) {
            results.push({
              checkId: 'cname-conflicts',
              checkName: 'CNAMEレコード競合チェック',
              severity: 'error',
              status: 'fail',
              message: `CNAME レコードが他のレコードと競合しています`,
              details: `競合レコード: ${conflictingRecords.map(r => r.type).join(', ')}`,
              recommendations: [
                'CNAMEレコードは同じ名前に他のレコードタイプと併存できません',
                'CNAMEレコードを削除するか、他のレコードを削除してください',
              ],
              affectedRecords: [
                cnameRecord.id,
                ...conflictingRecords.map(r => r.id),
              ],
            });
          }
        });

        return results;
      },
    },
    {
      id: 'short-ttl-warning',
      name: '短すぎるTTL警告',
      description: 'TTL値が短すぎる場合の警告',
      severity: 'warning',
      execute: records => {
        const shortTtlRecords = records.filter(r => r.ttl < 300); // 5分未満

        if (shortTtlRecords.length > 0) {
          return [
            {
              checkId: 'short-ttl-warning',
              checkName: '短すぎるTTL警告',
              severity: 'warning',
              status: 'warning',
              message: `TTL値が短すぎるレコードがあります (${shortTtlRecords.length}件)`,
              details: `対象レコード: ${shortTtlRecords.map(r => `${r.type}=${r.ttl}`).join(', ')}`,
              recommendations: [
                'TTL値が短すぎるとDNSクエリ頻度が増加します',
                '通常は300秒(5分)以上を推奨します',
                '緊急時以外は短いTTLを避けることを推奨します',
              ],
              affectedRecords: shortTtlRecords.map(r => r.id),
            },
          ];
        }

        return [];
      },
    },
  ];
}

/**
 * 有効化するチェックをフィルタリング
 */
function filterEnabledChecks(
  checks: IValidationCheck[],
  checksOption?: string
): IValidationCheck[] {
  if (!checksOption) {
    return checks; // 全チェック実行
  }

  const enabledCheckIds = checksOption.split(',').map(id => id.trim());
  return checks.filter(check => enabledCheckIds.includes(check.id));
}

/**
 * 検証結果を出力
 */
async function outputValidationResults(
  results: IValidationResult[],
  domain: string,
  format: string,
  options: IValidateOptions,
  logger: Logger
): Promise<void> {
  // 重要度でフィルタリング
  const severityOrder = { info: 0, warning: 1, error: 2 };
  const minSeverityLevel = severityOrder[options.severity || 'info'];
  const filteredResults = results.filter(
    r => severityOrder[r.severity] >= minSeverityLevel
  );

  // 統計情報
  const stats = {
    total: filteredResults.length,
    passed: filteredResults.filter(r => r.status === 'pass').length,
    warnings: filteredResults.filter(r => r.status === 'warning').length,
    failed: filteredResults.filter(r => r.status === 'fail').length,
  };

  logger.info(
    `検証完了: ${stats.total}項目中 ${stats.passed}件合格, ${stats.warnings}件警告, ${stats.failed}件エラー`
  );

  // 分析結果形式に変換
  const analysisResult = createValidationAnalysisResult(
    filteredResults,
    domain,
    {
      totalRecords: stats.total,
      validRecords: stats.passed,
      invalidRecords: stats.failed,
    }
  );

  // 結果出力
  const formatter = createFormatter({
    format: format as 'table' | 'json' | 'csv' | 'text',
    colors: options.colors !== false,
    verbose: options.verbose || false,
    compact: format === 'json' && !options.verbose,
  });

  const output = formatter.format(analysisResult);

  if (options.output) {
    await formatter.writeToFile(analysisResult, options.output);
    logger.success(`結果を ${options.output} に保存しました`);
  } else {
    console.log(output);
  }

  // 概要表示
  if (!options.quiet && format === 'table') {
    console.log('\n=== 検証結果概要 ===');
    console.log(`✅ 合格: ${stats.passed}件`);
    if (stats.warnings > 0) {
      console.log(`⚠️  警告: ${stats.warnings}件`);
    }
    if (stats.failed > 0) {
      console.log(`❌ エラー: ${stats.failed}件`);
    }
  }
}

/**
 * 検証結果をAnalysisResult形式に変換
 */
function createValidationAnalysisResult(
  results: IValidationResult[],
  domain: string,
  stats: { totalRecords: number; validRecords: number; invalidRecords: number }
): AnalysisResult {
  // 検証結果をレコード形式に変換
  const records = results.map((result, index) => ({
    id: `validation-${index}`,
    name: domain,
    type: 'TXT' as DNSRecordType,
    value: result.message,
    ttl: 0,
    created: new Date(),
    updated: new Date(),
    riskLevel: (result.severity === 'error'
      ? 'high'
      : result.severity === 'warning'
        ? 'medium'
        : 'low') as RiskLevel,
    riskScore:
      result.severity === 'error'
        ? 80
        : result.severity === 'warning'
          ? 50
          : 20,
    recommendations: result.recommendations || [],
  }));

  return {
    summary: {
      total: stats.totalRecords,
      byType: { TXT: stats.totalRecords } as Record<DNSRecordType, number>,
      byRisk: {
        low: stats.validRecords,
        medium: stats.totalRecords - stats.validRecords - stats.invalidRecords,
        high: stats.invalidRecords,
        critical: 0,
      },
      duration: 0,
    },
    records,
    metadata: {
      scannedAt: new Date(),
      source: `validation-${domain}`,
      version: '1.0.0',
    },
  };
}
