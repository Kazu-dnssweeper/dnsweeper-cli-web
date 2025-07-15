import express from 'express';
import EdgeComputingDNSManager, { EdgeDNSQuery } from '../../../../src/lib/edge-computing-dns-manager.js';
import { Logger } from '../../../../src/lib/logger.js';

const router = express.Router();
const logger = new Logger({ context: 'EdgeComputingAPI' });

// エッジコンピューティングDNSマネージャーのインスタンス
let edgeManager: EdgeComputingDNSManager | null = null;

// マネージャーの初期化
const initializeManager = () => {
  if (!edgeManager) {
    edgeManager = new EdgeComputingDNSManager();
    logger.info('エッジコンピューティングDNSマネージャーを初期化しました');
  }
  return edgeManager;
};

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  if (edgeManager) {
    await edgeManager.shutdown();
    logger.info('エッジコンピューティングDNSマネージャーをシャットダウンしました');
  }
});

/**
 * エッジロケーション一覧を取得
 */
router.get('/locations', async (req, res) => {
  try {
    const manager = initializeManager();
    const locations = manager.getEdgeLocationStats();
    
    res.json(locations);
  } catch (error) {
    logger.error('エッジロケーション一覧の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'エッジロケーション一覧の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * グローバルメトリクスを取得
 */
router.get('/metrics', async (req, res) => {
  try {
    const manager = initializeManager();
    const metrics = manager.getGlobalMetrics();
    
    res.json(metrics);
  } catch (error) {
    logger.error('グローバルメトリクスの取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'グローバルメトリクスの取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * AI予測統計を取得
 */
router.get('/ai-stats', async (req, res) => {
  try {
    const manager = initializeManager();
    const aiStats = manager.getAIPredictionStats();
    
    res.json(aiStats);
  } catch (error) {
    logger.error('AI予測統計の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'AI予測統計の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * エッジDNS解決を実行
 */
router.post('/resolve', async (req, res) => {
  try {
    const { query, options } = req.body;
    
    // 入力検証
    if (!query || !query.domain) {
      return res.status(400).json({ 
        error: 'ドメインが指定されていません' 
      });
    }

    const manager = initializeManager();
    
    // オプションに基づいてマネージャーを再設定
    if (options) {
      // 新しいマネージャーを作成（オプションを反映）
      const newManager = new EdgeComputingDNSManager({
        aiPredictor: {
          modelType: 'neural-network',
          trainingData: {
            queryPatterns: [],
            responsePatterns: []
          },
          predictionAccuracy: 0.85,
          lastTrainingTime: new Date(),
          isActive: options.aiEnabled !== false
        },
        cachePolicy: {
          ttl: 300,
          maxSize: 1000000,
          evictionPolicy: 'ai-optimized',
          compressionEnabled: options.compressionEnabled !== false,
          prefetchEnabled: options.prefetchEnabled !== false,
          predictiveInvalidation: true
        }
      });

      // DNS解決を実行
      const response = await newManager.processEdgeDNSQuery(query);
      
      // 一時的なマネージャーをシャットダウン
      await newManager.shutdown();
      
      res.json(response);
    } else {
      // デフォルトマネージャーを使用
      const response = await manager.processEdgeDNSQuery(query);
      res.json(response);
    }
    
  } catch (error) {
    logger.error('エッジDNS解決に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'エッジDNS解決に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * ベンチマークを実行
 */
router.post('/benchmark', async (req, res) => {
  try {
    const { 
      domains = ['example.com', 'google.com', 'github.com'],
      concurrent = 10,
      requests = 100,
      timeout = 5000
    } = req.body;

    const manager = initializeManager();
    
    // SSEヘッダーを設定
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const startTime = Date.now();
    const results: Array<{
      success: boolean;
      time: number;
      domain: string;
      edgeLocation: string;
    }> = [];

    // バッチ処理でリクエストを実行
    const batches = Math.ceil(requests / concurrent);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * concurrent;
      const batchEnd = Math.min(batchStart + concurrent, requests);
      const batchSize = batchEnd - batchStart;
      
      const batchPromises = Array.from({ length: batchSize }, async (_, i) => {
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
              coordinates: { latitude: 35.6762, longitude: 139.6503 }
            },
            timestamp: new Date().toISOString(),
            priority: 'medium',
            context: {
              requestSource: 'benchmark',
              expectedResponseTime: 100
            }
          };
          
          const response = await Promise.race([
            manager.processEdgeDNSQuery(query),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
          
          const queryTime = Date.now() - queryStartTime;
          
          return {
            success: true,
            time: queryTime,
            domain,
            edgeLocation: response.edgeLocationId
          };
          
        } catch (error) {
          return {
            success: false,
            time: Date.now() - queryStartTime,
            domain,
            edgeLocation: 'none'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 進捗を送信
      const progress = ((batch + 1) / batches) * 100;
      res.write(`data: progress:${progress}\n\n`);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 結果の分析
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    const successRate = (successfulResults.length / results.length) * 100;
    const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.time, 0) / successfulResults.length;
    const minResponseTime = Math.min(...successfulResults.map(r => r.time));
    const maxResponseTime = Math.max(...successfulResults.map(r => r.time));
    
    // エッジロケーション使用状況
    const locationCounts = successfulResults.reduce((acc, r) => {
      acc[r.edgeLocation] = (acc[r.edgeLocation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // ドメイン別統計
    const domainStats = domains.map(domain => {
      const domainResults = successfulResults.filter(r => r.domain === domain);
      const domainAvgTime = domainResults.reduce((sum, r) => sum + r.time, 0) / domainResults.length;
      return {
        domain,
        count: domainResults.length,
        avgTime: domainAvgTime || 0
      };
    });
    
    const benchmarkResult = {
      totalTime,
      totalRequests: requests,
      successRate,
      failedCount: failedResults.length,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      throughput: successfulResults.length / (totalTime / 1000),
      locationCounts,
      domainStats
    };
    
    // 最終結果を送信
    res.write(`data: ${JSON.stringify(benchmarkResult)}\n\n`);
    res.end();
    
  } catch (error) {
    logger.error('ベンチマークの実行に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'ベンチマークの実行に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * 特定のエッジロケーションの詳細情報を取得
 */
router.get('/locations/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const manager = initializeManager();
    const locations = manager.getEdgeLocationStats();
    
    const location = locations.find(loc => loc.id === locationId);
    if (!location) {
      return res.status(404).json({ 
        error: 'エッジロケーションが見つかりません' 
      });
    }
    
    res.json(location);
  } catch (error) {
    logger.error('エッジロケーション詳細の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'エッジロケーション詳細の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * エッジロケーションのヘルスチェックを実行
 */
router.post('/locations/:locationId/health-check', async (req, res) => {
  try {
    const { locationId } = req.params;
    const manager = initializeManager();
    
    // 実際の実装では、特定のロケーションのヘルスチェックを実行
    // ここでは、シミュレーション結果を返す
    const locations = manager.getEdgeLocationStats();
    const location = locations.find(loc => loc.id === locationId);
    
    if (!location) {
      return res.status(404).json({ 
        error: 'エッジロケーションが見つかりません' 
      });
    }
    
    // ヘルスチェック結果のシミュレーション
    const healthCheckResult = {
      locationId,
      timestamp: new Date().toISOString(),
      status: location.isActive ? 'healthy' : 'unhealthy',
      latency: location.latency,
      load: location.load,
      capacity: location.capacity,
      utilization: location.utilization,
      checks: {
        network: location.isActive,
        dns: location.isActive,
        storage: location.isActive,
        cpu: location.utilization < 0.9
      }
    };
    
    res.json(healthCheckResult);
  } catch (error) {
    logger.error('ヘルスチェックの実行に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'ヘルスチェックの実行に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * エッジロケーションの設定を更新
 */
router.put('/locations/:locationId/config', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { config } = req.body;
    
    // 実際の実装では、エッジロケーションの設定を更新
    // ここでは、設定更新のシミュレーション
    logger.info(`エッジロケーション ${locationId} の設定を更新中`, config);
    
    res.json({
      locationId,
      updated: true,
      timestamp: new Date().toISOString(),
      config
    });
  } catch (error) {
    logger.error('エッジロケーション設定の更新に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'エッジロケーション設定の更新に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * リアルタイム統計のWebSocket接続
 */
router.get('/stats/stream', async (req, res) => {
  try {
    const manager = initializeManager();
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // リアルタイム統計の送信
    const sendStats = () => {
      const stats = {
        timestamp: new Date().toISOString(),
        locations: manager.getEdgeLocationStats(),
        globalMetrics: manager.getGlobalMetrics(),
        aiStats: manager.getAIPredictionStats()
      };
      
      res.write(`data: ${JSON.stringify(stats)}\n\n`);
    };
    
    // 初回データ送信
    sendStats();
    
    // 定期的な更新
    const interval = setInterval(sendStats, 5000); // 5秒ごと
    
    // 接続終了時のクリーンアップ
    req.on('close', () => {
      clearInterval(interval);
    });
    
  } catch (error) {
    logger.error('リアルタイム統計の配信に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'リアルタイム統計の配信に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * 履歴データの取得
 */
router.get('/history', async (req, res) => {
  try {
    const { 
      period = '1h', 
      metric = 'response-time',
      locationId 
    } = req.query as { period?: string; metric?: string; locationId?: string };
    
    // 実際の実装では、データベースから履歴データを取得
    // ここでは、サンプルデータを生成
    const now = new Date();
    const points = period === '1h' ? 60 : period === '24h' ? 24 : 7;
    const interval = period === '1h' ? 60000 : period === '24h' ? 3600000 : 86400000;
    
    const historyData = Array.from({ length: points }, (_, i) => {
      const timestamp = new Date(now.getTime() - (points - i - 1) * interval);
      let value = 0;
      
      switch (metric) {
        case 'response-time':
          value = Math.random() * 100 + 50;
          break;
        case 'throughput':
          value = Math.random() * 1000 + 500;
          break;
        case 'error-rate':
          value = Math.random() * 5;
          break;
        case 'utilization':
          value = Math.random() * 100;
          break;
        default:
          value = Math.random() * 100;
      }
      
      return {
        timestamp: timestamp.toISOString(),
        value,
        locationId: locationId || 'global'
      };
    });
    
    res.json(historyData);
  } catch (error) {
    logger.error('履歴データの取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: '履歴データの取得に失敗しました',
      details: (error as Error).message
    });
  }
});

export default router;