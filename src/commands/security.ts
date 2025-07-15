/**
 * DNS セキュリティ分析コマンド
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

import chalk from 'chalk';
import { Command } from 'commander';

import { CSVProcessor } from '../lib/csv-processor.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import { DNSSecurityAnalyzer } from '../lib/dns-security-analyzer.js';
import { Logger } from '../lib/logger.js';
import { OutputFormatter } from '../lib/output-formatter.js';

import type { SecurityThreat } from '../lib/dns-security-analyzer.js';

export function createSecurityCommand(): Command {
  const command = new Command('security');

  command
    .description('DNS セキュリティ脅威検出・分析')
    .argument('[domain]', 'アナライズするドメイン')
    .option('-f, --file <file>', 'ドメインリストファイル（1行に1ドメイン）')
    .option('-r, --records <file>', 'DNS レコードファイル（CSV形式）')
    .option('-o, --output <file>', '結果出力ファイル')
    .option('--format <format>', '出力形式', 'table')
    .option('--severity <severity>', '重要度フィルタ', 'all')
    .option('--type <type>', '脅威タイプフィルタ', 'all')
    .option('--confidence <threshold>', '信頼度閾値', '70')
    .option('--real-time', 'リアルタイム監視モード')
    .option('--monitor-interval <ms>', '監視間隔（ミリ秒）', '60000')
    .option('--export-threats', '脅威データをエクスポート')
    .option('--verbose', '詳細ログ出力')
    .option('--dry-run', 'ドライラン（実際の検出のみ）')
    .action(async (domain, options) => {
      const logger = new Logger({ verbose: options.verbose });

      try {
        logger.info('🛡️  DNS セキュリティ脅威検出を開始します...');

        // 分析対象ドメインの準備
        const domains = await prepareDomains(domain, options, logger);

        // DNS レコードの取得
        const records = await getDNSRecords(domains, options, logger);

        // セキュリティ分析の実行
        const analyzer = new DNSSecurityAnalyzer(logger, {
          threatDetection: {
            enabledAnalyzers: [
              'malware',
              'phishing',
              'typosquatting',
              'dga',
              'fastflux',
              'dns_hijacking',
              'cache_poisoning',
              'subdomain_takeover',
            ],
            confidenceThreshold: parseInt(options.confidence),
            realTimeMonitoring: options.realTime,
          },
        });

        // 脅威イベントリスナーの設定
        setupThreatListeners(analyzer, logger, options);

        // 脅威分析の実行
        const threats = await analyzer.analyzeSecurityThreats(domains, records);

        // 結果のフィルタリング
        const filteredThreats = filterThreats(threats, options);

        // 結果の出力
        await outputResults(filteredThreats, options, logger);

        // 統計情報の表示
        displayStatistics(analyzer, filteredThreats, logger);

        // リアルタイム監視モード
        if (options.realTime) {
          await startRealTimeMonitoring(
            analyzer,
            domains,
            records,
            options,
            logger
          );
        }

        // 脅威データのエクスポート
        if (options.exportThreats) {
          await exportThreatData(analyzer, options, logger);
        }

        logger.info('✅ DNS セキュリティ脅威検出が完了しました');
      } catch (error) {
        logger.error(
          '❌ DNS セキュリティ脅威検出でエラーが発生しました:',
          error
        );
        process.exit(1);
      }
    });

  return command;
}

/**
 * 分析対象ドメインの準備
 */
async function prepareDomains(
  domain: string | undefined,
  options: any,
  logger: Logger
): Promise<string[]> {
  const domains: string[] = [];

  if (domain) {
    domains.push(domain);
  }

  if (options.file) {
    if (!existsSync(options.file)) {
      throw new Error(
        `ドメインリストファイルが見つかりません: ${options.file}`
      );
    }

    const fileContent = readFileSync(options.file, 'utf-8');
    const fileDomains = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    domains.push(...fileDomains);
    logger.info(
      `📄 ${fileDomains.length} 個のドメインをファイルから読み込みました`
    );
  }

  if (domains.length === 0) {
    throw new Error(
      '分析するドメインが指定されていません。ドメインを直接指定するか、--file オプションを使用してください。'
    );
  }

  // 重複排除
  const uniqueDomains = [...new Set(domains)];
  logger.info(`🎯 ${uniqueDomains.length} 個のドメインを分析対象とします`);

  return uniqueDomains;
}

/**
 * DNS レコードの取得
 */
async function getDNSRecords(domains: string[], options: any, logger: Logger) {
  if (options.records) {
    // CSV ファイルからレコードを読み込み
    logger.info('📄 CSVファイルからDNSレコードを読み込んでいます...', {
      file: options.records,
    });

    const csvProcessor = new CSVProcessor(logger);
    const csvData = await csvProcessor.processCSV(options.records);

    return csvData.records;
  } else {
    // ドメインからDNSレコードを解決
    logger.info('🔍 DNSレコードを解決しています...', {
      domainCount: domains.length,
    });

    const resolver = new DNSResolver(logger);
    const allRecords = [];

    // 並列処理で高速化
    const resolvePromises = domains.map(async domain => {
      try {
        const records = await resolver.resolveAllRecords(domain);
        return records;
      } catch (error) {
        logger.warn(`⚠️  ${domain} のDNS解決に失敗しました:`, error);
        return [];
      }
    });

    const results = await Promise.all(resolvePromises);
    results.forEach(records => allRecords.push(...records));

    logger.info(`📋 ${allRecords.length} 個のDNSレコードを取得しました`);
    return allRecords;
  }
}

/**
 * 脅威イベントリスナーの設定
 */
function setupThreatListeners(
  analyzer: DNSSecurityAnalyzer,
  logger: Logger,
  options: any
) {
  // 脅威検出イベント
  analyzer.on('threat', (threat: SecurityThreat) => {
    if (options.verbose) {
      logger.info('🚨 脅威を検出しました:', {
        id: threat.id,
        type: threat.type,
        severity: threat.severity,
        domain: threat.domain,
        confidence: threat.confidence,
      });
    }
  });

  // 高優先度脅威イベント
  analyzer.on('high-priority-threat', (threat: SecurityThreat) => {
    const severityColor = getSeverityColor(threat.severity);
    console.log(
      severityColor(`🚨 高優先度脅威: ${threat.domain} (${threat.type})`)
    );
    console.log(chalk.gray(`   説明: ${threat.description}`));
    console.log(chalk.gray(`   信頼度: ${threat.confidence}%`));
    console.log('');
  });

  // 監視サイクルイベント
  analyzer.on('monitoring-cycle', () => {
    if (options.verbose) {
      logger.info('🔄 監視サイクルを実行しました');
    }
  });
}

/**
 * 脅威のフィルタリング
 */
function filterThreats(
  threats: SecurityThreat[],
  options: any
): SecurityThreat[] {
  let filtered = threats;

  // 重要度フィルタ
  if (options.severity !== 'all') {
    filtered = filtered.filter(threat => threat.severity === options.severity);
  }

  // 脅威タイプフィルタ
  if (options.type !== 'all') {
    filtered = filtered.filter(threat => threat.type === options.type);
  }

  return filtered;
}

/**
 * 結果の出力
 */
async function outputResults(
  threats: SecurityThreat[],
  options: any,
  logger: Logger
) {
  if (options.format === 'table') {
    displayTableResults(threats, logger);
  } else if (options.format === 'json') {
    const jsonOutput = JSON.stringify(threats, null, 2);
    if (options.output) {
      writeFileSync(options.output, jsonOutput);
      logger.info(`📄 結果を ${options.output} に保存しました`);
    } else {
      console.log(jsonOutput);
    }
  } else if (options.format === 'detailed') {
    displayDetailedResults(threats, logger);
  } else if (options.format === 'summary') {
    displaySummaryResults(threats, logger);
  }
}

/**
 * テーブル形式での結果表示
 */
function displayTableResults(threats: SecurityThreat[], logger: Logger) {
  if (threats.length === 0) {
    console.log(chalk.green('✅ 脅威は検出されませんでした'));
    return;
  }

  console.log(chalk.blue.bold('\\n🛡️  DNS セキュリティ脅威検出結果\\n'));

  threats.forEach((threat, index) => {
    const severityColor = getSeverityColor(threat.severity);
    const typeIcon = getThreatTypeIcon(threat.type);

    console.log(chalk.white(`${index + 1}. ${typeIcon} ${threat.domain}`));
    console.log(chalk.gray(`   脅威タイプ: ${threat.type}`));
    console.log(
      chalk.gray(`   重要度: ${severityColor(threat.severity.toUpperCase())}`)
    );
    console.log(chalk.gray(`   信頼度: ${threat.confidence}%`));
    console.log(chalk.gray(`   説明: ${threat.description}`));
    console.log(
      chalk.gray(`   検出時刻: ${new Date(threat.timestamp).toLocaleString()}`)
    );
    console.log('');
  });
}

/**
 * 詳細結果の表示
 */
function displayDetailedResults(threats: SecurityThreat[], logger: Logger) {
  if (threats.length === 0) {
    console.log(chalk.green('✅ 脅威は検出されませんでした'));
    return;
  }

  console.log(
    chalk.blue.bold('\\n🛡️  DNS セキュリティ脅威検出結果（詳細）\\n')
  );

  threats.forEach((threat, index) => {
    const severityColor = getSeverityColor(threat.severity);
    const typeIcon = getThreatTypeIcon(threat.type);

    console.log(chalk.white.bold(`${index + 1}. ${typeIcon} ${threat.domain}`));
    console.log(chalk.gray(`ID: ${threat.id}`));
    console.log(chalk.gray(`脅威タイプ: ${threat.type}`));
    console.log(
      chalk.gray(`重要度: ${severityColor(threat.severity.toUpperCase())}`)
    );
    console.log(chalk.gray(`信頼度: ${threat.confidence}%`));
    console.log(chalk.gray(`説明: ${threat.description}`));
    console.log(
      chalk.gray(`検出時刻: ${new Date(threat.timestamp).toLocaleString()}`)
    );

    console.log(chalk.blue('\\n📊 脅威指標:'));
    if (threat.indicators.technicalIndicators.length > 0) {
      console.log(chalk.gray('  技術的指標:'));
      threat.indicators.technicalIndicators.forEach(indicator => {
        console.log(chalk.gray(`    • ${indicator}`));
      });
    }

    if (threat.indicators.behavioralIndicators.length > 0) {
      console.log(chalk.gray('  行動的指標:'));
      threat.indicators.behavioralIndicators.forEach(indicator => {
        console.log(chalk.gray(`    • ${indicator}`));
      });
    }

    if (threat.indicators.reputationIndicators.length > 0) {
      console.log(chalk.gray('  レピュテーション指標:'));
      threat.indicators.reputationIndicators.forEach(indicator => {
        console.log(chalk.gray(`    • ${indicator}`));
      });
    }

    console.log(chalk.green('\\n🛠️  対策:'));
    console.log(chalk.gray('  即座の対策:'));
    threat.mitigation.immediateActions.forEach(action => {
      console.log(chalk.gray(`    • ${action}`));
    });

    console.log(chalk.gray('  長期的対策:'));
    threat.mitigation.longTermActions.forEach(action => {
      console.log(chalk.gray(`    • ${action}`));
    });

    console.log(chalk.gray('  予防策:'));
    threat.mitigation.preventionMeasures.forEach(measure => {
      console.log(chalk.gray(`    • ${measure}`));
    });

    console.log(chalk.magenta('\\n🔍 証拠:'));
    console.log(
      chalk.gray(`  関連DNSレコード: ${threat.evidence.dnsRecords.length}件`)
    );
    console.log(
      chalk.gray(
        `  IP レピュテーション: ${threat.evidence.networkAnalysis.ipReputationScore}/100`
      )
    );
    console.log(
      chalk.gray(
        `  ドメイン年数: ${threat.evidence.networkAnalysis.domainAge}日`
      )
    );
    console.log(
      chalk.gray(
        `  証明書状態: ${threat.evidence.networkAnalysis.certificateStatus}`
      )
    );

    console.log('\\n' + '='.repeat(80) + '\\n');
  });
}

/**
 * サマリー結果の表示
 */
function displaySummaryResults(threats: SecurityThreat[], logger: Logger) {
  if (threats.length === 0) {
    console.log(chalk.green('✅ 脅威は検出されませんでした'));
    return;
  }

  console.log(chalk.blue.bold('\\n🛡️  DNS セキュリティ脅威検出サマリー\\n'));

  // 重要度別集計
  const severityCount = threats.reduce(
    (acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(chalk.white('重要度別脅威数:'));
  Object.entries(severityCount).forEach(([severity, count]) => {
    const color = getSeverityColor(severity);
    console.log(chalk.gray(`  ${color(severity.toUpperCase())}: ${count}件`));
  });

  // タイプ別集計
  const typeCount = threats.reduce(
    (acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(chalk.white('\\n脅威タイプ別:'));
  Object.entries(typeCount).forEach(([type, count]) => {
    const icon = getThreatTypeIcon(type);
    console.log(chalk.gray(`  ${icon} ${type}: ${count}件`));
  });

  // 平均信頼度
  const avgConfidence =
    threats.reduce((sum, threat) => sum + threat.confidence, 0) /
    threats.length;
  console.log(chalk.white(`\\n平均信頼度: ${avgConfidence.toFixed(1)}%`));

  // 最新の脅威
  const recentThreats = threats
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  console.log(chalk.white('\\n最新の脅威:'));
  recentThreats.forEach((threat, index) => {
    const severityColor = getSeverityColor(threat.severity);
    const typeIcon = getThreatTypeIcon(threat.type);
    console.log(
      chalk.gray(
        `  ${index + 1}. ${typeIcon} ${threat.domain} (${severityColor(threat.severity)})`
      )
    );
  });
}

/**
 * 統計情報の表示
 */
function displayStatistics(
  analyzer: DNSSecurityAnalyzer,
  threats: SecurityThreat[],
  logger: Logger
) {
  const stats = analyzer.getThreatStatistics();

  console.log(chalk.blue.bold('\\n📊 脅威統計情報'));
  console.log(chalk.gray(`総脅威数: ${stats.totalThreats}`));
  console.log(chalk.gray(`今回検出: ${threats.length}`));
  console.log(chalk.gray(`最近24時間: ${stats.recentThreats.length}`));

  if (stats.totalThreats > 0) {
    console.log(chalk.gray('\\n脅威タイプ分布:'));
    Object.entries(stats.threatsByType).forEach(([type, count]) => {
      const percentage = ((count / stats.totalThreats) * 100).toFixed(1);
      const icon = getThreatTypeIcon(type);
      console.log(chalk.gray(`  ${icon} ${type}: ${count}件 (${percentage}%)`));
    });
  }
}

/**
 * リアルタイム監視の開始
 */
async function startRealTimeMonitoring(
  analyzer: DNSSecurityAnalyzer,
  domains: string[],
  records: any[],
  options: any,
  logger: Logger
) {
  console.log(chalk.blue.bold('\\n🔄 リアルタイム監視を開始します...'));
  console.log(chalk.gray('監視を停止するには Ctrl+C を押してください\\n'));

  analyzer.startRealTimeMonitoring(parseInt(options.monitorInterval));

  // 定期的な再分析
  const monitoringInterval = setInterval(async () => {
    try {
      const newThreats = await analyzer.analyzeSecurityThreats(
        domains,
        records
      );
      const filteredThreats = filterThreats(newThreats, options);

      if (filteredThreats.length > 0) {
        console.log(
          chalk.yellow(
            `\\n🚨 新しい脅威を検出しました: ${filteredThreats.length}件`
          )
        );
        displaySummaryResults(filteredThreats, logger);
      }
    } catch (error) {
      logger.error('監視中にエラーが発生しました:', error);
    }
  }, parseInt(options.monitorInterval));

  // Ctrl+C でのプログラム終了処理
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\\n\\n🛑 監視を停止しています...'));
    clearInterval(monitoringInterval);
    analyzer.stopRealTimeMonitoring();
    console.log(chalk.green('✅ 監視を停止しました'));
    process.exit(0);
  });

  // 無限ループで監視を継続
  return new Promise(() => {});
}

/**
 * 脅威データのエクスポート
 */
async function exportThreatData(
  analyzer: DNSSecurityAnalyzer,
  options: any,
  logger: Logger
) {
  logger.info('📤 脅威データをエクスポートしています...');

  const threatDatabase = analyzer.getThreatDatabase();
  const exportData = {
    exportTime: new Date().toISOString(),
    totalDomains: threatDatabase.size,
    threats: Object.fromEntries(threatDatabase.entries()),
    statistics: analyzer.getThreatStatistics(),
  };

  const exportFile = options.output
    ? options.output.replace(/\\.[^.]+$/, '_threats.json')
    : `threats_export_${Date.now()}.json`;

  writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  logger.info(`📄 脅威データを ${exportFile} にエクスポートしました`);
}

/**
 * 重要度の色を取得
 */
function getSeverityColor(severity: string) {
  switch (severity) {
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
 * 脅威タイプのアイコンを取得
 */
function getThreatTypeIcon(type: string) {
  switch (type) {
    case 'malware':
      return '🦠';
    case 'phishing':
      return '🎣';
    case 'typosquatting':
      return '🔤';
    case 'dga':
      return '🤖';
    case 'fastflux':
      return '⚡';
    case 'dns_hijacking':
      return '🔓';
    case 'cache_poisoning':
      return '☠️';
    case 'subdomain_takeover':
      return '🔗';
    default:
      return '⚠️';
  }
}
