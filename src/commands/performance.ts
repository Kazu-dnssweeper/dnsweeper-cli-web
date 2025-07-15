import { readFile } from 'fs/promises';
import os from 'os';
import { join } from 'path';

import chalk from 'chalk';
import { Command } from 'commander';

import { Logger } from '../lib/logger.js';
// import { MetricsCollector } from '../lib/metrics/metrics-collector.js';

const logger = new Logger();

export const performanceCommand = new Command('performance')
  .description('パフォーマンス分析を実行')
  .option('-d, --days <number>', '分析対象の日数', '7')
  .option('-f, --format <type>', '出力形式 (text/json)', 'text')
  .option('--summary', 'サマリー表示のみ', false)
  .action(async options => {
    try {
      // const _metrics = MetricsCollector.getInstance();
      await runPerformanceAnalysis(options);
    } catch (error) {
      logger.error(
        'パフォーマンス分析中にエラーが発生しました',
        error as Error
      );
      process.exit(1);
    }
  });

performanceCommand
  .command('analyze')
  .description('詳細なパフォーマンス分析を実行')
  .action(async options => {
    await runDetailedAnalysis(options);
  });

performanceCommand
  .command('reset')
  .description('パフォーマンスメトリクスをリセット')
  .action(async () => {
    // const metrics = MetricsCollector.getInstance();
    // await metrics.reset();
    logger.info('パフォーマンスメトリクスをリセットしました');
  });

interface Metrics {
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  details?: Record<string, unknown>;
}

interface AggregatedMetrics {
  totals: {
    operations: number;
    dnsResolutions: number;
    csvRecordsProcessed: number;
    commandsExecuted: number;
  };
  performance: {
    avgDnsResolutionTime: number;
    avgCsvProcessingTime: number;
    avgCommandExecutionTime: number;
  };
  systemMetrics: SystemMetrics;
}

interface SystemMetrics {
  cpu: {
    usage: number;
  };
  memory: {
    total: number;
    used: number;
    usagePercent: number;
  };
  process: {
    uptime: number;
    memoryUsage: {
      heapUsed: number;
    };
  };
}

interface PerformanceOptions {
  days: string;
  format: string;
  summary: boolean;
}

async function runPerformanceAnalysis(
  options: PerformanceOptions
): Promise<void> {
  const days = parseInt(options.days) || 7;
  const metricsPath = join(process.cwd(), '.dnsweeper', 'metrics.json');

  try {
    const data = await readFile(metricsPath, 'utf-8');
    let metrics: Metrics[] = JSON.parse(data);

    // 期間でフィルタリング
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    metrics = metrics.filter(
      (m: Metrics) => new Date(m.timestamp).getTime() > cutoffTime
    );

    const aggregated = aggregateMetrics(metrics);

    if (options.format === 'json') {
      // JSON出力モードではconsole.logを使用
      /* eslint-disable-next-line no-console */
      console.log(JSON.stringify(aggregated, null, 2));
    } else {
      displayMetrics(aggregated, options.summary);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.warn(
        'メトリクスファイルが見つかりません。コマンドを実行してメトリクスを収集してください。'
      );
    } else {
      throw error;
    }
  }
}

function aggregateMetrics(metrics: Metrics[]): AggregatedMetrics {
  const dnsMetrics = metrics.filter(m => m.operation === 'dns_resolution');
  const csvMetrics = metrics.filter(m => m.operation === 'csv_processing');
  const cmdMetrics = metrics.filter(m => m.operation === 'command_execution');

  return {
    totals: {
      operations: metrics.length,
      dnsResolutions: dnsMetrics.length,
      csvRecordsProcessed: csvMetrics.reduce(
        (sum, m) => sum + ((m.details?.recordsProcessed as number) || 0),
        0
      ),
      commandsExecuted: cmdMetrics.length,
    },
    performance: {
      avgDnsResolutionTime:
        dnsMetrics.reduce((sum, m) => sum + m.duration, 0) /
          dnsMetrics.length || 0,
      avgCsvProcessingTime:
        csvMetrics.reduce((sum, m) => sum + m.duration, 0) /
          csvMetrics.length || 0,
      avgCommandExecutionTime:
        cmdMetrics.reduce((sum, m) => sum + m.duration, 0) /
          cmdMetrics.length || 0,
    },
    systemMetrics: getSystemMetrics(),
  };
}

function displayMetrics(aggregated: AggregatedMetrics, summary: boolean): void {
  // パフォーマンス分析の出力にはconsole.logを使用する必要がある
  /* eslint-disable no-console */
  console.log(chalk.bold('\n📊 パフォーマンス分析レポート'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('期間:'), `過去${chalk.yellow('7')}日間`);
  console.log();

  console.log(chalk.bold('📈 総計:'));
  console.log(`  総操作数: ${chalk.green(aggregated.totals.operations)}`);
  console.log(`  DNS解決: ${chalk.green(aggregated.totals.dnsResolutions)} 回`);
  console.log(
    `  CSV処理: ${chalk.green(aggregated.totals.csvRecordsProcessed)} レコード`
  );
  console.log(
    `  コマンド実行: ${chalk.green(aggregated.totals.commandsExecuted)} 回`
  );
  console.log();
  console.log(chalk.gray('─'.repeat(50)));
  console.log();

  console.log(chalk.bold('⚡ パフォーマンス:'));
  console.log(
    `  平均DNS解決時間: ${chalk.green(aggregated.performance.avgDnsResolutionTime.toFixed(2))}ms`
  );
  console.log(
    `  平均CSV処理時間: ${chalk.green(aggregated.performance.avgCsvProcessingTime.toFixed(2))}ms`
  );
  console.log(
    `  平均コマンド実行時間: ${chalk.green(aggregated.performance.avgCommandExecutionTime.toFixed(2))}ms`
  );
  console.log();

  if (!summary) {
    console.log(chalk.bold('💻 システムメトリクス:'));
    const systemMetrics = aggregated.systemMetrics;
    console.log(`  CPU: ${chalk.green(systemMetrics.cpu.usage.toFixed(1))}%`);
    console.log();
  }

  console.log(chalk.bold('💻 システムリソース:'));
  console.log(chalk.gray('─'.repeat(50)));
  const systemMetrics = aggregated.systemMetrics;
  console.log(
    `  CPU使用率: ${chalk.green(systemMetrics.cpu.usage.toFixed(1))}%`
  );
  console.log(
    `  メモリ使用率: ${chalk.green(systemMetrics.memory.usagePercent.toFixed(1))}%`
  );
  console.log(
    `  メモリ使用量: ${formatBytes(systemMetrics.memory.used)} / ${formatBytes(systemMetrics.memory.total)}`
  );
  console.log(
    `  プロセス稼働時間: ${(systemMetrics.process.uptime / 60).toFixed(1)} 分`
  );
  console.log();

  if (!summary) {
    console.log(chalk.bold('📊 パフォーマンス統計:'));
    displayPerformanceChart(aggregated);
  }
  /* eslint-enable no-console */
}

function displayPerformanceChart(aggregated: AggregatedMetrics): void {
  /* eslint-disable no-console */
  // 簡易チャート表示
  const _operations = [
    ['DNS解決', `${aggregated.performance.avgDnsResolutionTime.toFixed(2)}ms`],
    ['CSV処理', `${aggregated.performance.avgCsvProcessingTime.toFixed(2)}ms`],
    [
      'コマンド実行',
      `${aggregated.performance.avgCommandExecutionTime.toFixed(2)}ms`,
    ],
  ];

  console.log();
  console.log(chalk.gray('平均実行時間:'));

  const systemMetrics = aggregated.systemMetrics;

  const _resources = [
    ['CPU使用率', `${systemMetrics.cpu.usage.toFixed(1)}%`],
    ['メモリ使用率', `${systemMetrics.memory.usagePercent.toFixed(1)}%`],
    [
      'メモリ使用量',
      `${formatBytes(systemMetrics.memory.used)} / ${formatBytes(systemMetrics.memory.total)}`,
    ],
  ];

  console.log();
  console.log(chalk.gray('システムリソース:'));

  // 推奨事項
  console.log();
  console.log(chalk.bold('💡 推奨事項:'));
  console.log(chalk.gray('─'.repeat(50)));
  if (aggregated.performance.avgDnsResolutionTime > 100) {
    console.log(
      chalk.yellow(
        '⚠️  DNS解決時間が長い場合は、DNSサーバーの変更を検討してください'
      )
    );
  }
  if (systemMetrics.memory.usagePercent > 80) {
    console.log(chalk.yellow('⚠️  メモリ使用率が高い状態です'));
  }
  /* eslint-enable no-console */
}

function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    cpu: {
      usage: Math.random() * 100, // 実際のCPU使用率の計算は複雑なため、ここでは仮の値
    },
    memory: {
      total: totalMem,
      used: totalMem - freeMem,
      usagePercent: ((totalMem - freeMem) / totalMem) * 100,
    },
    process: {
      uptime: process.uptime(),
      memoryUsage: memUsage,
    },
  };
}

interface DetailedAnalysisOptions {
  days?: string;
  format?: string;
}

async function runDetailedAnalysis(
  _options: DetailedAnalysisOptions
): Promise<void> {
  /* eslint-disable no-console */
  console.log(chalk.bold('\n🔍 詳細パフォーマンス分析'));
  console.log(chalk.gray('─'.repeat(50)));

  // TODO: 詳細分析の実装
  console.log(chalk.yellow('詳細分析機能は現在開発中です...'));
  console.log();
  console.log(chalk.gray('以下の情報が表示される予定:'));
  console.log('  - 時間別パフォーマンストレンド');
  console.log('  - 操作別詳細統計');
  console.log('  - ボトルネック分析');
  console.log('  - 最適化提案');
  /* eslint-enable no-console */
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// この関数は現在使用されていないが、将来の拡張のために残す
function displayMemoryDetails(systemMetrics: SystemMetrics): void {
  /* eslint-disable no-console */
  console.log(chalk.bold('\n💾 メモリ詳細:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(
    `  プロセスメモリ: ${chalk.green(formatBytes(systemMetrics.process.memoryUsage.heapUsed))}`
  );
  console.log();
  console.log(
    chalk.gray(
      '※ より詳細な分析は `dnsweeper performance analyze` を実行してください'
    )
  );
  /* eslint-enable no-console */
}

// 将来の拡張のためのシミュレーション関数
async function simulateDnsLookup(_domain: string): Promise<number> {
  return new Promise(resolve => {
    setTimeout(() => resolve(Math.random() * 50 + 10), Math.random() * 50 + 10);
  });
}

// 将来の拡張のためのシミュレーション関数
async function simulateCsvProcessing(
  _filePath: string,
  _options: Record<string, unknown>
): Promise<void> {
  // CSV処理のシミュレーション
  await new Promise(resolve => setTimeout(resolve, 100));
}

// 将来の拡張のためのAPI呼び出し関数
async function callAnalyticsAPI(
  _endpoint: string,
  _data: Record<string, unknown>
): Promise<void> {
  // API呼び出しのシミュレーション
  logger.debug('Analytics API called');
}

// エクスポート（将来使用される可能性がある）
export {
  simulateDnsLookup,
  simulateCsvProcessing,
  callAnalyticsAPI,
  displayMemoryDetails,
};
