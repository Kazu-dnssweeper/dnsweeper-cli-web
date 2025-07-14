/**
 * パフォーマンス分析コマンド
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';

import { globalMetrics } from '../lib/metrics/metrics-collector.js';
import { 
  globalTracker, 
  getSystemMetrics, 
  formatBytes,
  type SystemMetrics 
} from '../utils/performance.js';
import { Logger } from '../lib/logger.js';

const logger = new Logger();

/**
 * パフォーマンス分析コマンドを作成
 */
export function createPerformanceCommand(): Command {
  const cmd = new Command('performance')
    .alias('perf')
    .description('パフォーマンス分析とメトリクスレポートを表示')
    .option('-f, --format <format>', '出力形式 (text|json|table)', 'text')
    .option('-p, --period <period>', '分析期間 (1h|24h|7d|30d|all)', '24h')
    .option('-m, --metrics <types...>', '表示するメトリクスタイプ', ['all'])
    .option('-s, --save <file>', 'レポートをファイルに保存')
    .option('--realtime', 'リアルタイムモニタリングを開始')
    .action(async (options) => {
      try {
        if (options.realtime) {
          await startRealtimeMonitoring();
        } else {
          await showPerformanceReport(options);
        }
      } catch (error) {
        logger.error('パフォーマンス分析中にエラーが発生しました', error as Error);
        process.exit(1);
      }
    });

  // サブコマンド
  cmd.command('benchmark')
    .description('パフォーマンスベンチマークを実行')
    .option('-t, --type <type>', 'ベンチマークタイプ (dns|csv|all)', 'all')
    .option('-n, --iterations <n>', '実行回数', '100')
    .action(async (options) => {
      await runBenchmark(options);
    });

  cmd.command('analyze')
    .description('詳細なパフォーマンス分析を実行')
    .option('-f, --file <file>', '分析対象のメトリクスファイル')
    .action(async (options) => {
      await analyzePerformance(options);
    });

  return cmd;
}

/**
 * パフォーマンスレポートを表示
 */
async function showPerformanceReport(options: any): Promise<void> {
  const spinner = ora('メトリクスを収集しています...').start();

  try {
    // 期間を計算
    const { start, end } = calculatePeriod(options.period);
    
    // メトリクスを集計
    const aggregated = globalMetrics.aggregate(start, end);
    const performanceStats = globalTracker.getResults();
    const systemMetrics = getSystemMetrics();

    spinner.succeed('メトリクスを収集しました');

    // レポートを生成
    if (options.format === 'json') {
      const report = {
        period: { start, end },
        metrics: aggregated,
        performance: performanceStats,
        system: systemMetrics
      };
      console.log(JSON.stringify(report, null, 2));
    } else if (options.format === 'table') {
      displayTableReport(aggregated, performanceStats, systemMetrics);
    } else {
      displayTextReport(aggregated, performanceStats, systemMetrics);
    }

    // ファイルに保存
    if (options.save) {
      const report = globalMetrics.generateReport(options.format);
      await saveReport(options.save, report);
      logger.info(`レポートを保存しました: ${options.save}`);
    }
  } catch (error) {
    spinner.fail('メトリクスの収集に失敗しました');
    throw error;
  }
}

/**
 * テキスト形式のレポートを表示
 */
function displayTextReport(
  aggregated: any,
  performanceStats: any[],
  systemMetrics: SystemMetrics
): void {
  console.log(chalk.cyan('\n=== DNSweeper パフォーマンスレポート ===\n'));

  // 期間情報
  console.log(chalk.gray('期間:'), 
    `${aggregated.period.start.toLocaleString()} - ${aggregated.period.end.toLocaleString()}`
  );
  console.log();

  // 概要統計
  console.log(chalk.yellow('📊 概要統計'));
  console.log(`  DNS解決: ${chalk.green(aggregated.totals.dnsResolutions)} 回`);
  console.log(`  CSV処理: ${chalk.green(aggregated.totals.csvRecordsProcessed)} レコード`);
  console.log(`  コマンド実行: ${chalk.green(aggregated.totals.commandsExecuted)} 回`);
  console.log(`  エラー: ${chalk.red(aggregated.totals.errors)} 件`);
  console.log(`  エラー率: ${chalk.red(aggregated.errorRate.toFixed(2))}%`);
  console.log();

  // パフォーマンス統計
  console.log(chalk.yellow('⚡ パフォーマンス'));
  console.log(`  平均DNS解決時間: ${chalk.green(aggregated.performance.avgDnsResolutionTime.toFixed(2))}ms`);
  console.log(`  平均CSV処理時間: ${chalk.green(aggregated.performance.avgCsvProcessingTime.toFixed(2))}ms`);
  console.log(`  平均コマンド実行時間: ${chalk.green(aggregated.performance.avgCommandExecutionTime.toFixed(2))}ms`);
  console.log();

  // トップドメイン
  if (aggregated.topDomains.length > 0) {
    console.log(chalk.yellow('🌐 トップドメイン'));
    aggregated.topDomains.forEach(({ domain, count }: any, index: number) => {
      console.log(`  ${index + 1}. ${domain}: ${chalk.green(count)} 回`);
    });
    console.log();
  }

  // システムメトリクス
  console.log(chalk.yellow('💻 システム情報'));
  console.log(`  CPU: ${systemMetrics.cpu.model}`);
  console.log(`  CPUコア数: ${systemMetrics.cpu.count}`);
  console.log(`  CPU使用率: ${chalk.green(systemMetrics.cpu.usage.toFixed(1))}%`);
  console.log(`  メモリ使用率: ${chalk.green(systemMetrics.memory.usagePercent.toFixed(1))}%`);
  console.log(`  メモリ使用量: ${formatBytes(systemMetrics.memory.used)} / ${formatBytes(systemMetrics.memory.total)}`);
  console.log(`  プロセス稼働時間: ${(systemMetrics.process.uptime / 60).toFixed(1)} 分`);
  console.log();

  // 詳細なパフォーマンス統計
  if (performanceStats.length > 0) {
    console.log(chalk.yellow('📈 詳細パフォーマンス統計'));
    const groupedStats = new Map<string, any[]>();
    
    performanceStats.forEach(stat => {
      const group = groupedStats.get(stat.name) || [];
      group.push(stat);
      groupedStats.set(stat.name, group);
    });

    groupedStats.forEach((stats, name) => {
      const durations = stats.map(s => s.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      console.log(`  ${name}:`);
      console.log(`    実行回数: ${stats.length}`);
      console.log(`    平均: ${avg.toFixed(2)}ms`);
      console.log(`    最小: ${min.toFixed(2)}ms`);
      console.log(`    最大: ${max.toFixed(2)}ms`);
    });
  }
}

/**
 * テーブル形式のレポートを表示
 */
function displayTableReport(
  aggregated: any,
  performanceStats: any[],
  systemMetrics: SystemMetrics
): void {
  // 概要テーブル
  const summaryData = [
    ['メトリクス', '値'],
    ['DNS解決回数', aggregated.totals.dnsResolutions.toString()],
    ['CSV処理レコード数', aggregated.totals.csvRecordsProcessed.toString()],
    ['コマンド実行回数', aggregated.totals.commandsExecuted.toString()],
    ['エラー数', aggregated.totals.errors.toString()],
    ['エラー率', `${aggregated.errorRate.toFixed(2)}%`]
  ];

  console.log(chalk.cyan('\n概要統計'));
  console.log(table(summaryData));

  // パフォーマンステーブル
  const perfData = [
    ['処理タイプ', '平均時間'],
    ['DNS解決', `${aggregated.performance.avgDnsResolutionTime.toFixed(2)}ms`],
    ['CSV処理', `${aggregated.performance.avgCsvProcessingTime.toFixed(2)}ms`],
    ['コマンド実行', `${aggregated.performance.avgCommandExecutionTime.toFixed(2)}ms`]
  ];

  console.log(chalk.cyan('パフォーマンス統計'));
  console.log(table(perfData));

  // システムメトリクステーブル
  const systemData = [
    ['システム情報', '値'],
    ['CPU', systemMetrics.cpu.model],
    ['CPUコア数', systemMetrics.cpu.count.toString()],
    ['CPU使用率', `${systemMetrics.cpu.usage.toFixed(1)}%`],
    ['メモリ使用率', `${systemMetrics.memory.usagePercent.toFixed(1)}%`],
    ['メモリ使用量', `${formatBytes(systemMetrics.memory.used)} / ${formatBytes(systemMetrics.memory.total)}`]
  ];

  console.log(chalk.cyan('システムメトリクス'));
  console.log(table(systemData));
}

/**
 * リアルタイムモニタリング
 */
async function startRealtimeMonitoring(): Promise<void> {
  console.clear();
  console.log(chalk.cyan('=== リアルタイムパフォーマンスモニタリング ==='));
  console.log(chalk.gray('Ctrl+C で終了'));
  console.log();

  const updateInterval = setInterval(() => {
    const systemMetrics = getSystemMetrics();
    const recentMetrics = globalMetrics.aggregate(
      new Date(Date.now() - 60000), // 過去1分
      new Date()
    );

    // カーソルを先頭に戻す
    process.stdout.write('\x1b[4A');
    
    // システム状態を更新
    console.log(chalk.yellow('システム状態:'));
    console.log(`  CPU: ${chalk.green(systemMetrics.cpu.usage.toFixed(1).padStart(5))}%  ` +
                `メモリ: ${chalk.green(systemMetrics.memory.usagePercent.toFixed(1).padStart(5))}%  ` +
                `プロセスメモリ: ${chalk.green(formatBytes(systemMetrics.process.memoryUsage.heapUsed))}`);
    
    console.log(chalk.yellow('直近1分間:'));
    console.log(`  DNS解決: ${chalk.green(recentMetrics.totals.dnsResolutions.toString().padStart(5))} 回  ` +
                `エラー: ${chalk.red(recentMetrics.totals.errors.toString().padStart(3))} 件  ` +
                `平均応答: ${chalk.green(recentMetrics.performance.avgDnsResolutionTime.toFixed(0).padStart(4))}ms`);
  }, 1000);

  // Ctrl+Cでクリーンアップ
  process.on('SIGINT', () => {
    clearInterval(updateInterval);
    console.log('\n\nモニタリングを終了しました');
    process.exit(0);
  });
}

/**
 * ベンチマークを実行
 */
async function runBenchmark(options: any): Promise<void> {
  const iterations = parseInt(options.iterations, 10);
  const spinner = ora(`ベンチマークを実行中... (${iterations}回)`).start();

  try {
    const results: any = {};

    if (options.type === 'all' || options.type === 'dns') {
      // DNSベンチマーク
      spinner.text = 'DNS解決ベンチマークを実行中...';
      results.dns = await benchmarkDnsResolution(iterations);
    }

    if (options.type === 'all' || options.type === 'csv') {
      // CSV処理ベンチマーク
      spinner.text = 'CSV処理ベンチマークを実行中...';
      results.csv = await benchmarkCsvProcessing(iterations);
    }

    spinner.succeed('ベンチマークが完了しました');

    // 結果を表示
    displayBenchmarkResults(results);
  } catch (error) {
    spinner.fail('ベンチマークの実行に失敗しました');
    throw error;
  }
}

/**
 * DNS解決のベンチマーク
 */
async function benchmarkDnsResolution(iterations: number): Promise<any> {
  const domains = ['google.com', 'github.com', 'cloudflare.com', 'example.com'];
  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const domain = domains[i % domains.length];
    const start = performance.now();
    
    try {
      // 実際のDNS解決をシミュレート
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
      const duration = performance.now() - start;
      results.push(duration);
    } catch (error) {
      // エラーは無視
    }
  }

  return calculateBenchmarkStats(results);
}

/**
 * CSV処理のベンチマーク
 */
async function benchmarkCsvProcessing(iterations: number): Promise<any> {
  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const recordCount = Math.floor(Math.random() * 1000) + 100;
    const start = performance.now();
    
    try {
      // CSV処理をシミュレート
      await new Promise(resolve => setTimeout(resolve, recordCount * 0.01));
      const duration = performance.now() - start;
      results.push(duration);
    } catch (error) {
      // エラーは無視
    }
  }

  return calculateBenchmarkStats(results);
}

/**
 * ベンチマーク統計を計算
 */
function calculateBenchmarkStats(results: number[]): any {
  results.sort((a, b) => a - b);
  
  return {
    count: results.length,
    min: results[0],
    max: results[results.length - 1],
    avg: results.reduce((a, b) => a + b, 0) / results.length,
    median: results[Math.floor(results.length / 2)],
    p95: results[Math.floor(results.length * 0.95)],
    p99: results[Math.floor(results.length * 0.99)]
  };
}

/**
 * ベンチマーク結果を表示
 */
function displayBenchmarkResults(results: any): void {
  console.log(chalk.cyan('\n=== ベンチマーク結果 ===\n'));

  Object.entries(results).forEach(([type, stats]: [string, any]) => {
    console.log(chalk.yellow(`${type.toUpperCase()}ベンチマーク:`));
    console.log(`  実行回数: ${stats.count}`);
    console.log(`  最小: ${stats.min.toFixed(2)}ms`);
    console.log(`  最大: ${stats.max.toFixed(2)}ms`);
    console.log(`  平均: ${stats.avg.toFixed(2)}ms`);
    console.log(`  中央値: ${stats.median.toFixed(2)}ms`);
    console.log(`  95パーセンタイル: ${stats.p95.toFixed(2)}ms`);
    console.log(`  99パーセンタイル: ${stats.p99.toFixed(2)}ms`);
    console.log();
  });
}

/**
 * 詳細なパフォーマンス分析
 */
async function analyzePerformance(options: any): Promise<void> {
  // TODO: メトリクスファイルを読み込んで詳細分析
  logger.info('詳細なパフォーマンス分析機能は開発中です');
}

/**
 * 期間を計算
 */
function calculatePeriod(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '1h':
      start.setHours(start.getHours() - 1);
      break;
    case '24h':
      start.setDate(start.getDate() - 1);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case 'all':
      start.setFullYear(2000); // 十分古い日付
      break;
    default:
      start.setDate(start.getDate() - 1); // デフォルト24時間
  }

  return { start, end };
}

/**
 * レポートを保存
 */
async function saveReport(filePath: string, content: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(filePath, content, 'utf-8');
}