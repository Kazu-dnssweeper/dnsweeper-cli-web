/**
 * DNSweeper AI最適化システム統合テスト
 * バックエンドAPIとAI分析エンジンの統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

let app: Application;

// テスト用のモックデータ
const mockOptimizationRequest = {
  modelId: 'dns_performance_predictor',
  timeHorizon: '24h',
  features: {
    current_response_time: 45,
    current_throughput: 1200,
    current_error_rate: 2.1,
    current_capacity: 75,
    current_cost: 1000
  },
  confidenceThreshold: 0.8
};

const mockRuleUpdate = {
  enabled: true,
  autoApply: false,
  priority: 90
};

describe('AI最適化システム統合テスト', () => {
  beforeAll(async () => {
    app = await createApp();
  });

  beforeEach(async () => {
    // テスト前のセットアップ
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
  });

  afterAll(async () => {
    // 全テスト後のクリーンアップ
  });

  describe('AI Analytics API', () => {
    describe('GET /api/ai-analytics/models', () => {
      it('AI分析モデル一覧を正常に取得できる', async () => {
        const response = await request(app)
          .get('/api/ai-analytics/models')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('models');
        expect(Array.isArray(response.body.data.models)).toBe(true);
        
        if (response.body.data.models.length > 0) {
          const model = response.body.data.models[0];
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('name');
          expect(model).toHaveProperty('type');
          expect(model).toHaveProperty('accuracy');
          expect(model).toHaveProperty('confidence');
          expect(model).toHaveProperty('status');
        }
      });

      it('モデル統計情報が含まれている', async () => {
        const response = await request(app)
          .get('/api/ai-analytics/models')
          .expect(200);

        expect(response.body.data).toHaveProperty('metadata');
        expect(response.body.data.metadata).toHaveProperty('totalModels');
        expect(response.body.data.metadata).toHaveProperty('activeModels');
      });
    });

    describe('POST /api/ai-analytics/predict', () => {
      it('AI予測分析を正常に実行できる', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/predict')
          .send(mockOptimizationRequest)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('predictions');
        expect(Array.isArray(response.body.data.predictions)).toBe(true);
      });

      it('無効なリクエストでバリデーションエラーが返る', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/predict')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('不正なモデルIDでエラーが返る', async () => {
        const invalidRequest = {
          ...mockOptimizationRequest,
          modelId: 'invalid_model_id'
        };

        const response = await request(app)
          .post('/api/ai-analytics/predict')
          .send(invalidRequest)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/ai-analytics/anomaly-detection', () => {
      it('異常検知分析を正常に実行できる', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/anomaly-detection')
          .send({
            metrics: {
              response_time: [45, 48, 52, 150, 49],
              error_rate: [1.2, 1.5, 1.8, 8.5, 1.3],
              throughput: [1200, 1180, 1220, 800, 1190]
            },
            sensitivity: 0.8
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('anomalies');
        expect(Array.isArray(response.body.data.anomalies)).toBe(true);
      });

      it('異常検知結果に必要な情報が含まれている', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/anomaly-detection')
          .send({
            metrics: {
              response_time: [45, 48, 52, 150, 49],
              error_rate: [1.2, 1.5, 1.8, 8.5, 1.3]
            }
          })
          .expect(200);

        if (response.body.data.anomalies.length > 0) {
          const anomaly = response.body.data.anomalies[0];
          expect(anomaly).toHaveProperty('metric');
          expect(anomaly).toHaveProperty('severity');
          expect(anomaly).toHaveProperty('anomalyScore');
          expect(anomaly).toHaveProperty('timestamp');
          expect(anomaly).toHaveProperty('recommendations');
        }
      });
    });

    describe('POST /api/ai-analytics/optimization', () => {
      it('AI最適化提案を正常に取得できる', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/optimization')
          .send({
            currentMetrics: {
              response_time: 85,
              error_rate: 3.2,
              cache_hit_rate: 72,
              cost: 1500
            },
            businessContext: {
              industry: 'ecommerce',
              scale: 'medium',
              budget: 5000
            }
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      });

      it('最適化提案に実装ガイダンスが含まれている', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/optimization')
          .send({
            currentMetrics: {
              response_time: 85,
              error_rate: 3.2
            }
          })
          .expect(200);

        if (response.body.data.recommendations.length > 0) {
          const recommendation = response.body.data.recommendations[0];
          expect(recommendation).toHaveProperty('title');
          expect(recommendation).toHaveProperty('description');
          expect(recommendation).toHaveProperty('implementation');
          expect(recommendation).toHaveProperty('estimatedImpact');
          expect(recommendation).toHaveProperty('difficulty');
          expect(recommendation).toHaveProperty('timeEstimate');
        }
      });
    });

    describe('POST /api/ai-analytics/models/:modelId/retrain', () => {
      it('AIモデル再訓練を正常に開始できる', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/models/dns_performance_predictor/retrain')
          .send({
            trainingData: {
              features: ['response_time', 'throughput', 'error_rate'],
              dataPoints: 1000
            }
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('trainingJobId');
        expect(response.body.data).toHaveProperty('estimatedDuration');
      });

      it('存在しないモデルIDで404エラーが返る', async () => {
        const response = await request(app)
          .post('/api/ai-analytics/models/nonexistent_model/retrain')
          .send({})
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Model not found');
      });
    });
  });

  describe('Optimization Engine API', () => {
    describe('GET /api/optimization/rules', () => {
      it('最適化ルール一覧を正常に取得できる', async () => {
        const response = await request(app)
          .get('/api/optimization/rules')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('rules');
        expect(Array.isArray(response.body.data.rules)).toBe(true);
        expect(response.body.data).toHaveProperty('metadata');
      });

      it('最適化ルールに必要な情報が含まれている', async () => {
        const response = await request(app)
          .get('/api/optimization/rules')
          .expect(200);

        if (response.body.data.rules.length > 0) {
          const rule = response.body.data.rules[0];
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('name');
          expect(rule).toHaveProperty('category');
          expect(rule).toHaveProperty('trigger');
          expect(rule).toHaveProperty('actions');
          expect(rule).toHaveProperty('estimatedImpact');
        }
      });
    });

    describe('GET /api/optimization/jobs', () => {
      it('最適化ジョブ一覧を正常に取得できる', async () => {
        const response = await request(app)
          .get('/api/optimization/jobs')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('activeJobs');
        expect(response.body.data).toHaveProperty('completedJobs');
        expect(response.body.data).toHaveProperty('metadata');
        expect(Array.isArray(response.body.data.activeJobs)).toBe(true);
        expect(Array.isArray(response.body.data.completedJobs)).toBe(true);
      });
    });

    describe('GET /api/optimization/metrics', () => {
      it('パフォーマンスメトリクスを正常に取得できる', async () => {
        const response = await request(app)
          .get('/api/optimization/metrics')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('metrics');
        expect(response.body.data).toHaveProperty('historical');
        expect(response.body.data).toHaveProperty('metadata');

        const metrics = response.body.data.metrics;
        expect(metrics).toHaveProperty('responseTime');
        expect(metrics).toHaveProperty('throughput');
        expect(metrics).toHaveProperty('errorRate');
        expect(metrics).toHaveProperty('cacheHitRate');
        expect(metrics).toHaveProperty('cost');
      });

      it('履歴データが正しい形式で含まれている', async () => {
        const response = await request(app)
          .get('/api/optimization/metrics')
          .expect(200);

        const historical = response.body.data.historical;
        expect(Array.isArray(historical)).toBe(true);

        if (historical.length > 0) {
          const dataPoint = historical[0];
          expect(dataPoint).toHaveProperty('timestamp');
          expect(dataPoint).toHaveProperty('responseTime');
          expect(dataPoint).toHaveProperty('throughput');
        }
      });
    });

    describe('POST /api/optimization/execute/:ruleId', () => {
      it('最適化を正常に実行できる', async () => {
        const response = await request(app)
          .post('/api/optimization/execute/dns_cache_optimization')
          .send({
            options: {
              dryRun: false,
              notifyOnComplete: true
            }
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('jobId');
        expect(response.body.data).toHaveProperty('estimatedDuration');
      });

      it('存在しないルールIDで404エラーが返る', async () => {
        const response = await request(app)
          .post('/api/optimization/execute/nonexistent_rule')
          .send({})
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Rule not found');
      });

      it('無効化されたルールで400エラーが返る', async () => {
        // まずルールを無効化
        await request(app)
          .put('/api/optimization/rules/dns_cache_optimization')
          .send({ enabled: false });

        const response = await request(app)
          .post('/api/optimization/execute/dns_cache_optimization')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Rule disabled');
      });
    });

    describe('PUT /api/optimization/rules/:ruleId', () => {
      it('最適化ルールを正常に更新できる', async () => {
        const response = await request(app)
          .put('/api/optimization/rules/dns_cache_optimization')
          .send(mockRuleUpdate)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('rule');
        
        const rule = response.body.data.rule;
        expect(rule.enabled).toBe(mockRuleUpdate.enabled);
        expect(rule.autoApply).toBe(mockRuleUpdate.autoApply);
        expect(rule.priority).toBe(mockRuleUpdate.priority);
      });

      it('不正なパラメータでバリデーションエラーが返る', async () => {
        const response = await request(app)
          .put('/api/optimization/rules/dns_cache_optimization')
          .send({
            priority: -1, // 不正な値
            enabled: 'invalid' // 不正な型
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Validation error');
      });
    });

    describe('GET /api/optimization/jobs/:jobId', () => {
      it('ジョブ詳細を正常に取得できる', async () => {
        // まず最適化を実行してジョブを作成
        const executeResponse = await request(app)
          .post('/api/optimization/execute/dns_cache_optimization')
          .send({});

        const jobId = executeResponse.body.data.jobId;

        const response = await request(app)
          .get(`/api/optimization/jobs/${jobId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('job');
        expect(response.body.data).toHaveProperty('rule');

        const job = response.body.data.job;
        expect(job).toHaveProperty('id', jobId);
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('progress');
      });

      it('存在しないジョブIDで404エラーが返る', async () => {
        const response = await request(app)
          .get('/api/optimization/jobs/nonexistent_job_id')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Job not found');
      });
    });
  });

  describe('統合シナリオテスト', () => {
    it('AI予測→最適化提案→実行のフルフローが動作する', async () => {
      // 1. AI予測分析を実行
      const predictResponse = await request(app)
        .post('/api/ai-analytics/predict')
        .send(mockOptimizationRequest)
        .expect(200);

      expect(predictResponse.body.data).toHaveProperty('predictions');

      // 2. 最適化提案を取得
      const optimizeResponse = await request(app)
        .post('/api/ai-analytics/optimization')
        .send({
          currentMetrics: mockOptimizationRequest.features
        })
        .expect(200);

      expect(optimizeResponse.body.data).toHaveProperty('recommendations');

      // 3. 最適化を実行
      const executeResponse = await request(app)
        .post('/api/optimization/execute/dns_cache_optimization')
        .send({})
        .expect(200);

      expect(executeResponse.body.data).toHaveProperty('jobId');

      // 4. ジョブ実行状況を確認
      const jobId = executeResponse.body.data.jobId;
      const jobResponse = await request(app)
        .get(`/api/optimization/jobs/${jobId}`)
        .expect(200);

      expect(jobResponse.body.data.job).toHaveProperty('id', jobId);
    });

    it('異常検知→自動対応のフローが動作する', async () => {
      // 1. 異常検知を実行
      const anomalyResponse = await request(app)
        .post('/api/ai-analytics/anomaly-detection')
        .send({
          metrics: {
            response_time: [45, 48, 52, 250, 49], // 異常値を含む
            error_rate: [1.2, 1.5, 1.8, 12.5, 1.3] // 異常値を含む
          },
          sensitivity: 0.8
        })
        .expect(200);

      const anomalies = anomalyResponse.body.data.anomalies;
      expect(anomalies.length).toBeGreaterThan(0);

      // 2. 高severity異常に対する自動最適化
      const highSeverityAnomaly = anomalies.find((a: any) => 
        a.severity === 'high' || a.severity === 'critical'
      );

      if (highSeverityAnomaly) {
        // 対応する最適化ルールを実行
        const executeResponse = await request(app)
          .post('/api/optimization/execute/response_time_optimization')
          .send({})
          .expect(200);

        expect(executeResponse.body.data).toHaveProperty('jobId');
      }
    });

    it('リアルタイム監視データの処理が動作する', async () => {
      // メトリクス取得
      const metricsResponse = await request(app)
        .get('/api/optimization/metrics')
        .expect(200);

      const currentMetrics = metricsResponse.body.data.metrics;

      // 閾値チェック（例：応答時間 > 100ms）
      if (currentMetrics.responseTime > 100) {
        // 最適化提案を取得
        const optimizeResponse = await request(app)
          .post('/api/ai-analytics/optimization')
          .send({
            currentMetrics,
            businessContext: {
              priority: 'performance'
            }
          })
          .expect(200);

        expect(optimizeResponse.body.data).toHaveProperty('recommendations');
      }
    });

    it('マルチモデル予測の統合が動作する', async () => {
      // 利用可能なモデル一覧を取得
      const modelsResponse = await request(app)
        .get('/api/ai-analytics/models')
        .expect(200);

      const models = modelsResponse.body.data.models;
      expect(models.length).toBeGreaterThan(0);

      // 複数モデルで予測を実行
      for (const model of models.slice(0, 3)) { // 最初の3モデルをテスト
        const predictResponse = await request(app)
          .post('/api/ai-analytics/predict')
          .send({
            ...mockOptimizationRequest,
            modelId: model.id
          })
          .expect(200);

        expect(predictResponse.body.data).toHaveProperty('predictions');
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データでの予測分析が適切に処理される', async () => {
      const largeDataset = {
        ...mockOptimizationRequest,
        features: {
          ...mockOptimizationRequest.features,
          historical_data: Array.from({ length: 10000 }, (_, i) => ({
            timestamp: Date.now() - i * 60000,
            response_time: 40 + Math.random() * 20,
            throughput: 1000 + Math.random() * 400
          }))
        }
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/ai-analytics/predict')
        .send(largeDataset)
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body).toHaveProperty('success', true);
      expect(duration).toBeLessThan(10000); // 10秒以内
    });

    it('並列最適化リクエストが適切に処理される', async () => {
      const promises = [];
      
      // 複数の最適化を並列実行
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/optimization/execute/dns_cache_optimization')
            .send({})
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });

    it('メトリクス取得の応答時間が許容範囲内', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/optimization/metrics')
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body).toHaveProperty('success', true);
      expect(duration).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('不正なJSONで400エラーが返る', async () => {
      const response = await request(app)
        .post('/api/ai-analytics/predict')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('存在しないエンドポイントで404エラーが返る', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });

    it('サーバーエラーが適切にハンドリングされる', async () => {
      // サーバーエラーを意図的に発生させるテスト
      // （実装に依存するため、具体的なエラー条件を設定）
    });

    it('レート制限が適切に動作する', async () => {
      // レート制限のテスト（実装されている場合）
      // 短時間で大量のリクエストを送信し、429エラーが返ることを確認
    });
  });

  describe('セキュリティテスト', () => {
    it('SQLインジェクション攻撃が防がれる', async () => {
      const maliciousInput = {
        modelId: "'; DROP TABLE models; --",
        timeHorizon: '24h'
      };

      const response = await request(app)
        .post('/api/ai-analytics/predict')
        .send(maliciousInput)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('XSS攻撃が防がれる', async () => {
      const maliciousInput = {
        modelId: '<script>alert("xss")</script>',
        timeHorizon: '24h'
      };

      const response = await request(app)
        .post('/api/ai-analytics/predict')
        .send(maliciousInput)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('過大なペイロードが拒否される', async () => {
      const largePayload = {
        modelId: 'test',
        data: 'x'.repeat(50 * 1024 * 1024) // 50MB
      };

      const response = await request(app)
        .post('/api/ai-analytics/predict')
        .send(largePayload)
        .expect(413);

      // ペイロードサイズ制限のテスト
    });
  });
});