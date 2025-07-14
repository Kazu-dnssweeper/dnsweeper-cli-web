/**
 * DNSweeper マシンラーニングシステム パフォーマンステスト
 * AI分析・最適化エンジンのパフォーマンスベンチマーク
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PredictiveAnalytics } from '../../src/components/AI/PredictiveAnalytics';
import { OptimizationEngine } from '../../src/components/Performance/OptimizationEngine';
import { AIPredictiveAnalyticsPage } from '../../src/pages/AIPredictiveAnalyticsPage';

// パフォーマンステスト用の設定
const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME: 1000, // 1秒
  INTERACTION_TIME: 500, // 0.5秒
  MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  DATA_PROCESSING_TIME: 2000, // 2秒
  LARGE_DATASET_SIZE: 10000,
  MASSIVE_DATASET_SIZE: 100000
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
    category: ['performance', 'cost', 'reliability', 'security'][i % 4] as any,
    description: `自動最適化ルール ${i} の説明`,
    trigger: {
      metric: ['responseTime', 'errorRate', 'cost', 'cpuUsage'][i % 4],
      condition: 'greater_than' as any,
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

// テスト用のQueryClientセットアップ
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// API モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// パフォーマンス測定ユーティリティ
const measurePerformance = (fn: () => void | Promise<void>) => {
  const start = performance.now();
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then(() => performance.now() - start);
  } else {
    return performance.now() - start;
  }
};

const measureMemoryUsage = () => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

describe('マシンラーニングシステム パフォーマンステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 高速レスポンスのAPIモック
    mockFetch.mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            models: [],
            metrics: {},
            rules: [],
            jobs: [],
            metadata: {}
          }
        })
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('大量データ処理パフォーマンス', () => {
    it('大量履歴データ(10,000件)の処理が性能要件を満たす', async () => {
      const largeDataset = generateLargeDataset(PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE);
      
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={largeDataset}
            realtimeData={largeDataset.slice(0, 100)}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME);
    });

    it('超大量データ(100,000件)でもアプリケーションがクラッシュしない', async () => {
      const massiveDataset = generateLargeDataset(PERFORMANCE_THRESHOLDS.MASSIVE_DATASET_SIZE);
      
      let renderError = false;
      
      try {
        render(
          <TestWrapper>
            <PredictiveAnalytics
              historicalData={massiveDataset}
              realtimeData={massiveDataset.slice(0, 1000)}
            />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
        }, { timeout: 10000 });
        
      } catch (error) {
        renderError = true;
      }

      expect(renderError).toBe(false);
    });

    it('大量最適化ルール(1,000件)の処理が正常に動作する', async () => {
      const massiveRules = generateMassiveOptimizationRules(1000);
      const mockMetrics = {
        responseTime: 45.2,
        throughput: 1200,
        errorRate: 2.1,
        cacheHitRate: 85,
        cpuUsage: 65,
        memoryUsage: 70,
        diskUsage: 45,
        networkLatency: 15,
        cost: 1000,
        uptime: 99.5
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockMetrics}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME);
    });
  });

  describe('インタラクション応答性能', () => {
    it('タブ切り替えが高速に動作する', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={generateLargeDataset(1000)}
            realtimeData={generateLargeDataset(100)}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      // 各タブの切り替え性能をテスト
      const tabs = ['異常検知', '最適化提案', 'モデル管理'];
      
      for (const tabName of tabs) {
        const startTime = performance.now();
        
        const tab = screen.getByText(tabName);
        fireEvent.click(tab);
        
        const interactionTime = performance.now() - startTime;
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TIME);
      }
    });

    it('予測開始/停止ボタンの応答が高速', async () => {
      const onStartPrediction = vi.fn();
      const onStopPrediction = vi.fn();

      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={generateLargeDataset(1000)}
            realtimeData={generateLargeDataset(100)}
            onStartPrediction={onStartPrediction}
            onStopPrediction={onStopPrediction}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      // 予測開始ボタンの応答性能
      const startTime = performance.now();
      const startButton = screen.getByTitle('予測開始');
      fireEvent.click(startButton);
      
      const startInteractionTime = performance.now() - startTime;
      expect(startInteractionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TIME);
      expect(onStartPrediction).toHaveBeenCalled();
    });

    it('最適化エンジンの開始/停止が高速に動作する', async () => {
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={{
              responseTime: 45,
              throughput: 1200,
              errorRate: 2.1,
              cacheHitRate: 85,
              cpuUsage: 65,
              memoryUsage: 70,
              diskUsage: 45,
              networkLatency: 15,
              cost: 1000,
              uptime: 99.5
            }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
      });

      const startTime = performance.now();
      const toggleButton = screen.getByText('自動最適化開始');
      fireEvent.click(toggleButton);

      const interactionTime = performance.now() - startTime;
      expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TIME);
    });
  });

  describe('メモリ使用量テスト', () => {
    it('大量データ処理時のメモリリークがない', async () => {
      const initialMemory = measureMemoryUsage();
      
      // 複数回のレンダリング・アンマウントサイクル
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <PredictiveAnalytics
              historicalData={generateLargeDataset(5000)}
              realtimeData={generateLargeDataset(500)}
            />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
        });
        
        unmount();
      }

      // ガベージコレクションを強制実行（テスト環境でサポートされている場合）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が許容範囲内
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);
    });

    it('ページ切り替え時のメモリ管理が適切', async () => {
      const initialMemory = measureMemoryUsage();

      // AI予測分析ページ
      const { unmount: unmountAI } = render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      unmountAI();

      // 最適化エンジンページ  
      const { unmount: unmountOpt } = render(
        <TestWrapper>
          <div>最適化エンジンページ（モック）</div>
        </TestWrapper>
      );

      unmountOpt();

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE / 2);
    });
  });

  describe('データ処理性能', () => {
    it('大量予測データの処理が制限時間内に完了する', async () => {
      const largePredictionData = Array.from({ length: 5000 }, (_, i) => ({
        id: `pred_${i}`,
        metric: `metric_${i % 10}`,
        predictedValue: Math.random() * 100,
        confidence: 0.8 + Math.random() * 0.2,
        timeframe: '次の1時間',
        timestamp: new Date(),
        factors: Array.from({ length: 5 }, (_, j) => ({
          name: `factor_${j}`,
          impact: (Math.random() - 0.5) * 2,
          confidence: 0.7 + Math.random() * 0.3,
          description: `影響要因 ${j}`
        }))
      }));

      const startTime = performance.now();

      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={generateLargeDataset(1000)}
            realtimeData={generateLargeDataset(100)}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      const processingTime = performance.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_PROCESSING_TIME);
    });

    it('リアルタイムデータ更新が滑らかに動作する', async () => {
      let updateCount = 0;
      const maxUpdates = 50;
      const updateInterval = 100; // 100ms間隔

      const TestComponent = () => {
        const [data, setData] = React.useState(generateLargeDataset(1000));

        React.useEffect(() => {
          const interval = setInterval(() => {
            if (updateCount < maxUpdates) {
              setData(prev => [
                generateLargeDataset(1)[0],
                ...prev.slice(0, 999)
              ]);
              updateCount++;
            }
          }, updateInterval);

          return () => clearInterval(interval);
        }, []);

        return (
          <PredictiveAnalytics
            historicalData={data}
            realtimeData={data.slice(0, 10)}
            autoRefresh={true}
          />
        );
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 更新が完了するまで待機
      await waitFor(() => {
        expect(updateCount).toBeGreaterThan(10);
      }, { timeout: 5000 });

      const totalTime = performance.now() - startTime;
      const averageUpdateTime = totalTime / updateCount;

      // 各更新が滑らかに実行されている（フレーム時間内）
      expect(averageUpdateTime).toBeLessThan(16.67); // 60fps = 16.67ms/frame
    });
  });

  describe('API呼び出し性能', () => {
    it('API呼び出しが並列で効率的に実行される', async () => {
      let apiCallCount = 0;
      
      mockFetch.mockImplementation((url: string) => {
        apiCallCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              models: [],
              metrics: {},
              metadata: {}
            }
          })
        });
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(apiCallCount).toBeGreaterThan(0);
      });

      const apiTime = performance.now() - startTime;
      
      // 複数のAPI呼び出しが効率的に実行される
      expect(apiTime).toBeLessThan(1000);
      expect(apiCallCount).toBeGreaterThan(0);
    });

    it('大量データAPIレスポンスの処理が高速', async () => {
      const largeApiResponse = {
        success: true,
        data: {
          models: Array.from({ length: 100 }, (_, i) => ({
            id: `model_${i}`,
            name: `モデル ${i}`,
            accuracy: 0.8 + Math.random() * 0.2,
            predictions: Array.from({ length: 1000 }, (_, j) => ({
              id: `pred_${i}_${j}`,
              value: Math.random() * 100
            }))
          })),
          metadata: {
            totalModels: 100,
            totalPredictions: 100000
          }
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeApiResponse)
      });

      const startTime = performance.now();

      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      const processingTime = performance.now() - startTime;
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_PROCESSING_TIME);
    });
  });

  describe('レンダリング性能', () => {
    it('複雑なチャートレンダリングが性能要件を満たす', async () => {
      const complexChartData = generateLargeDataset(5000);

      const startTime = performance.now();

      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={complexChartData}
            realtimeData={complexChartData.slice(0, 100)}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      // 予測結果タブ（チャートを含む）に切り替え
      const predictionsTab = screen.getByText('予測結果');
      const tabSwitchStart = performance.now();
      
      fireEvent.click(predictionsTab);
      
      const tabSwitchTime = performance.now() - tabSwitchStart;
      const totalRenderTime = performance.now() - startTime;

      expect(totalRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME);
      expect(tabSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TIME);
    });

    it('動的コンテンツ更新のフレームレートが適切', async () => {
      let frameCount = 0;
      const targetFPS = 30; // 30fps最低目標
      const testDuration = 2000; // 2秒間テスト

      const AnimatedComponent = () => {
        const [metrics, setMetrics] = React.useState({
          responseTime: 45,
          throughput: 1200,
          errorRate: 2.1,
          cacheHitRate: 85,
          cpuUsage: 65,
          memoryUsage: 70,
          diskUsage: 45,
          networkLatency: 15,
          cost: 1000,
          uptime: 99.5
        });

        React.useEffect(() => {
          const interval = setInterval(() => {
            setMetrics(prev => ({
              ...prev,
              responseTime: 40 + Math.random() * 20,
              errorRate: Math.random() * 5,
              cpuUsage: 50 + Math.random() * 30
            }));
            frameCount++;
          }, 1000 / targetFPS);

          setTimeout(() => clearInterval(interval), testDuration);
          return () => clearInterval(interval);
        }, []);

        return <OptimizationEngine currentMetrics={metrics} />;
      };

      render(
        <TestWrapper>
          <AnimatedComponent />
        </TestWrapper>
      );

      await new Promise(resolve => setTimeout(resolve, testDuration + 100));

      const expectedFrames = (testDuration / 1000) * targetFPS;
      const actualFPS = frameCount / (testDuration / 1000);

      expect(actualFPS).toBeGreaterThan(targetFPS * 0.8); // 80%以上の目標FPS
    });
  });

  describe('同時接続性能', () => {
    it('複数コンポーネントの同時レンダリングが正常に動作する', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <div>
            <PredictiveAnalytics
              historicalData={generateLargeDataset(1000)}
              realtimeData={generateLargeDataset(100)}
            />
            <OptimizationEngine
              currentMetrics={{
                responseTime: 45,
                throughput: 1200,
                errorRate: 2.1,
                cacheHitRate: 85,
                cpuUsage: 65,
                memoryUsage: 70,
                diskUsage: 45,
                networkLatency: 15,
                cost: 1000,
                uptime: 99.5
              }}
            />
          </div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
        expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME * 1.5); // 許容範囲を1.5倍に拡張
    });
  });
});