/**
 * AI駆動DNS最適化コマンド
 */

import { readFileSync, existsSync } from 'fs';

import chalk from 'chalk';
import { Command } from 'commander';

import { AIDNSOptimizer } from '../lib/ai-dns-optimizer.js';
import { CSVProcessor } from '../lib/csv-processor.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import { Logger } from '../lib/logger.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { globalPerformanceMonitor } from '../lib/performance-monitor.js';

import type {
  OptimizationContext,
  BusinessContext,
} from '../lib/ai-dns-optimizer.js';

export function createOptimizeCommand(): Command {
  const command = new Command('optimize');

  command
    .description('AI駆動DNS最適化分析と提案生成')
    .argument('<domain>', 'アナライズするドメイン')
    .option('-f, --file <file>', 'DNS レコードファイル（CSV形式）')
    .option('-t, --traffic-file <file>', 'トラフィックパターンファイル')
    .option(
      '-b, --business-context <file>',
      'ビジネスコンテキストファイル（JSON）'
    )
    .option('-o, --output <file>', '結果出力ファイル')
    .option('--format <format>', '出力形式', 'table')
    .option('--priority <priority>', '優先度フィルタ', 'all')
    .option('--type <type>', '提案タイプフィルタ', 'all')
    .option('--industry <industry>', '業界指定', 'technology')
    .option('--scale <scale>', '企業規模', 'medium')
    .option('--budget <budget>', '予算規模', 'medium')
    .option(
      '--priorities <priorities>',
      'ビジネス優先度（カンマ区切り）',
      'performance,security,reliability,cost'
    )
    .option('--parallel <number>', '並列処理数', '10')
    .option('--timeout <ms>', 'タイムアウト（ミリ秒）', '5000')
    .option('--verbose', '詳細ログ出力')
    .option('--dry-run', 'ドライラン（実際の変更は行わない）')
    .action(async (domain, options) => {
      const logger = new Logger({ verbose: options.verbose });

      try {
        logger.info('🤖 AI駆動DNS最適化分析を開始します...', { domain });

        // 最適化コンテキストの構築
        const context = await buildOptimizationContext(domain, options, logger);

        // AI最適化分析の実行
        const optimizer = new AIDNSOptimizer(logger);
        const suggestions = await optimizer.analyzeAndOptimize(context);

        // 結果のフィルタリング
        const filteredSuggestions = filterSuggestions(suggestions, options);

        // 結果の出力
        await outputResults(filteredSuggestions, options, logger);

        // サマリーの表示
        displaySummary(filteredSuggestions, logger);

        logger.info('✅ AI最適化分析が完了しました');
      } catch (error) {
        logger.error('❌ AI最適化分析でエラーが発生しました:', 
          error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  return command;
}

/**
 * 最適化コンテキストの構築
 */
async function buildOptimizationContext(
  domain: string,
  options: any,
  logger: Logger
): Promise<OptimizationContext> {
  // DNSレコードの取得
  const records = await getDNSRecords(domain, options, logger);

  // パフォーマンスメトリクスの取得
  const performance = globalPerformanceMonitor
    .getMetrics()
    .filter(
      m => m.metadata?.domain === domain || 
        (typeof m.metadata?.domain === 'string' && m.metadata.domain.endsWith(domain))
    );

  // トラフィックパターンの取得
  const trafficPatterns = options.trafficFile
    ? await loadTrafficPatterns(options.trafficFile, logger)
    : [];

  // ビジネスコンテキストの構築
  const businessContext = buildBusinessContext(options, logger);

  return {
    domain,
    records,
    performance,
    trafficPatterns,
    businessContext,
  };
}

/**
 * DNSレコードの取得
 */
async function getDNSRecords(domain: string, options: any, logger: Logger) {
  if (options.file) {
    // CSVファイルからレコードを読み込み
    logger.info('📄 CSVファイルからDNSレコードを読み込んでいます...', {
      file: options.file,
    });

    const csvProcessor = new CSVProcessor({});
    const csvData = await csvProcessor.parseAuto(options.file);

    return csvData.records;
  } else {
    // ドメインからDNSレコードを解決
    logger.info('🔍 DNSレコードを解決しています...', { domain });

    const resolver = new DNSResolver({});
    const measure = globalPerformanceMonitor.startMeasurement(
      'dns',
      'bulk_resolve'
    );

    try {
      const result = await resolver.resolve(domain, 'A');
      const records = result.records;
      measure();
      return records;
    } catch (error) {
      measure();
      logger.error('DNS解決に失敗しました', 
        error instanceof Error ? error : new Error(String(error)),
        { domain });
      throw error;
    }
  }
}

/**
 * トラフィックパターンの読み込み
 */
async function loadTrafficPatterns(filePath: string, logger: Logger) {
  if (!existsSync(filePath)) {
    logger.warn('トラフィックパターンファイルが見つかりません:', filePath);
    return [];
  }

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const patterns = JSON.parse(fileContent);

    logger.info('📊 トラフィックパターンを読み込みました', {
      patterns: patterns.length,
    });

    return patterns;
  } catch (error) {
    logger.error('トラフィックパターンファイルの読み込みエラー:', 
      error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * ビジネスコンテキストの構築
 */
function buildBusinessContext(options: any, logger: Logger): BusinessContext {
  if (options.businessContext) {
    try {
      const fileContent = readFileSync(options.businessContext, 'utf-8');
      const context = JSON.parse(fileContent);

      logger.info('📋 ビジネスコンテキストファイルを読み込みました');
      return context;
    } catch (error) {
      logger.warn('ビジネスコンテキストファイルの読み込みエラー:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // コマンドラインオプションからビジネスコンテキストを構築
  const priorities = options.priorities.split(',').map((p: string) => p.trim());

  return {
    industry: options.industry,
    scale: options.scale,
    compliance: [], // デフォルトは空
    budget: options.budget,
    priorities,
  };
}

/**
 * 提案のフィルタリング
 */
function filterSuggestions(suggestions: any[], options: any) {
  let filtered = suggestions;

  // 優先度フィルタ
  if (options.priority !== 'all') {
    filtered = filtered.filter(s => s.priority === options.priority);
  }

  // タイプフィルタ
  if (options.type !== 'all') {
    filtered = filtered.filter(s => s.type === options.type);
  }

  return filtered;
}

/**
 * 結果の出力
 */
async function outputResults(suggestions: any[], options: any, logger: Logger) {
  const formatter = new OutputFormatter({});

  if (options.format === 'table') {
    displayTableResults(suggestions, logger);
  } else if (options.format === 'json') {
    const jsonOutput = JSON.stringify(suggestions, null, 2);
    if (options.output) {
      await formatter.writeToFile(options.output, jsonOutput);
    } else {
      console.log(jsonOutput);
    }
  } else if (options.format === 'detailed') {
    displayDetailedResults(suggestions, logger);
  }
}

/**
 * テーブル形式での結果表示
 */
function displayTableResults(suggestions: any[], logger: Logger) {
  if (suggestions.length === 0) {
    console.log(chalk.yellow('📋 最適化提案は見つかりませんでした'));
    return;
  }

  console.log(chalk.blue.bold('\\n🤖 AI駆動DNS最適化提案\\n'));

  suggestions.forEach((suggestion, index) => {
    const priorityColor = getPriorityColor(suggestion.priority);
    const typeIcon = getTypeIcon(suggestion.type);

    console.log(chalk.white(`${index + 1}. ${typeIcon} ${suggestion.title}`));
    console.log(
      chalk.gray(
        `   優先度: ${priorityColor(suggestion.priority.toUpperCase())}`
      )
    );
    console.log(chalk.gray(`   分類: ${suggestion.type}`));
    console.log(
      chalk.gray(
        `   影響: パフォーマンス+${suggestion.impact.performance}, セキュリティ+${suggestion.impact.security}`
      )
    );
    console.log(
      chalk.gray(
        `   難易度: ${suggestion.implementation.difficulty} (${suggestion.implementation.estimatedTime})`
      )
    );
    console.log(chalk.gray(`   説明: ${suggestion.description}`));
    console.log(
      chalk.gray(
        `   対象: ${suggestion.affectedRecords.slice(0, 3).join(', ')}${suggestion.affectedRecords.length > 3 ? '...' : ''}`
      )
    );
    console.log('');
  });
}

/**
 * 詳細結果の表示
 */
function displayDetailedResults(suggestions: any[], logger: Logger) {
  if (suggestions.length === 0) {
    console.log(chalk.yellow('📋 最適化提案は見つかりませんでした'));
    return;
  }

  console.log(chalk.blue.bold('\\n🤖 AI駆動DNS最適化提案（詳細）\\n'));

  suggestions.forEach((suggestion, index) => {
    const priorityColor = getPriorityColor(suggestion.priority);
    const typeIcon = getTypeIcon(suggestion.type);

    console.log(
      chalk.white.bold(`${index + 1}. ${typeIcon} ${suggestion.title}`)
    );
    console.log(chalk.gray(`ID: ${suggestion.id}`));
    console.log(
      chalk.gray(`優先度: ${priorityColor(suggestion.priority.toUpperCase())}`)
    );
    console.log(chalk.gray(`分類: ${suggestion.type}`));
    console.log(chalk.gray(`説明: ${suggestion.description}`));

    console.log(chalk.blue('\\n📊 影響度分析:'));
    console.log(
      chalk.gray(`  パフォーマンス: ${suggestion.impact.performance}/10`)
    );
    console.log(chalk.gray(`  セキュリティ: ${suggestion.impact.security}/10`));
    console.log(chalk.gray(`  信頼性: ${suggestion.impact.reliability}/10`));
    console.log(chalk.gray(`  コスト: ${suggestion.impact.cost}/10`));

    console.log(chalk.green('\\n🔧 実装ガイド:'));
    console.log(
      chalk.gray(`  難易度: ${suggestion.implementation.difficulty}`)
    );
    console.log(
      chalk.gray(`  予想時間: ${suggestion.implementation.estimatedTime}`)
    );

    console.log(chalk.gray('  手順:'));
    suggestion.implementation.steps.forEach((step: string, i: number) => {
      console.log(chalk.gray(`    ${i + 1}. ${step}`));
    });

    if (suggestion.implementation.risks.length > 0) {
      console.log(chalk.yellow('  ⚠️  リスク:'));
      suggestion.implementation.risks.forEach((risk: string) => {
        console.log(chalk.gray(`    • ${risk}`));
      });
    }

    console.log(chalk.cyan('\\n🎯 対象レコード:'));
    suggestion.affectedRecords.forEach((record: string) => {
      console.log(chalk.gray(`  • ${record}`));
    });

    console.log(chalk.magenta('\\n📋 根拠:'));
    if (suggestion.evidence.metrics.length > 0) {
      console.log(
        chalk.gray(`  メトリクス: ${suggestion.evidence.metrics.length}件`)
      );
    }
    if (suggestion.evidence.riskFactors.length > 0) {
      console.log(
        chalk.gray(
          `  リスク要因: ${suggestion.evidence.riskFactors.join(', ')}`
        )
      );
    }

    console.log('\\n' + '='.repeat(80) + '\\n');
  });
}

/**
 * サマリーの表示
 */
function displaySummary(suggestions: any[], logger: Logger) {
  if (suggestions.length === 0) return;

  console.log(chalk.blue.bold('📈 最適化提案サマリー'));
  console.log(chalk.gray(`総提案数: ${suggestions.length}`));

  // 優先度別集計
  const priorityCount = suggestions.reduce(
    (acc, s) => {
      acc[s.priority] = (acc[s.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  Object.entries(priorityCount).forEach(([priority, count]) => {
    const color = getPriorityColor(priority);
    console.log(chalk.gray(`  ${color(priority.toUpperCase())}: ${count}件`));
  });

  // タイプ別集計
  const typeCount = suggestions.reduce(
    (acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(chalk.gray('\\n分類別:'));
  Object.entries(typeCount).forEach(([type, count]) => {
    const icon = getTypeIcon(type);
    console.log(chalk.gray(`  ${icon} ${type}: ${count}件`));
  });

  // 総合影響度
  const totalImpact = suggestions.reduce(
    (acc, s) => ({
      performance: acc.performance + s.impact.performance,
      security: acc.security + s.impact.security,
      reliability: acc.reliability + s.impact.reliability,
      cost: acc.cost + s.impact.cost,
    }),
    { performance: 0, security: 0, reliability: 0, cost: 0 }
  );

  console.log(chalk.gray('\\n期待される総合効果:'));
  console.log(chalk.gray(`  パフォーマンス向上: +${totalImpact.performance}`));
  console.log(chalk.gray(`  セキュリティ向上: +${totalImpact.security}`));
  console.log(chalk.gray(`  信頼性向上: +${totalImpact.reliability}`));
  console.log(
    chalk.gray(
      `  コスト効果: ${totalImpact.cost >= 0 ? '+' : ''}${totalImpact.cost}`
    )
  );
}

/**
 * 優先度の色を取得
 */
function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical':
      return chalk.red.bold;
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
      return chalk.green;
    default:
      return chalk.gray;
  }
}

/**
 * タイプのアイコンを取得
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'performance':
      return '⚡';
    case 'security':
      return '🔒';
    case 'reliability':
      return '🛡️';
    case 'cost':
      return '💰';
    case 'best_practice':
      return '✨';
    default:
      return '📋';
  }
}
