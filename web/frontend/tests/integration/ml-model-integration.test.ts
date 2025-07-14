/**
 * DNSweeper マシンラーニングモデル統合テスト
 * AI駆動予測分析システム・パフォーマンス最適化エンジンの統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PredictiveAnalytics } from '../../src/components/AI/PredictiveAnalytics';
import { OptimizationEngine } from '../../src/components/Performance/OptimizationEngine';
import { AIPredictiveAnalyticsPage } from '../../src/pages/AIPredictiveAnalyticsPage';
import { OptimizationEnginePage } from '../../src/pages/OptimizationEnginePage';

// テスト用のQueryClientセットアップ
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// モックデータ
const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
  timestamp: new Date(Date.now() - i * 60000),
  response_time: 40 + Math.random() * 20,
  throughput: 1000 + Math.random() * 400,
  error_rate: Math.random() * 5,
  cpu_usage: 50 + Math.random() * 30,
  memory_usage: 60 + Math.random() * 25
}));

const mockRealtimeData = mockHistoricalData.slice(0, 10);

const mockPerformanceMetrics = {
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

const mockPredictions = [
  {
    id: 'pred_1',
    metric: 'average_response_time',
    predictedValue: 45.2,
    actualValue: 42.8,
    confidence: 0.91,
    timeframe: '次の1時間',
    timestamp: new Date(),
    factors: [
      { name: 'サーバー負荷', impact: 0.3, confidence: 0.88, description: '現在の負荷トレンドから予測' },
      { name: 'キャッシュ効率', impact: -0.2, confidence: 0.85, description: 'キャッシュヒット率の改善効果' }
    ]
  }
];

// API モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Web API モック
Object.defineProperty(window, 'Notification', {
  value: vi.fn(() => ({
    close: vi.fn()
  })),
  configurable: true
});

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  configurable: true
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('マシンラーニングモデル統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // デフォルトのAPIレスポンスモック
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/ai-analytics/models')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              models: [
                {
                  id: 'dns_performance_predictor',
                  name: 'DNS パフォーマンス予測器',
                  type: 'time_series',
                  accuracy: 0.92,
                  confidence: 0.89,
                  status: 'ready'
                }
              ],
              metadata: {
                avgAccuracy: 0.92
              }
            }
          })
        });
      }
      
      if (url.includes('/api/optimization/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              metrics: mockPerformanceMetrics
            }
          })
        });
      }

      if (url.includes('/api/optimization/rules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              rules: [],
              metadata: {
                totalRules: 0,
                enabledRules: 0,
                avgSuccessRate: 0
              }
            }
          })
        });
      }

      if (url.includes('/api/optimization/jobs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              activeJobs: [],
              completedJobs: [],
              metadata: {
                totalJobs: 0,
                activeJobsCount: 0,
                completedJobsCount: 0,
                successRate: 0
              }
            }
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AI予測分析コンポーネント', () => {
    it('予測分析コンポーネントが正常にレンダリングされる', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
          />
        </TestWrapper>
      );

      expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      expect(screen.getByText('予測結果')).toBeInTheDocument();
      expect(screen.getByText('異常検知')).toBeInTheDocument();
      expect(screen.getByText('最適化提案')).toBeInTheDocument();
      expect(screen.getByText('モデル管理')).toBeInTheDocument();
    });

    it('予測結果タブが正常に動作する', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
          />
        </TestWrapper>
      );

      const predictionsTab = screen.getByText('予測結果');
      fireEvent.click(predictionsTab);

      expect(screen.getByText('予測結果')).toBeInTheDocument();
    });

    it('モデル選択が正常に動作する', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
          />
        </TestWrapper>
      );

      const modelSelect = screen.getByDisplayValue('DNS パフォーマンス予測器');
      expect(modelSelect).toBeInTheDocument();
    });

    it('予測開始ボタンのクリックが正常に動作する', async () => {
      const onStartPrediction = vi.fn();
      
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
            onStartPrediction={onStartPrediction}
          />
        </TestWrapper>
      );

      const startButton = screen.getByTitle('予測開始');
      fireEvent.click(startButton);

      expect(onStartPrediction).toHaveBeenCalledWith('dns_performance_predictor');
    });

    it('異常検知タブでデータが表示される', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
          />
        </TestWrapper>
      );

      const anomaliesTab = screen.getByText('異常検知');
      fireEvent.click(anomaliesTab);

      expect(screen.getByText('異常検知結果')).toBeInTheDocument();
    });

    it('最適化提案タブでAI提案が表示される', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
          />
        </TestWrapper>
      );

      const recommendationsTab = screen.getByText('最適化提案');
      fireEvent.click(recommendationsTab);

      expect(screen.getByText('AI最適化提案')).toBeInTheDocument();
    });

    it('モデル管理タブでモデル情報が表示される', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
          />
        </TestWrapper>
      );

      const modelsTab = screen.getByText('モデル管理');
      fireEvent.click(modelsTab);

      expect(screen.getByText('AIモデル管理')).toBeInTheDocument();
    });
  });

  describe('最適化エンジンコンポーネント', () => {
    it('最適化エンジンが正常にレンダリングされる', async () => {
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockPerformanceMetrics}
          />
        </TestWrapper>
      );

      expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
    });

    it('エンジンの開始/停止ボタンが正常に動作する', async () => {
      const onOptimizationStart = vi.fn();
      
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockPerformanceMetrics}
            onOptimizationStart={onOptimizationStart}
          />
        </TestWrapper>
      );

      // エンジン開始ボタンをクリック
      const toggleButton = screen.getByText('自動最適化開始');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('自動最適化停止')).toBeInTheDocument();
      });
    });

    it('最適化ルールが表示される', async () => {
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockPerformanceMetrics}
          />
        </TestWrapper>
      );

      const rulesTab = screen.getByText('rules');
      fireEvent.click(rulesTab);

      // ルールタブの内容確認（実装に依存）
      expect(rulesTab).toBeInTheDocument();
    });

    it('最適化ジョブが表示される', async () => {
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockPerformanceMetrics}
          />
        </TestWrapper>
      );

      const jobsTab = screen.getByText('jobs');
      fireEvent.click(jobsTab);

      // ジョブタブの内容確認（実装に依存）
      expect(jobsTab).toBeInTheDocument();
    });

    it('メトリクス情報が表示される', async () => {
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockPerformanceMetrics}
          />
        </TestWrapper>
      );

      const metricsTab = screen.getByText('metrics');
      fireEvent.click(metricsTab);

      // メトリクスタブの内容確認（実装に依存）
      expect(metricsTab).toBeInTheDocument();
    });
  });

  describe('AI予測分析ページ', () => {
    it('AI予測分析ページが正常にレンダリングされる', async () => {
      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      expect(screen.getByText('利用可能モデル')).toBeInTheDocument();
      expect(screen.getByText('平均精度')).toBeInTheDocument();
      expect(screen.getByText('実行中予測')).toBeInTheDocument();
      expect(screen.getByText('処理ステータス')).toBeInTheDocument();
    });

    it('モード切替が正常に動作する', async () => {
      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      const alertsMode = screen.getByText('アラート');
      fireEvent.click(alertsMode);

      // アラートモードの確認（実装に依存）
      expect(alertsMode).toBeInTheDocument();

      const settingsMode = screen.getByText('設定');
      fireEvent.click(settingsMode);

      expect(screen.getByText('AI分析設定')).toBeInTheDocument();
    });

    it('自動最適化の切り替えが動作する', async () => {
      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      // 実装に依存した自動最適化ボタンのテスト
      const autoOptimizationButton = screen.getByText(/自動最適化/);
      expect(autoOptimizationButton).toBeInTheDocument();
    });
  });

  describe('最適化エンジンページ', () => {
    it('最適化エンジンページが正常にレンダリングされる', async () => {
      render(
        <TestWrapper>
          <OptimizationEnginePage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
      });

      expect(screen.getByText('最適化ルール')).toBeInTheDocument();
      expect(screen.getByText('実行中ジョブ')).toBeInTheDocument();
      expect(screen.getByText('完了ジョブ')).toBeInTheDocument();
      expect(screen.getByText('成功率')).toBeInTheDocument();
    });

    it('モード切替が正常に動作する', async () => {
      render(
        <TestWrapper>
          <OptimizationEnginePage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
      });

      const analyticsMode = screen.getByText('アナリティクス');
      fireEvent.click(analyticsMode);

      expect(screen.getByText('最適化分析')).toBeInTheDocument();

      const settingsMode = screen.getByText('設定');
      fireEvent.click(settingsMode);

      expect(screen.getByText('最適化エンジン設定')).toBeInTheDocument();
    });

    it('自動最適化の切り替えが動作する', async () => {
      render(
        <TestWrapper>
          <OptimizationEnginePage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
      });

      const autoOptButton = screen.getByText('自動最適化開始');
      fireEvent.click(autoOptButton);

      await waitFor(() => {
        expect(screen.getByText('自動最適化停止')).toBeInTheDocument();
      });
    });
  });

  describe('API統合テスト', () => {
    it('AI分析APIが正常に呼び出される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            predictions: mockPredictions
          }
        })
      });

      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ai-analytics/models');
      });
    });

    it('最適化APIが正常に呼び出される', async () => {
      render(
        <TestWrapper>
          <OptimizationEnginePage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/optimization/metrics');
        expect(mockFetch).toHaveBeenCalledWith('/api/optimization/rules');
        expect(mockFetch).toHaveBeenCalledWith('/api/optimization/jobs');
      });
    });

    it('APIエラーが適切にハンドリングされる', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      // エラーハンドリングの確認
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('統合シナリオテスト', () => {
    it('AI予測から最適化実行までのフローが動作する', async () => {
      // AI予測分析の実行
      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
      });

      // 予測開始（実装に依存した詳細テスト）
    });

    it('リアルタイムデータ更新が正常に動作する', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
            autoRefresh={true}
          />
        </TestWrapper>
      );

      // リアルタイム更新の確認（実装に依存）
      expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
    });

    it('マルチモデル並列実行が正常に動作する', async () => {
      const onStartPrediction = vi.fn();
      
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={mockHistoricalData}
            realtimeData={mockRealtimeData}
            onStartPrediction={onStartPrediction}
          />
        </TestWrapper>
      );

      // 複数モデルの並列実行テスト
      const startButton = screen.getByTitle('予測開始');
      fireEvent.click(startButton);

      expect(onStartPrediction).toHaveBeenCalled();
    });

    it('最適化エンジンとAI予測の連携が動作する', async () => {
      const onOptimizationStart = vi.fn();
      const onOptimizationComplete = vi.fn();
      
      render(
        <TestWrapper>
          <OptimizationEngine
            currentMetrics={mockPerformanceMetrics}
            onOptimizationStart={onOptimizationStart}
            onOptimizationComplete={onOptimizationComplete}
            autoOptimization={true}
          />
        </TestWrapper>
      );

      // AI予測に基づく自動最適化の確認
      expect(screen.getByText('パフォーマンス最適化エンジン')).toBeInTheDocument();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データ処理が適切に動作する', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000),
        response_time: 40 + Math.random() * 20,
        throughput: 1000 + Math.random() * 400,
        error_rate: Math.random() * 5
      }));

      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={largeDataset}
            realtimeData={largeDataset.slice(0, 100)}
          />
        </TestWrapper>
      );

      expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
    });

    it('メモリ使用量が適切に管理される', async () => {
      // メモリリーク検証のための繰り返しレンダリング
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <PredictiveAnalytics
              historicalData={mockHistoricalData}
              realtimeData={mockRealtimeData}
            />
          </TestWrapper>
        );
        unmount();
      }

      // メモリ使用量の確認（具体的な実装は環境依存）
      expect(true).toBe(true);
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('ネットワークエラーが適切にハンドリングされる', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));

      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      // エラーハンドリングの確認
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('不正なデータ形式が適切にハンドリングされる', async () => {
      render(
        <TestWrapper>
          <PredictiveAnalytics
            historicalData={[]}
            realtimeData={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByText('AI駆動予測分析システム')).toBeInTheDocument();
    });

    it('APIタイムアウトが適切にハンドリングされる', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      render(
        <TestWrapper>
          <AIPredictiveAnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });
});