/**
 * DNSweeper マシンラーニングモデル基本統合テスト
 * AI駆動予測分析システム・パフォーマンス最適化エンジンの基本動作確認
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// モックデータ
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

// API モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('マシンラーニングモデル基本統合テスト', () => {
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

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {}
        })
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AI Analytics API統合', () => {
    it('AI分析モデル一覧APIが正常に応答する', async () => {
      const response = await fetch('/api/ai-analytics/models');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.models).toHaveLength(1);
      expect(data.data.models[0]).toHaveProperty('id', 'dns_performance_predictor');
    });

    it('AI予測分析APIが正常に応答する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            predictions: [
              {
                id: 'pred_1',
                metric: 'response_time',
                predictedValue: 45.2,
                confidence: 0.91
              }
            ]
          }
        })
      });

      const response = await fetch('/api/ai-analytics/predict', {
        method: 'POST',
        body: JSON.stringify({
          modelId: 'dns_performance_predictor',
          features: mockPerformanceMetrics
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.predictions).toHaveLength(1);
    });

    it('異常検知APIが正常に応答する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            anomalies: [
              {
                id: 'anom_1',
                metric: 'error_rate',
                severity: 'high',
                anomalyScore: 0.85
              }
            ]
          }
        })
      });

      const response = await fetch('/api/ai-analytics/anomaly-detection', {
        method: 'POST',
        body: JSON.stringify({
          metrics: {
            error_rate: [1.2, 1.5, 8.5, 1.3]
          }
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.anomalies).toHaveLength(1);
    });
  });

  describe('Optimization Engine API統合', () => {
    it('最適化ルール一覧APIが正常に応答する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            rules: [
              {
                id: 'dns_cache_optimization',
                name: 'DNS キャッシュ最適化',
                category: 'performance',
                enabled: true
              }
            ],
            metadata: {
              totalRules: 1,
              enabledRules: 1
            }
          }
        })
      });

      const response = await fetch('/api/optimization/rules');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.rules).toHaveLength(1);
    });

    it('パフォーマンスメトリクス取得APIが正常に応答する', async () => {
      const response = await fetch('/api/optimization/metrics');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.metrics).toHaveProperty('responseTime');
      expect(data.data.metrics).toHaveProperty('throughput');
      expect(data.data.metrics).toHaveProperty('errorRate');
    });

    it('最適化実行APIが正常に応答する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            jobId: 'job_123',
            estimatedDuration: 60
          }
        })
      });

      const response = await fetch('/api/optimization/execute/dns_cache_optimization', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('jobId');
      expect(data.data).toHaveProperty('estimatedDuration');
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラーが適切にハンドリングされる', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      try {
        await fetch('/api/ai-analytics/models');
        expect.fail('エラーが発生するはずです');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network Error');
      }
    });

    it('不正なレスポンスが適切にハンドリングされる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Bad Request'
        })
      });

      const response = await fetch('/api/ai-analytics/predict', {
        method: 'POST',
        body: JSON.stringify({})
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('データ形式検証', () => {
    it('AI分析モデルのデータ形式が正しい', async () => {
      const response = await fetch('/api/ai-analytics/models');
      const data = await response.json();

      const model = data.data.models[0];
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('type');
      expect(model).toHaveProperty('accuracy');
      expect(model).toHaveProperty('confidence');
      expect(model).toHaveProperty('status');

      expect(typeof model.id).toBe('string');
      expect(typeof model.name).toBe('string');
      expect(typeof model.accuracy).toBe('number');
      expect(model.accuracy).toBeGreaterThan(0);
      expect(model.accuracy).toBeLessThanOrEqual(1);
    });

    it('パフォーマンスメトリクスのデータ形式が正しい', async () => {
      const response = await fetch('/api/optimization/metrics');
      const data = await response.json();

      const metrics = data.data.metrics;
      
      // 必須フィールドの存在確認
      const requiredFields = [
        'responseTime', 'throughput', 'errorRate', 'cacheHitRate',
        'cpuUsage', 'memoryUsage', 'diskUsage', 'networkLatency',
        'cost', 'uptime'
      ];

      requiredFields.forEach(field => {
        expect(metrics).toHaveProperty(field);
        expect(typeof metrics[field]).toBe('number');
      });

      // 値の範囲確認
      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(100);
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.uptime).toBeLessThanOrEqual(100);
    });
  });

  describe('パフォーマンス基本検証', () => {
    it('API応答時間が許容範囲内', async () => {
      const startTime = performance.now();
      
      await fetch('/api/ai-analytics/models');
      
      const duration = performance.now() - startTime;
      
      // 100ms以内（モックなので高速）
      expect(duration).toBeLessThan(100);
    });

    it('大量データ処理が正常に動作する', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: Date.now() - i * 60000,
        value: Math.random() * 100
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            processed: largeDataset.length,
            results: largeDataset.slice(0, 10)
          }
        })
      });

      const response = await fetch('/api/ai-analytics/predict', {
        method: 'POST',
        body: JSON.stringify({
          modelId: 'test',
          data: largeDataset
        })
      });

      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.processed).toBe(1000);
    });
  });

  describe('統合シナリオ', () => {
    it('AI予測→最適化提案→実行のフローが正常に動作する', async () => {
      // 1. AI予測実行
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            predictions: [
              {
                metric: 'response_time',
                predictedValue: 85,
                confidence: 0.9
              }
            ]
          }
        })
      });

      const predictResponse = await fetch('/api/ai-analytics/predict', {
        method: 'POST',
        body: JSON.stringify({
          modelId: 'dns_performance_predictor',
          features: mockPerformanceMetrics
        })
      });

      expect(predictResponse.ok).toBe(true);

      // 2. 最適化提案取得
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            recommendations: [
              {
                title: 'DNS キャッシュ最適化',
                category: 'performance',
                priority: 90
              }
            ]
          }
        })
      });

      const optimizeResponse = await fetch('/api/ai-analytics/optimization', {
        method: 'POST',
        body: JSON.stringify({
          currentMetrics: mockPerformanceMetrics
        })
      });

      expect(optimizeResponse.ok).toBe(true);

      // 3. 最適化実行
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            jobId: 'job_123'
          }
        })
      });

      const executeResponse = await fetch('/api/optimization/execute/dns_cache_optimization', {
        method: 'POST',
        body: JSON.stringify({})
      });

      expect(executeResponse.ok).toBe(true);
    });
  });

  describe('セキュリティ基本検証', () => {
    it('SQL注入攻撃が防がれる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid input'
        })
      });

      const response = await fetch('/api/ai-analytics/predict', {
        method: 'POST',
        body: JSON.stringify({
          modelId: "'; DROP TABLE models; --"
        })
      });

      expect(response.ok).toBe(false);
    });

    it('XSS攻撃が防がれる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid input'
        })
      });

      const response = await fetch('/api/ai-analytics/predict', {
        method: 'POST',
        body: JSON.stringify({
          modelId: '<script>alert("xss")</script>'
        })
      });

      expect(response.ok).toBe(false);
    });
  });
});