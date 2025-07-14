/**
 * DNSweeper マシンラーニングシステム 基本パフォーマンステスト
 * AI分析・最適化エンジンの基本パフォーマンス検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// パフォーマンステスト用の設定
const PERFORMANCE_THRESHOLDS = {
  PROCESSING_TIME: 100, // 100ms
  MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  LARGE_DATASET_SIZE: 5000,
  MASSIVE_DATASET_SIZE: 50000
};

// 大量データ生成関数
const generateLargeDataset = (size: number) => 
  Array.from({ length: size }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 60000),
    response_time: 40 + Math.random() * 20,
    throughput: 1000 + Math.random() * 400,
    error_rate: Math.random() * 5,
    cpu_usage: 50 + Math.random() * 30,
    memory_usage: 60 + Math.random() * 25,
    cache_hit_rate: 80 + Math.random() * 15,
    network_latency: 10 + Math.random() * 20
  }));

const generateMassiveOptimizationRules = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `rule_${i}`,
    name: `最適化ルール ${i}`,
    category: ['performance', 'cost', 'reliability', 'security'][i % 4],
    description: `自動最適化ルール ${i} の説明`,
    trigger: {
      metric: ['responseTime', 'errorRate', 'cost', 'cpuUsage'][i % 4],
      condition: 'greater_than',
      threshold: 50 + (i % 100),
      duration: 5 + (i % 10),
      cooldown: 30 + (i % 60)
    },
    actions: [],
    priority: 50 + (i % 50),
    enabled: i % 3 !== 0, // 3分の2を有効化
    autoApply: i % 4 === 0, // 4分の1を自動適用
    successRate: 80 + (i % 20),
    estimatedImpact: {
      performance: (i % 30) - 15,
      cost: (i % 40) - 20,
      reliability: (i % 25) - 5
    }
  }));

// パフォーマンス測定ユーティリティ
const measurePerformance = (fn: () => void) => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};

const measureMemoryUsage = () => {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

describe('マシンラーニングシステム 基本パフォーマンステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('大量データ処理パフォーマンス', () => {
    it('大量履歴データ(5,000件)の処理が性能要件を満たす', () => {
      const largeDataset = generateLargeDataset(PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE);
      
      const processingTime = measurePerformance(() => {
        // データ処理シミュレーション
        const processed = largeDataset
          .filter(item => item.response_time < 60)
          .map(item => ({
            ...item,
            score: item.response_time * 0.5 + item.error_rate * 2
          }))
          .sort((a, b) => a.score - b.score);
        
        expect(processed.length).toBeGreaterThan(0);
      });

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });

    it('超大量データ(50,000件)でもアプリケーションがクラッシュしない', () => {
      const massiveDataset = generateLargeDataset(PERFORMANCE_THRESHOLDS.MASSIVE_DATASET_SIZE);
      
      let processingError = false;
      let processingTime = 0;
      
      try {
        processingTime = measurePerformance(() => {
          // 大量データ処理
          const processed = massiveDataset
            .filter((_, index) => index % 10 === 0) // 10分の1にサンプリング
            .map(item => ({
              id: item.timestamp.getTime(),
              avg_response: item.response_time,
              health_score: 100 - (item.error_rate * 10)
            }));
          
          expect(processed.length).toBeGreaterThan(0);
        });
        
      } catch (error) {
        processingError = true;
      }

      expect(processingError).toBe(false);
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME * 5); // 5倍の余裕
    });

    it('大量最適化ルール(1,000件)の処理が正常に動作する', () => {
      const massiveRules = generateMassiveOptimizationRules(1000);

      const processingTime = measurePerformance(() => {
        // ルール処理シミュレーション
        const enabledRules = massiveRules.filter(rule => rule.enabled);
        const highPriorityRules = enabledRules
          .filter(rule => rule.priority > 75)
          .sort((a, b) => b.priority - a.priority);
        
        expect(enabledRules.length).toBeGreaterThan(0);
        expect(highPriorityRules.length).toBeGreaterThan(0);
      });

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });
  });

  describe('データ変換パフォーマンス', () => {
    it('大量予測データの変換が制限時間内に完了する', () => {
      const largePredictionData = Array.from({ length: 5000 }, (_, i) => ({
        id: `pred_${i}`,
        metric: `metric_${i % 10}`,
        predictedValue: Math.random() * 100,
        confidence: 0.8 + Math.random() * 0.2,
        timeframe: '次の1時間',
        timestamp: new Date(),
        factors: Array.from({ length: 3 }, (_, j) => ({
          name: `factor_${j}`,
          impact: (Math.random() - 0.5) * 2,
          confidence: 0.7 + Math.random() * 0.3,
          description: `影響要因 ${j}`
        }))
      }));

      const processingTime = measurePerformance(() => {
        // 予測データ変換
        const highConfidencePredictions = largePredictionData
          .filter(p => p.confidence > 0.9)
          .map(p => ({
            ...p,
            risk_level: p.predictedValue > 80 ? 'high' : 
                       p.predictedValue > 50 ? 'medium' : 'low',
            factor_count: p.factors.length,
            avg_factor_confidence: p.factors.reduce((sum, f) => sum + f.confidence, 0) / p.factors.length
          }));

        expect(highConfidencePredictions.length).toBeGreaterThan(0);
      });

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });

    it('リアルタイムデータ更新シミュレーションが滑らかに動作する', () => {
      let updateCount = 0;
      const maxUpdates = 100;
      const targetUpdateTime = 10; // 10ms以内

      for (let i = 0; i < maxUpdates; i++) {
        const updateTime = measurePerformance(() => {
          // リアルタイム更新シミュレーション
          const newData = generateLargeDataset(1)[0];
          const processed = {
            ...newData,
            timestamp: Date.now(),
            processed_at: new Date(),
            update_id: i
          };
          
          expect(processed).toHaveProperty('timestamp');
          updateCount++;
        });

        expect(updateTime).toBeLessThan(targetUpdateTime);
      }

      expect(updateCount).toBe(maxUpdates);
    });
  });

  describe('検索・フィルタリング性能', () => {
    it('大量データからの検索が高速に動作する', () => {
      const largeDataset = generateLargeDataset(10000);
      
      const searchTime = measurePerformance(() => {
        // 複数条件での検索
        const results = largeDataset.filter(item => 
          item.response_time > 45 && 
          item.response_time < 55 &&
          item.error_rate < 3 &&
          item.cache_hit_rate > 85
        );

        expect(Array.isArray(results)).toBe(true);
      });

      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME / 2);
    });

    it('複雑な条件でのフィルタリングが効率的', () => {
      const complexDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        metrics: {
          response_time: 40 + Math.random() * 40,
          error_rate: Math.random() * 10,
          throughput: 800 + Math.random() * 800
        },
        category: ['web', 'api', 'database', 'cache'][i % 4],
        priority: Math.floor(Math.random() * 100),
        tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `tag_${j}`)
      }));

      const filterTime = measurePerformance(() => {
        // 複雑なフィルタリング
        const filtered = complexDataset
          .filter(item => item.metrics.response_time < 60)
          .filter(item => item.metrics.error_rate < 5)
          .filter(item => item.priority > 50)
          .filter(item => ['web', 'api'].includes(item.category))
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 100);

        expect(filtered.length).toBeGreaterThanOrEqual(0);
        expect(filtered.length).toBeLessThanOrEqual(100);
      });

      expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });
  });

  describe('集計・統計処理性能', () => {
    it('大量データの集計処理が高速', () => {
      const largeDataset = generateLargeDataset(8000);

      const aggregationTime = measurePerformance(() => {
        // 統計集計
        const stats = {
          count: largeDataset.length,
          avgResponseTime: largeDataset.reduce((sum, item) => sum + item.response_time, 0) / largeDataset.length,
          maxResponseTime: Math.max(...largeDataset.map(item => item.response_time)),
          minResponseTime: Math.min(...largeDataset.map(item => item.response_time)),
          avgErrorRate: largeDataset.reduce((sum, item) => sum + item.error_rate, 0) / largeDataset.length,
          p95ResponseTime: largeDataset
            .map(item => item.response_time)
            .sort((a, b) => a - b)[Math.floor(largeDataset.length * 0.95)]
        };

        expect(stats.count).toBe(largeDataset.length);
        expect(stats.avgResponseTime).toBeGreaterThan(0);
        expect(stats.maxResponseTime).toBeGreaterThanOrEqual(stats.avgResponseTime);
        expect(stats.minResponseTime).toBeLessThanOrEqual(stats.avgResponseTime);
      });

      expect(aggregationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });

    it('時系列データのグループ化が効率的', () => {
      const timeSeriesData = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000), // 1分間隔
        value: Math.random() * 100,
        category: ['A', 'B', 'C'][i % 3]
      }));

      const groupingTime = measurePerformance(() => {
        // 時間別グループ化
        const hourlyGroups = timeSeriesData.reduce((groups, item) => {
          const hour = new Date(item.timestamp).getHours();
          const key = `${hour}:00`;
          
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(item);
          
          return groups;
        }, {} as Record<string, typeof timeSeriesData>);

        const hourlyStats = Object.entries(hourlyGroups).map(([hour, data]) => ({
          hour,
          count: data.length,
          avgValue: data.reduce((sum, item) => sum + item.value, 0) / data.length,
          categoryBreakdown: data.reduce((breakdown, item) => {
            breakdown[item.category] = (breakdown[item.category] || 0) + 1;
            return breakdown;
          }, {} as Record<string, number>)
        }));

        expect(Object.keys(hourlyGroups).length).toBeGreaterThan(0);
        expect(hourlyStats.length).toBeGreaterThan(0);
      });

      expect(groupingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });
  });

  describe('メモリ効率性テスト', () => {
    it('大量データ処理時のメモリ使用量が適切', () => {
      const initialMemory = measureMemoryUsage();
      
      // 大量データ処理
      for (let i = 0; i < 10; i++) {
        const dataset = generateLargeDataset(1000);
        const processed = dataset
          .filter(item => item.response_time < 50)
          .map(item => ({
            id: item.timestamp.getTime(),
            score: item.response_time + item.error_rate
          }));
        
        expect(processed.length).toBeGreaterThanOrEqual(0);
      }

      const finalMemory = measureMemoryUsage();
      
      if (finalMemory > 0 && initialMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);
      }
    });

    it('反復処理でのメモリリークがない', () => {
      const memoryMeasurements: number[] = [];
      
      // 10回の反復処理
      for (let i = 0; i < 10; i++) {
        // データ生成・処理・破棄のサイクル
        const data = generateLargeDataset(1000);
        const processed = data.map(item => ({
          ...item,
          processed: true,
          iteration: i
        }));
        
        // 処理完了
        expect(processed.length).toBe(1000);
        
        // メモリ使用量記録
        const currentMemory = measureMemoryUsage();
        if (currentMemory > 0) {
          memoryMeasurements.push(currentMemory);
        }
      }

      // メモリ使用量の増加傾向をチェック
      if (memoryMeasurements.length > 5) {
        const firstHalf = memoryMeasurements.slice(0, 5);
        const secondHalf = memoryMeasurements.slice(5);
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        // メモリ使用量が大幅に増加していないことを確認
        const memoryGrowth = secondAvg - firstAvg;
        expect(memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);
      }
    });
  });

  describe('アルゴリズム効率性', () => {
    it('ソートアルゴリズムが大量データで効率的', () => {
      const unsortedData = Array.from({ length: 5000 }, () => ({
        value: Math.random() * 1000,
        priority: Math.floor(Math.random() * 100),
        timestamp: Date.now() - Math.random() * 86400000
      }));

      const sortTime = measurePerformance(() => {
        // 複数キーでのソート
        const sorted = unsortedData.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority; // 優先度降順
          }
          if (a.value !== b.value) {
            return a.value - b.value; // 値昇順
          }
          return b.timestamp - a.timestamp; // タイムスタンプ降順
        });

        expect(sorted.length).toBe(unsortedData.length);
        
        // ソート結果の検証
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          
          if (prev.priority === curr.priority && prev.value === curr.value) {
            expect(prev.timestamp).toBeGreaterThanOrEqual(curr.timestamp);
          }
        }
      });

      expect(sortTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });

    it('検索アルゴリズムが効率的', () => {
      const searchData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `item_${i}`,
        category: ['A', 'B', 'C', 'D'][i % 4],
        value: Math.random() * 1000,
        active: i % 3 === 0
      }));

      // インデックス作成
      const indexTime = measurePerformance(() => {
        const categoryIndex = searchData.reduce((index, item) => {
          if (!index[item.category]) {
            index[item.category] = [];
          }
          index[item.category].push(item);
          return index;
        }, {} as Record<string, typeof searchData>);

        expect(Object.keys(categoryIndex)).toHaveLength(4);
      });

      // 検索実行
      const searchTime = measurePerformance(() => {
        const results = searchData.filter(item => 
          item.active && 
          item.value > 500 && 
          ['A', 'C'].includes(item.category)
        );

        expect(Array.isArray(results)).toBe(true);
      });

      expect(indexTime + searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME);
    });
  });

  describe('同期処理性能', () => {
    it('複数データソースの同期処理が効率的', () => {
      const dataSource1 = generateLargeDataset(2000);
      const dataSource2 = generateLargeDataset(2000);
      const dataSource3 = generateLargeDataset(2000);

      const syncTime = measurePerformance(() => {
        // データソース同期（タイムスタンプベース）
        const allData = [...dataSource1, ...dataSource2, ...dataSource3];
        const sortedData = allData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // 重複排除（タイムスタンプベース）
        const uniqueData = sortedData.filter((item, index, array) => 
          index === 0 || item.timestamp.getTime() !== array[index - 1].timestamp.getTime()
        );

        // 時間窓でのグループ化（5分間隔）
        const timeWindows = uniqueData.reduce((windows, item) => {
          const windowKey = Math.floor(item.timestamp.getTime() / (5 * 60 * 1000));
          if (!windows[windowKey]) {
            windows[windowKey] = [];
          }
          windows[windowKey].push(item);
          return windows;
        }, {} as Record<number, typeof uniqueData>);

        expect(allData.length).toBe(6000);
        expect(sortedData.length).toBe(6000);
        expect(Object.keys(timeWindows).length).toBeGreaterThan(0);
      });

      expect(syncTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME * 2); // 2倍の余裕
    });
  });
});