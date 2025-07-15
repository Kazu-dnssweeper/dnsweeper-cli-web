import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EdgeComputingDNSManager, { 
  EdgeDNSQuery, 
  EdgeLocation, 
  EdgeDNSResponse,
  EdgeLoadBalancingStrategy,
  EdgeCachePolicy,
  EdgeAIPredictor
} from '../../src/lib/edge-computing-dns-manager.js';

// モックの設定
vi.mock('../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('EdgeComputingDNSManager', () => {
  let manager: EdgeComputingDNSManager;
  let mockQuery: EdgeDNSQuery;

  beforeEach(() => {
    manager = new EdgeComputingDNSManager();
    
    mockQuery = {
      id: 'test-query-1',
      domain: 'example.com',
      type: 'A',
      clientIP: '203.0.113.1',
      clientLocation: {
        country: 'Japan',
        city: 'Tokyo',
        coordinates: {
          latitude: 35.6762,
          longitude: 139.6503
        }
      },
      timestamp: new Date(),
      priority: 'medium',
      context: {
        requestSource: 'web-client',
        expectedResponseTime: 100
      }
    };
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('初期化', () => {
    it('グローバルエッジネットワークが正しく初期化されること', () => {
      const stats = manager.getEdgeLocationStats();
      
      expect(stats).toHaveLength(4);
      expect(stats.map(s => s.id)).toContain('us-east-1');
      expect(stats.map(s => s.id)).toContain('eu-west-1');
      expect(stats.map(s => s.id)).toContain('ap-northeast-1');
      expect(stats.map(s => s.id)).toContain('ap-southeast-1');
    });

    it('すべてのエッジロケーションがアクティブであること', () => {
      const stats = manager.getEdgeLocationStats();
      
      stats.forEach(location => {
        expect(location.isActive).toBe(true);
        expect(location.load).toBe(0);
        expect(location.capacity).toBeGreaterThan(0);
      });
    });

    it('デフォルトの設定が正しく適用されること', () => {
      const metrics = manager.getGlobalMetrics();
      
      expect(metrics.totalQueries).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.edgeUtilization).toBe(0);
    });
  });

  describe('エッジDNSクエリ処理', () => {
    it('基本的なDNSクエリが正しく処理されること', async () => {
      const response = await manager.processEdgeDNSQuery(mockQuery);
      
      expect(response).toBeDefined();
      expect(response.queryId).toBe(mockQuery.id);
      expect(response.records).toHaveLength(1);
      expect(response.records[0].name).toBe(mockQuery.domain);
      expect(response.records[0].type).toBe(mockQuery.type);
      expect(response.source).toBe('edge-resolve');
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('地理的に最適なエッジロケーションが選択されること', async () => {
      // 東京に近いクライアントの場合
      const tokyoQuery = {
        ...mockQuery,
        clientLocation: {
          country: 'Japan',
          city: 'Tokyo',
          coordinates: { latitude: 35.6762, longitude: 139.6503 }
        }
      };

      const response = await manager.processEdgeDNSQuery(tokyoQuery);
      
      // 東京（ap-northeast-1）またはシンガポール（ap-southeast-1）が選択されるはず
      expect(['ap-northeast-1', 'ap-southeast-1']).toContain(response.edgeLocationId);
    });

    it('複数のクエリが並行処理されること', async () => {
      const queries = Array.from({ length: 5 }, (_, i) => ({
        ...mockQuery,
        id: `test-query-${i}`,
        domain: `example${i}.com`
      }));

      const responses = await Promise.all(
        queries.map(query => manager.processEdgeDNSQuery(query))
      );

      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        expect(response.queryId).toBe(`test-query-${index}`);
        expect(response.records[0].name).toBe(`example${index}.com`);
      });
    });

    it('エラーハンドリングが正しく動作すること', async () => {
      // 無効なクエリでテスト
      const invalidQuery = {
        ...mockQuery,
        domain: '', // 無効なドメイン
        type: 'INVALID' as any
      };

      await expect(manager.processEdgeDNSQuery(invalidQuery))
        .rejects.toThrow();
    });
  });

  describe('ロードバランシング', () => {
    it('地理的ロードバランシングが機能すること', async () => {
      const geographicStrategy: EdgeLoadBalancingStrategy = {
        algorithm: 'geographic',
        weights: {},
        healthCheckInterval: 30000,
        failoverThreshold: 3,
        maxRetries: 3,
        adaptiveWeighting: true
      };

      const managerWithGeo = new EdgeComputingDNSManager({
        loadBalancingStrategy: geographicStrategy
      });

      const response = await managerWithGeo.processEdgeDNSQuery(mockQuery);
      
      // 日本のクライアントなので、ap-northeast-1が選択されるはず
      expect(response.edgeLocationId).toBe('ap-northeast-1');
      
      await managerWithGeo.shutdown();
    });

    it('最小接続数ロードバランシングが機能すること', async () => {
      const leastConnectionsStrategy: EdgeLoadBalancingStrategy = {
        algorithm: 'least-connections',
        weights: {},
        healthCheckInterval: 30000,
        failoverThreshold: 3,
        maxRetries: 3,
        adaptiveWeighting: true
      };

      const managerWithLC = new EdgeComputingDNSManager({
        loadBalancingStrategy: leastConnectionsStrategy
      });

      const response = await managerWithLC.processEdgeDNSQuery(mockQuery);
      
      expect(response.edgeLocationId).toBeDefined();
      expect(response.processingTime).toBeGreaterThan(0);
      
      await managerWithLC.shutdown();
    });

    it('重み付きラウンドロビンが機能すること', async () => {
      const weightedStrategy: EdgeLoadBalancingStrategy = {
        algorithm: 'weighted-round-robin',
        weights: {
          'us-east-1': 3,
          'eu-west-1': 2,
          'ap-northeast-1': 4,
          'ap-southeast-1': 1
        },
        healthCheckInterval: 30000,
        failoverThreshold: 3,
        maxRetries: 3,
        adaptiveWeighting: true
      };

      const managerWithWRR = new EdgeComputingDNSManager({
        loadBalancingStrategy: weightedStrategy
      });

      const responses = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          managerWithWRR.processEdgeDNSQuery({
            ...mockQuery,
            id: `wrr-test-${i}`
          })
        )
      );

      // 重み付きロードバランシングにより、異なるエッジロケーションが使用されるはず
      const locationCounts = responses.reduce((acc, response) => {
        acc[response.edgeLocationId] = (acc[response.edgeLocationId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(Object.keys(locationCounts).length).toBeGreaterThan(1);
      
      await managerWithWRR.shutdown();
    });
  });

  describe('AI予測機能', () => {
    it('AI予測が有効な場合、予測クエリが生成されること', async () => {
      const aiPredictor: EdgeAIPredictor = {
        modelType: 'neural-network',
        trainingData: {
          queryPatterns: [
            {
              domain: 'example.com',
              frequency: 1000,
              timePattern: 'daily',
              clientPattern: 'global'
            }
          ],
          responsePatterns: [
            {
              domain: 'example.com',
              averageResponseTime: 50,
              cacheHitRate: 0.8,
              popularityScore: 0.9
            }
          ]
        },
        predictionAccuracy: 0.85,
        lastTrainingTime: new Date(),
        isActive: true
      };

      const managerWithAI = new EdgeComputingDNSManager({
        aiPredictor
      });

      const response = await managerWithAI.processEdgeDNSQuery(mockQuery);
      
      expect(response.prediction).toBeDefined();
      expect(response.prediction!.confidence).toBe(0.85);
      expect(response.prediction!.algorithm).toBe('neural-network');
      
      const aiStats = managerWithAI.getAIPredictionStats();
      expect(aiStats.isActive).toBe(true);
      expect(aiStats.accuracy).toBe(0.85);
      
      await managerWithAI.shutdown();
    });

    it('AI予測が無効な場合、予測機能が使用されないこと', async () => {
      const aiPredictor: EdgeAIPredictor = {
        modelType: 'neural-network',
        trainingData: {
          queryPatterns: [],
          responsePatterns: []
        },
        predictionAccuracy: 0.85,
        lastTrainingTime: new Date(),
        isActive: false
      };

      const managerWithoutAI = new EdgeComputingDNSManager({
        aiPredictor
      });

      const response = await managerWithoutAI.processEdgeDNSQuery(mockQuery);
      
      expect(response.prediction).toBeUndefined();
      
      const aiStats = managerWithoutAI.getAIPredictionStats();
      expect(aiStats.isActive).toBe(false);
      
      await managerWithoutAI.shutdown();
    });

    it('AI予測統計が正しく取得されること', async () => {
      const aiStats = manager.getAIPredictionStats();
      
      expect(aiStats).toHaveProperty('isActive');
      expect(aiStats).toHaveProperty('accuracy');
      expect(aiStats).toHaveProperty('predictedQueries');
      expect(aiStats).toHaveProperty('successfulPredictions');
      expect(aiStats).toHaveProperty('predictionSuccessRate');
      expect(aiStats).toHaveProperty('lastTrainingTime');
      
      expect(typeof aiStats.accuracy).toBe('number');
      expect(aiStats.accuracy).toBeGreaterThanOrEqual(0);
      expect(aiStats.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('キャッシュポリシー', () => {
    it('プリフェッチが有効な場合、関連クエリがプリフェッチされること', async () => {
      const cachePolicy: EdgeCachePolicy = {
        ttl: 300,
        maxSize: 1000000,
        evictionPolicy: 'ai-optimized',
        compressionEnabled: true,
        prefetchEnabled: true,
        predictiveInvalidation: true
      };

      const managerWithPrefetch = new EdgeComputingDNSManager({
        cachePolicy
      });

      const response = await managerWithPrefetch.processEdgeDNSQuery(mockQuery);
      
      expect(response.metadata.compressionRatio).toBe(0.7);
      
      await managerWithPrefetch.shutdown();
    });

    it('圧縮が有効な場合、圧縮率が適用されること', async () => {
      const cachePolicy: EdgeCachePolicy = {
        ttl: 300,
        maxSize: 1000000,
        evictionPolicy: 'lru',
        compressionEnabled: true,
        prefetchEnabled: false,
        predictiveInvalidation: false
      };

      const managerWithCompression = new EdgeComputingDNSManager({
        cachePolicy
      });

      const response = await managerWithCompression.processEdgeDNSQuery(mockQuery);
      
      expect(response.metadata.compressionRatio).toBe(0.7);
      
      await managerWithCompression.shutdown();
    });

    it('圧縮が無効な場合、圧縮率が1.0になること', async () => {
      const cachePolicy: EdgeCachePolicy = {
        ttl: 300,
        maxSize: 1000000,
        evictionPolicy: 'lru',
        compressionEnabled: false,
        prefetchEnabled: false,
        predictiveInvalidation: false
      };

      const managerWithoutCompression = new EdgeComputingDNSManager({
        cachePolicy
      });

      const response = await managerWithoutCompression.processEdgeDNSQuery(mockQuery);
      
      expect(response.metadata.compressionRatio).toBe(1.0);
      
      await managerWithoutCompression.shutdown();
    });
  });

  describe('メトリクス', () => {
    it('グローバルメトリクスが正しく更新されること', async () => {
      const initialMetrics = manager.getGlobalMetrics();
      expect(initialMetrics.totalQueries).toBe(0);

      await manager.processEdgeDNSQuery(mockQuery);
      
      const updatedMetrics = manager.getGlobalMetrics();
      expect(updatedMetrics.totalQueries).toBe(1);
      expect(updatedMetrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('エッジロケーション統計が正しく取得されること', async () => {
      const stats = manager.getEdgeLocationStats();
      
      expect(stats).toHaveLength(4);
      stats.forEach(stat => {
        expect(stat).toHaveProperty('id');
        expect(stat).toHaveProperty('region');
        expect(stat).toHaveProperty('city');
        expect(stat).toHaveProperty('country');
        expect(stat).toHaveProperty('coordinates');
        expect(stat).toHaveProperty('capacity');
        expect(stat).toHaveProperty('load');
        expect(stat).toHaveProperty('utilization');
        expect(stat.utilization).toBeGreaterThanOrEqual(0);
        expect(stat.utilization).toBeLessThanOrEqual(1);
      });
    });

    it('複数のクエリ処理後、メトリクスが正しく集計されること', async () => {
      const queries = Array.from({ length: 3 }, (_, i) => ({
        ...mockQuery,
        id: `metrics-test-${i}`,
        domain: `metrics${i}.com`
      }));

      await Promise.all(
        queries.map(query => manager.processEdgeDNSQuery(query))
      );

      const metrics = manager.getGlobalMetrics();
      expect(metrics.totalQueries).toBe(3);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なクエリでエラーが発生した場合、適切にハンドリングされること', async () => {
      const invalidQuery = {
        ...mockQuery,
        domain: undefined as any
      };

      await expect(manager.processEdgeDNSQuery(invalidQuery))
        .rejects.toThrow();
    });

    it('エッジロケーションが利用不可の場合、適切にハンドリングされること', async () => {
      // すべてのエッジロケーションを無効化
      const stats = manager.getEdgeLocationStats();
      stats.forEach(stat => {
        stat.isActive = false;
      });

      await expect(manager.processEdgeDNSQuery(mockQuery))
        .rejects.toThrow('利用可能なエッジロケーションがありません');
    });
  });

  describe('システム管理', () => {
    it('システムが正常にシャットダウンされること', async () => {
      const shutdownPromise = manager.shutdown();
      
      await expect(shutdownPromise).resolves.toBeUndefined();
      
      const stats = manager.getEdgeLocationStats();
      stats.forEach(stat => {
        expect(stat.isActive).toBe(false);
      });
    });

    it('ヘルスチェックが実行されること', async () => {
      // ヘルスチェック間隔を短く設定
      const shortIntervalManager = new EdgeComputingDNSManager({
        loadBalancingStrategy: {
          algorithm: 'geographic',
          weights: {},
          healthCheckInterval: 100, // 100ms
          failoverThreshold: 3,
          maxRetries: 3,
          adaptiveWeighting: true
        }
      });

      // 少し待機してヘルスチェックが実行されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = shortIntervalManager.getEdgeLocationStats();
      stats.forEach(stat => {
        expect(stat.lastHealthCheck).toBeDefined();
      });

      await shortIntervalManager.shutdown();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のクエリを処理できること', async () => {
      const largeQuerySet = Array.from({ length: 50 }, (_, i) => ({
        ...mockQuery,
        id: `performance-test-${i}`,
        domain: `performance${i}.com`
      }));

      const startTime = Date.now();
      
      const responses = await Promise.all(
        largeQuerySet.map(query => manager.processEdgeDNSQuery(query))
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(50);
      expect(totalTime).toBeLessThan(5000); // 5秒以内

      responses.forEach((response, index) => {
        expect(response.queryId).toBe(`performance-test-${index}`);
        expect(response.processingTime).toBeLessThan(1000); // 1秒以内
      });
    });

    it('レスポンス時間が適切な範囲内であること', async () => {
      const response = await manager.processEdgeDNSQuery(mockQuery);
      
      expect(response.processingTime).toBeGreaterThan(0);
      expect(response.processingTime).toBeLessThan(1000); // 1秒以内
      expect(response.metadata.networkLatency).toBeLessThan(100); // 100ms以内
    });
  });
});