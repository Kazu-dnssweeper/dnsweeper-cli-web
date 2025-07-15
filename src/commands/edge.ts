import chalk from 'chalk';
import { Command } from 'commander';

import EdgeComputingDNSManager from '../lib/edge-computing-dns-manager.js';
import { Logger } from '../lib/logger.js';
import {
  OutputFormatter,
  type AnalysisResult,
} from '../lib/output-formatter.js';

import type { EdgeDNSQuery } from '../lib/edge-computing-dns-manager.js';
import type { DNSRecordType } from '../types/index.js';

const logger = new Logger();

export const edgeCommand = new Command('edge')
  .description('エッジコンピューティングDNS管理')
  .option('-v, --verbose', '詳細な出力を有効にする', false)
  .option('-f, --format <type>', '出力形式 (json/table/text)', 'table')
  .option('--location <id>', '特定のエッジロケーションを使用', '')
  .option('--disable-ai', 'AI予測機能を無効にする', false)
  .option('--disable-prefetch', 'プリフェッチを無効にする', false);

// エッジロケーション一覧表示
edgeCommand
  .command('locations')
  .description('利用可能なエッジロケーションを表示')
  .option('-s, --stats', '統計情報を含める', false)
  .action(async options => {
    try {
      const manager = new EdgeComputingDNSManager();

      logger.info('エッジロケーション情報を取得中...');

      const locations = manager.getEdgeLocationStats();
      const formatter = new OutputFormatter();

      if (options.stats) {
        const globalMetrics = manager.getGlobalMetrics();
        const aiStats = manager.getAIPredictionStats();

        console.log(chalk.bold('\n🌐 グローバルエッジネットワーク統計'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`総クエリ数: ${chalk.yellow(globalMetrics.totalQueries)}`);
        console.log(
          `平均応答時間: ${chalk.yellow(globalMetrics.averageResponseTime.toFixed(2))}ms`
        );
        console.log(
          `エッジ利用率: ${chalk.yellow((globalMetrics.edgeUtilization * 100).toFixed(1))}%`
        );
        console.log(
          `AI予測精度: ${chalk.yellow((aiStats.accuracy * 100).toFixed(1))}%`
        );
        console.log();
      }

      console.log(chalk.bold('🗺️ エッジロケーション一覧'));
      console.log(chalk.gray('─'.repeat(50)));

      const tableData = locations.map(location => ({
        ID: location.id,
        地域: location.region,
        都市: `${location.city}, ${location.country}`,
        容量: location.capacity,
        負荷: location.load,
        利用率: `${(location.utilization * 100).toFixed(1)}%`,
        遅延: `${location.latency}ms`,
        状態: location.isActive
          ? chalk.green('✓ アクティブ')
          : chalk.red('✗ 非アクティブ'),
        最終確認: location.lastHealthCheck.toLocaleString('ja-JP'),
      }));

      const analysisResult: AnalysisResult = {
        summary: {
          total: tableData.length,
          byType: {} as Record<DNSRecordType, number>,
          byRisk: { low: tableData.length, medium: 0, high: 0, critical: 0 },
          duration: 0,
        },
        records: tableData.map((data, index) => ({
          id: `edge-${index}`,
          name: data.ID,
          type: 'A' as DNSRecordType,
          value: data.地域,
          ttl: 300,
          created: new Date(),
          updated: new Date(),
          riskLevel: 'low' as const,
          riskScore: 0,
          recommendations: [],
        })),
        metadata: {
          scannedAt: new Date(),
          source: 'edge-locations',
          version: '1.0',
        },
      };
      console.log(formatter.format(analysisResult));

      await manager.shutdown();
    } catch (error) {
      logger.error(
        'エッジロケーション情報の取得に失敗しました',
        error as Error
      );
      process.exit(1);
    }
  });

// DNS解決実行
edgeCommand
  .command('resolve <domain>')
  .description('エッジコンピューティングを使用してDNS解決を実行')
  .option('-t, --type <type>', 'DNSレコードタイプ', 'A')
  .option('-c, --client-ip <ip>', 'クライアントIP', '203.0.113.1')
  .option(
    '-l, --location <location>',
    'クライアントロケーション',
    'Tokyo,Japan'
  )
  .option('-p, --priority <priority>', 'クエリ優先度', 'medium')
  .option('-r, --repeat <count>', '実行回数', '1')
  .option('-s, --stats', '統計情報を表示', false)
  .action(async (domain, options) => {
    try {
      const manager = new EdgeComputingDNSManager({
        aiPredictor: {
          modelType: 'neural-network',
          trainingData: {
            queryPatterns: [],
            responsePatterns: [],
          },
          predictionAccuracy: 0.85,
          lastTrainingTime: new Date(),
          isActive: !options.disableAi,
        },
        cachePolicy: {
          ttl: 300,
          maxSize: 1000000,
          evictionPolicy: 'ai-optimized',
          compressionEnabled: true,
          prefetchEnabled: !options.disablePrefetch,
          predictiveInvalidation: true,
        },
      });

      const [city, country] = options.location.split(',');
      const repeatCount = parseInt(options.repeat) || 1;

      logger.info(`エッジDNS解決を実行中: ${domain} (${repeatCount}回)`);

      const queries: EdgeDNSQuery[] = Array.from(
        { length: repeatCount },
        (_, i) => ({
          id: `edge-resolve-${Date.now()}-${i}`,
          domain,
          type: options.type.toUpperCase(),
          clientIP: options.clientIp,
          clientLocation: {
            country: country?.trim() || 'Japan',
            city: city?.trim() || 'Tokyo',
            coordinates: {
              latitude: 35.6762,
              longitude: 139.6503,
            },
          },
          timestamp: new Date(),
          priority: options.priority,
          context: {
            requestSource: 'cli-command',
            expectedResponseTime: 100,
          },
        })
      );

      const responses = await Promise.all(
        queries.map(query => manager.processEdgeDNSQuery(query))
      );

      // 結果の表示
      console.log(chalk.bold('\n🚀 エッジDNS解決結果'));
      console.log(chalk.gray('─'.repeat(50)));

      responses.forEach((response, index) => {
        console.log(chalk.bold(`\n📋 クエリ ${index + 1}/${repeatCount}`));
        console.log(`ドメイン: ${chalk.yellow(domain)}`);
        console.log(
          `レコードタイプ: ${chalk.yellow(options.type.toUpperCase())}`
        );
        console.log(
          `エッジロケーション: ${chalk.green(response.edgeLocationId)}`
        );
        console.log(`処理時間: ${chalk.yellow(response.processingTime)}ms`);
        console.log(`ソース: ${chalk.blue(response.source)}`);
        console.log(
          `ネットワーク遅延: ${chalk.yellow(response.metadata.networkLatency)}ms`
        );
        console.log(
          `圧縮率: ${chalk.yellow((response.metadata.compressionRatio * 100).toFixed(1))}%`
        );

        if (response.prediction) {
          console.log(
            `AI予測信頼度: ${chalk.magenta((response.prediction.confidence * 100).toFixed(1))}%`
          );
        }

        console.log('\n📝 DNSレコード:');
        response.records.forEach(record => {
          console.log(
            `  ${record.name} ${record.ttl} ${record.type} ${record.value}`
          );
        });
      });

      // 統計情報の表示
      if (options.stats || repeatCount > 1) {
        const totalTime = responses.reduce(
          (sum, r) => sum + r.processingTime,
          0
        );
        const avgTime = totalTime / responses.length;
        const minTime = Math.min(...responses.map(r => r.processingTime));
        const maxTime = Math.max(...responses.map(r => r.processingTime));

        console.log(chalk.bold('\n📊 統計情報'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`総実行時間: ${chalk.yellow(totalTime)}ms`);
        console.log(`平均応答時間: ${chalk.yellow(avgTime.toFixed(2))}ms`);
        console.log(`最小応答時間: ${chalk.yellow(minTime)}ms`);
        console.log(`最大応答時間: ${chalk.yellow(maxTime)}ms`);

        const locationCounts = responses.reduce(
          (acc, r) => {
            acc[r.edgeLocationId] = (acc[r.edgeLocationId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        console.log('\n🌍 エッジロケーション使用状況:');
        Object.entries(locationCounts).forEach(([locationId, count]) => {
          console.log(`  ${locationId}: ${chalk.yellow(count)}回`);
        });

        const _globalMetrics = manager.getGlobalMetrics();
        const aiStats = manager.getAIPredictionStats();

        console.log(chalk.bold('\n🤖 AI予測統計'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(
          `AI予測有効: ${aiStats.isActive ? chalk.green('✓') : chalk.red('✗')}`
        );
        console.log(
          `予測精度: ${chalk.yellow((aiStats.accuracy * 100).toFixed(1))}%`
        );
        console.log(`予測クエリ数: ${chalk.yellow(aiStats.predictedQueries)}`);
        console.log(
          `成功した予測: ${chalk.yellow(aiStats.successfulPredictions)}`
        );
        console.log(
          `予測成功率: ${chalk.yellow((aiStats.predictionSuccessRate * 100).toFixed(1))}%`
        );
      }

      await manager.shutdown();
    } catch (error) {
      logger.error('エッジDNS解決に失敗しました', error as Error);
      process.exit(1);
    }
  });

// パフォーマンステスト
edgeCommand
  .command('benchmark')
  .description('エッジコンピューティングDNSのパフォーマンステストを実行')
  .option(
    '-d, --domains <domains>',
    'テスト対象ドメイン（カンマ区切り）',
    'example.com,google.com,github.com'
  )
  .option('-c, --concurrent <count>', '並行実行数', '10')
  .option('-r, --requests <count>', '総リクエスト数', '100')
  .option('-t, --timeout <ms>', 'タイムアウト時間', '5000')
  .action(async options => {
    try {
      const manager = new EdgeComputingDNSManager();

      const domains = options.domains.split(',').map((d: string) => d.trim());
      const concurrentCount = parseInt(options.concurrent) || 10;
      const totalRequests = parseInt(options.requests) || 100;
      const timeout = parseInt(options.timeout) || 5000;

      logger.info(
        `エッジDNSベンチマークを開始: ${totalRequests}リクエスト, ${concurrentCount}並行`
      );

      const startTime = Date.now();
      const results: Array<{
        success: boolean;
        time: number;
        domain: string;
        edgeLocation: string;
      }> = [];

      // バッチ処理でリクエストを実行
      const batches = Math.ceil(totalRequests / concurrentCount);

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * concurrentCount;
        const batchEnd = Math.min(batchStart + concurrentCount, totalRequests);
        const batchSize = batchEnd - batchStart;

        const batchPromises = Array.from(
          { length: batchSize },
          async (_, i) => {
            const domain = domains[(batchStart + i) % domains.length];
            const queryStartTime = Date.now();

            try {
              const query: EdgeDNSQuery = {
                id: `benchmark-${batch}-${i}`,
                domain,
                type: 'A',
                clientIP: '203.0.113.1',
                clientLocation: {
                  country: 'Japan',
                  city: 'Tokyo',
                  coordinates: { latitude: 35.6762, longitude: 139.6503 },
                },
                timestamp: new Date(),
                priority: 'medium',
                context: {
                  requestSource: 'benchmark',
                  expectedResponseTime: 100,
                },
              };

              const response = await Promise.race([
                manager.processEdgeDNSQuery(query),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), timeout)
                ),
              ]);

              const queryTime = Date.now() - queryStartTime;

              return {
                success: true,
                time: queryTime,
                domain,
                edgeLocation: response.edgeLocationId,
              };
            } catch (error) {
              return {
                success: false,
                time: Date.now() - queryStartTime,
                domain,
                edgeLocation: 'none',
              };
            }
          }
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // 進捗表示
        const progress = (((batch + 1) / batches) * 100).toFixed(1);
        process.stdout.write(
          `\r進捗: ${progress}% (${batchEnd}/${totalRequests})`
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log('\n');

      // 結果の分析
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      const successRate = (successfulResults.length / results.length) * 100;
      const avgResponseTime =
        successfulResults.reduce((sum, r) => sum + r.time, 0) /
        successfulResults.length;
      const minResponseTime = Math.min(...successfulResults.map(r => r.time));
      const maxResponseTime = Math.max(...successfulResults.map(r => r.time));

      // 結果の表示
      console.log(chalk.bold('\n🏆 ベンチマーク結果'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`総実行時間: ${chalk.yellow(totalTime)}ms`);
      console.log(`総リクエスト数: ${chalk.yellow(totalRequests)}`);
      console.log(`成功率: ${chalk.green(successRate.toFixed(2))}%`);
      console.log(`失敗数: ${chalk.red(failedResults.length)}`);
      console.log(
        `平均応答時間: ${chalk.yellow(avgResponseTime.toFixed(2))}ms`
      );
      console.log(`最小応答時間: ${chalk.yellow(minResponseTime)}ms`);
      console.log(`最大応答時間: ${chalk.yellow(maxResponseTime)}ms`);
      console.log(
        `スループット: ${chalk.yellow((successfulResults.length / (totalTime / 1000)).toFixed(2))} req/sec`
      );

      // エッジロケーション使用状況
      const locationCounts = successfulResults.reduce(
        (acc, r) => {
          acc[r.edgeLocation] = (acc[r.edgeLocation] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(chalk.bold('\n🌍 エッジロケーション使用状況'));
      console.log(chalk.gray('─'.repeat(50)));
      Object.entries(locationCounts).forEach(([locationId, count]) => {
        const percentage = ((count / successfulResults.length) * 100).toFixed(
          1
        );
        console.log(`${locationId}: ${chalk.yellow(count)}回 (${percentage}%)`);
      });

      // ドメイン別統計
      const domainStats = domains.map(domain => {
        const domainResults = successfulResults.filter(
          r => r.domain === domain
        );
        const domainAvgTime =
          domainResults.reduce((sum, r) => sum + r.time, 0) /
          domainResults.length;
        return {
          domain,
          count: domainResults.length,
          avgTime: domainAvgTime || 0,
        };
      });

      console.log(chalk.bold('\n📊 ドメイン別統計'));
      console.log(chalk.gray('─'.repeat(50)));
      domainStats.forEach(stat => {
        console.log(
          `${stat.domain}: ${chalk.yellow(stat.count)}回, 平均 ${chalk.yellow(stat.avgTime.toFixed(2))}ms`
        );
      });

      await manager.shutdown();
    } catch (error) {
      logger.error('ベンチマークの実行に失敗しました', error as Error);
      process.exit(1);
    }
  });

// 設定表示
edgeCommand
  .command('config')
  .description('エッジコンピューティングDNSの設定を表示')
  .action(async () => {
    try {
      const manager = new EdgeComputingDNSManager();

      console.log(chalk.bold('\n⚙️  エッジコンピューティングDNS設定'));
      console.log(chalk.gray('─'.repeat(50)));

      const aiStats = manager.getAIPredictionStats();
      const globalMetrics = manager.getGlobalMetrics();

      console.log(chalk.bold('🤖 AI予測設定'));
      console.log(
        `状態: ${aiStats.isActive ? chalk.green('有効') : chalk.red('無効')}`
      );
      console.log(
        `予測精度: ${chalk.yellow((aiStats.accuracy * 100).toFixed(1))}%`
      );
      console.log(
        `最終トレーニング: ${chalk.yellow(aiStats.lastTrainingTime.toLocaleString('ja-JP'))}`
      );

      console.log(chalk.bold('\n📊 システム統計'));
      console.log(`総クエリ数: ${chalk.yellow(globalMetrics.totalQueries)}`);
      console.log(
        `平均応答時間: ${chalk.yellow(globalMetrics.averageResponseTime.toFixed(2))}ms`
      );
      console.log(
        `キャッシュヒット率: ${chalk.yellow((globalMetrics.cacheHitRate * 100).toFixed(1))}%`
      );
      console.log(
        `エッジ利用率: ${chalk.yellow((globalMetrics.edgeUtilization * 100).toFixed(1))}%`
      );

      await manager.shutdown();
    } catch (error) {
      logger.error('設定の表示に失敗しました', error as Error);
      process.exit(1);
    }
  });

export default edgeCommand;
