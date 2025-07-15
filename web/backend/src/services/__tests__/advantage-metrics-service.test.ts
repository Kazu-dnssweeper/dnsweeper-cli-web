/**
 * AdvantageMetricsService テストスイート
 */

import { AdvantageMetricsService, AdvantageMetrics, ROIAnalysis } from '../advantage-metrics-service';
import { InnovationMetrics } from '../../types/competitive-advantages';

describe('AdvantageMetricsService', () => {
  let service: AdvantageMetricsService;

  beforeEach(() => {
    service = new AdvantageMetricsService();
  });

  describe('初期化', () => {
    it('メトリクスが初期化される', () => {
      const current = service.getCurrentMetrics();
      expect(current).toBeDefined();
      expect(current?.period).toBe('2024 Q1');
      expect(current?.overallScore).toBe(82.5);
    });

    it('イノベーションパイプラインが初期化される', () => {
      const pipeline = service.analyzePipeline();
      expect(pipeline.size).toBeGreaterThan(0);
      expect(pipeline.has('Ideation')).toBe(true);
      expect(pipeline.has('Development')).toBe(true);
    });
  });

  describe('メトリクス管理', () => {
    it('現在のメトリクスを取得できる', () => {
      const metrics = service.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.categoryScores).toBeDefined();
      expect(metrics?.kpis).toBeDefined();
      expect(metrics?.trends).toBeDefined();
      expect(metrics?.benchmarks).toBeDefined();
    });

    it('期間別メトリクスを取得できる', () => {
      const metrics = service.getMetricsByPeriod('2024 Q1');
      expect(metrics).toBeDefined();
      expect(metrics?.period).toBe('2024 Q1');
    });

    it('新しいメトリクスを追加できる', () => {
      const newMetrics: AdvantageMetrics = {
        id: 'test-metrics',
        period: '2024 Q2',
        overallScore: 85,
        categoryScores: {
          innovation: 88,
          marketPosition: 80,
          technology: 90,
          financial: 82,
          operational: 84,
          customer: 89
        },
        kpis: {
          rdIntensity: 0.20,
          innovationIndex: 88,
          timeToMarket: 14,
          successRate: 0.75,
          revenueFromNewProducts: 0.45,
          patentApplications: 32,
          customerSatisfaction: 4.7,
          marketShareGrowth: 0.50,
          operationalEfficiency: 0.85,
          employeeProductivity: 150000
        },
        trends: {
          rdInvestment: {
            current: 50000000,
            previous: 45000000,
            change: 0.111,
            trend: 'improving',
            projection: 55000000
          },
          innovationOutput: {
            current: 170,
            previous: 156,
            change: 0.090,
            trend: 'improving',
            projection: 185
          },
          marketPerformance: {
            current: 0.095,
            previous: 0.085,
            change: 0.118,
            trend: 'improving',
            projection: 0.106
          },
          operationalMetrics: {
            current: 0.85,
            previous: 0.82,
            change: 0.037,
            trend: 'stable',
            projection: 0.87
          }
        },
        benchmarks: {
          industry: {
            rdIntensity: { ours: 0.20, benchmark: 0.12, gap: 0.08, position: 'ahead' },
            innovationIndex: { ours: 88, benchmark: 72, gap: 16, position: 'ahead' },
            timeToMarket: { ours: 14, benchmark: 22, gap: -8, position: 'ahead' },
            successRate: { ours: 0.75, benchmark: 0.58, gap: 0.17, position: 'ahead' },
            marketShareGrowth: { ours: 0.50, benchmark: 0.25, gap: 0.25, position: 'ahead' }
          },
          competitors: {
            rdIntensity: { ours: 0.20, benchmark: 0.15, gap: 0.05, position: 'ahead' },
            innovationIndex: { ours: 88, benchmark: 78, gap: 10, position: 'ahead' },
            timeToMarket: { ours: 14, benchmark: 18, gap: -4, position: 'ahead' },
            successRate: { ours: 0.75, benchmark: 0.65, gap: 0.10, position: 'ahead' },
            marketShareGrowth: { ours: 0.50, benchmark: 0.35, gap: 0.15, position: 'ahead' }
          },
          bestInClass: {
            rdIntensity: { ours: 0.20, benchmark: 0.22, gap: -0.02, position: 'behind' },
            innovationIndex: { ours: 88, benchmark: 92, gap: -4, position: 'behind' },
            timeToMarket: { ours: 14, benchmark: 12, gap: 2, position: 'behind' },
            successRate: { ours: 0.75, benchmark: 0.85, gap: -0.10, position: 'behind' },
            marketShareGrowth: { ours: 0.50, benchmark: 0.60, gap: -0.10, position: 'behind' }
          }
        },
        recommendations: []
      };

      service.addMetrics(newMetrics);
      const retrieved = service.getMetricsByPeriod('2024 Q2');
      expect(retrieved).toEqual(newMetrics);
    });
  });

  describe('イノベーションメトリクス計算', () => {
    it('イノベーションメトリクスを正しく計算する', () => {
      const metrics = service.calculateInnovationMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.overview.rdIntensity).toBe(0.18);
      expect(metrics.overview.innovationIndex).toBe(85);
      expect(metrics.input.rdInvestment).toBe(45000000);
      expect(metrics.process.projectsInPipeline).toBeGreaterThan(0);
      expect(metrics.output.featuresDelivered).toBe(156);
      expect(metrics.impact.marketShareGain).toBe(0.45);
    });

    it('全ての必須フィールドが存在する', () => {
      const metrics = service.calculateInnovationMetrics();
      
      expect(metrics.overview).toBeDefined();
      expect(metrics.input).toBeDefined();
      expect(metrics.process).toBeDefined();
      expect(metrics.output).toBeDefined();
      expect(metrics.impact).toBeDefined();
      
      expect(Object.keys(metrics.overview)).toHaveLength(5);
      expect(Object.keys(metrics.input)).toHaveLength(4);
      expect(Object.keys(metrics.process)).toHaveLength(4);
      expect(Object.keys(metrics.output)).toHaveLength(4);
      expect(Object.keys(metrics.impact)).toHaveLength(4);
    });
  });

  describe('ROI分析', () => {
    it('全体のROI分析を実行できる', () => {
      const analysis = service.performROIAnalysis();
      
      expect(analysis).toBeDefined();
      expect(analysis.totalInvestment).toBeGreaterThan(0);
      expect(analysis.totalReturn).toBeGreaterThan(0);
      expect(analysis.roi).toBeGreaterThan(0);
      expect(analysis.paybackPeriod).toBeGreaterThan(0);
      expect(analysis.npv).toBeDefined();
      expect(analysis.irr).toBeDefined();
      expect(analysis.breakEvenPoint).toBeDefined();
    });

    it('感度分析が含まれる', () => {
      const analysis = service.performROIAnalysis();
      
      expect(analysis.sensitivityAnalysis).toBeDefined();
      expect(analysis.sensitivityAnalysis.baseCase).toBeDefined();
      expect(analysis.sensitivityAnalysis.optimistic).toBeDefined();
      expect(analysis.sensitivityAnalysis.pessimistic).toBeDefined();
      expect(analysis.sensitivityAnalysis.keyDrivers.length).toBeGreaterThan(0);
      expect(analysis.sensitivityAnalysis.riskFactors.length).toBeGreaterThan(0);
    });

    it('楽観的シナリオがベースケースより良い結果を示す', () => {
      const analysis = service.performROIAnalysis();
      
      expect(analysis.sensitivityAnalysis.optimistic.roi).toBeGreaterThan(
        analysis.sensitivityAnalysis.baseCase.roi
      );
      expect(analysis.sensitivityAnalysis.optimistic.npv).toBeGreaterThan(
        analysis.sensitivityAnalysis.baseCase.npv
      );
      expect(analysis.sensitivityAnalysis.optimistic.paybackPeriod).toBeLessThan(
        analysis.sensitivityAnalysis.baseCase.paybackPeriod
      );
    });
  });

  describe('パイプライン分析', () => {
    it('パイプラインステージを分析できる', () => {
      const pipeline = service.analyzePipeline();
      
      expect(pipeline.size).toBeGreaterThan(0);
      
      const ideation = pipeline.get('Ideation');
      expect(ideation).toBeDefined();
      expect(ideation?.projects.length).toBeGreaterThan(0);
      expect(ideation?.metrics).toBeDefined();
      expect(ideation?.forecast).toBeDefined();
    });

    it('プロジェクトデータが完全である', () => {
      const pipeline = service.analyzePipeline();
      
      pipeline.forEach(stage => {
        stage.projects.forEach(project => {
          expect(project.id).toBeDefined();
          expect(project.name).toBeDefined();
          expect(project.investmentToDate).toBeGreaterThan(0);
          expect(project.projectedRevenue).toBeGreaterThan(0);
          expect(project.probability).toBeGreaterThan(0);
          expect(project.probability).toBeLessThanOrEqual(1);
          expect(['low', 'medium', 'high']).toContain(project.riskLevel);
          expect(project.strategicValue).toBeGreaterThanOrEqual(1);
          expect(project.strategicValue).toBeLessThanOrEqual(10);
        });
      });
    });
  });

  describe('トレンド分析', () => {
    it('メトリクストレンドを分析できる', () => {
      const trends = service.analyzeMetricTrends('rdIntensity', 1);
      
      expect(trends).toHaveLength(1);
      expect(trends[0].current).toBe(0.18);
      expect(trends[0].trend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(trends[0].trend);
    });

    it('複数期間のトレンドを分析できる', () => {
      // 複数期間のメトリクスを追加
      const periods = ['2023 Q3', '2023 Q4', '2024 Q1'];
      periods.forEach((period, index) => {
        service.addMetrics({
          id: `metrics-${period}`,
          period,
          overallScore: 80 + index,
          categoryScores: {
            innovation: 85,
            marketPosition: 78,
            technology: 88,
            financial: 80,
            operational: 82,
            customer: 87
          },
          kpis: {
            rdIntensity: 0.16 + (index * 0.01),
            innovationIndex: 83 + index,
            timeToMarket: 18 - index,
            successRate: 0.70 + (index * 0.01),
            revenueFromNewProducts: 0.40 + (index * 0.01),
            patentApplications: 25 + index,
            customerSatisfaction: 4.5 + (index * 0.05),
            marketShareGrowth: 0.40 + (index * 0.025),
            operationalEfficiency: 0.80 + (index * 0.01),
            employeeProductivity: 140000 + (index * 5000)
          },
          trends: {
            rdInvestment: { current: 40000000, previous: 38000000, change: 0.05, trend: 'improving', projection: 42000000 },
            innovationOutput: { current: 150, previous: 140, change: 0.07, trend: 'improving', projection: 160 },
            marketPerformance: { current: 0.08, previous: 0.075, change: 0.067, trend: 'improving', projection: 0.085 },
            operationalMetrics: { current: 0.80, previous: 0.78, change: 0.026, trend: 'stable', projection: 0.82 }
          },
          benchmarks: {
            industry: {
              rdIntensity: { ours: 0.16, benchmark: 0.12, gap: 0.04, position: 'ahead' },
              innovationIndex: { ours: 83, benchmark: 72, gap: 11, position: 'ahead' },
              timeToMarket: { ours: 18, benchmark: 22, gap: -4, position: 'ahead' },
              successRate: { ours: 0.70, benchmark: 0.58, gap: 0.12, position: 'ahead' },
              marketShareGrowth: { ours: 0.40, benchmark: 0.25, gap: 0.15, position: 'ahead' }
            },
            competitors: {
              rdIntensity: { ours: 0.16, benchmark: 0.15, gap: 0.01, position: 'ahead' },
              innovationIndex: { ours: 83, benchmark: 78, gap: 5, position: 'ahead' },
              timeToMarket: { ours: 18, benchmark: 18, gap: 0, position: 'at-par' },
              successRate: { ours: 0.70, benchmark: 0.65, gap: 0.05, position: 'ahead' },
              marketShareGrowth: { ours: 0.40, benchmark: 0.35, gap: 0.05, position: 'ahead' }
            },
            bestInClass: {
              rdIntensity: { ours: 0.16, benchmark: 0.22, gap: -0.06, position: 'behind' },
              innovationIndex: { ours: 83, benchmark: 92, gap: -9, position: 'behind' },
              timeToMarket: { ours: 18, benchmark: 12, gap: 6, position: 'behind' },
              successRate: { ours: 0.70, benchmark: 0.85, gap: -0.15, position: 'behind' },
              marketShareGrowth: { ours: 0.40, benchmark: 0.60, gap: -0.20, position: 'behind' }
            }
          },
          recommendations: []
        });
      });

      const trends = service.analyzeMetricTrends('rdIntensity', 4);
      expect(trends.length).toBeGreaterThan(1);
      
      // トレンドが正しく計算されているか確認
      trends.forEach(trend => {
        expect(trend.current).toBeGreaterThan(0);
        expect(trend.projection).toBeGreaterThan(0);
      });
    });
  });

  describe('ベンチマーク分析', () => {
    it('デフォルトのベンチマーク分析を実行できる', () => {
      const benchmark = service.performBenchmarkAnalysis();
      
      expect(benchmark).toBeDefined();
      expect(benchmark.rdIntensity).toBeDefined();
      expect(benchmark.innovationIndex).toBeDefined();
      expect(benchmark.timeToMarket).toBeDefined();
      expect(benchmark.successRate).toBeDefined();
      expect(benchmark.marketShareGrowth).toBeDefined();
    });

    it('カスタム競合データでベンチマーク分析を実行できる', () => {
      const competitorData = {
        rdIntensity: 0.20,
        innovationIndex: 90,
        timeToMarket: 12,
        successRate: 0.80,
        marketShareGrowth: 0.50
      };
      
      const benchmark = service.performBenchmarkAnalysis(competitorData);
      
      expect(benchmark.rdIntensity.benchmark).toBe(0.20);
      expect(benchmark.innovationIndex.benchmark).toBe(90);
      expect(benchmark.timeToMarket.benchmark).toBe(12);
      expect(benchmark.successRate.benchmark).toBe(0.80);
      expect(benchmark.marketShareGrowth.benchmark).toBe(0.50);
    });

    it('ポジション判定が正しい', () => {
      const benchmark = service.performBenchmarkAnalysis({
        rdIntensity: 0.10, // 我々の方が高い
        innovationIndex: 90, // 我々の方が低い
        timeToMarket: 20, // 我々の方が速い（低い値が良い）
        successRate: 0.70, // 我々の方が高い
        marketShareGrowth: 0.45 // 同じ
      });
      
      expect(benchmark.rdIntensity.position).toBe('ahead');
      expect(benchmark.innovationIndex.position).toBe('behind');
      expect(benchmark.timeToMarket.position).toBe('ahead');
      expect(benchmark.successRate.position).toBe('ahead');
      expect(benchmark.marketShareGrowth.position).toBe('at-par');
    });
  });

  describe('推奨事項生成', () => {
    it('推奨事項を生成できる', () => {
      const recommendations = service.generateRecommendations();
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach(rec => {
        expect(rec.area).toBeDefined();
        expect(rec.metric).toBeDefined();
        expect(rec.current).toBeDefined();
        expect(rec.target).toBeDefined();
        expect(rec.gap).toBeDefined();
        expect(rec.actions.length).toBeGreaterThan(0);
        expect(['high', 'medium', 'low']).toContain(rec.impact);
        expect(['high', 'medium', 'low']).toContain(rec.effort);
      });
    });

    it('ベストインクラスとのギャップに基づいて推奨事項を生成する', () => {
      const recommendations = service.generateRecommendations();
      
      // 現在のメトリクスでベストインクラスに遅れている項目があることを確認
      const current = service.getCurrentMetrics();
      const behindMetrics = Object.entries(current?.benchmarks.bestInClass || {})
        .filter(([_, comparison]) => comparison.position === 'behind' && Math.abs(comparison.gap) > 0.1);
      
      // 推奨事項の数が適切であることを確認
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(behindMetrics.length);
    });
  });

  describe('データ整合性', () => {
    it('カテゴリスコアが有効な範囲内にある', () => {
      const metrics = service.getCurrentMetrics();
      
      Object.values(metrics?.categoryScores || {}).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('KPIが有効な範囲内にある', () => {
      const metrics = service.getCurrentMetrics();
      
      expect(metrics?.kpis.rdIntensity).toBeGreaterThan(0);
      expect(metrics?.kpis.rdIntensity).toBeLessThan(1);
      expect(metrics?.kpis.successRate).toBeGreaterThan(0);
      expect(metrics?.kpis.successRate).toBeLessThanOrEqual(1);
      expect(metrics?.kpis.customerSatisfaction).toBeGreaterThanOrEqual(1);
      expect(metrics?.kpis.customerSatisfaction).toBeLessThanOrEqual(5);
    });

    it('トレンドデータが整合性を保つ', () => {
      const metrics = service.getCurrentMetrics();
      
      Object.values(metrics?.trends || {}).forEach(trend => {
        expect(trend.current).toBeGreaterThan(0);
        expect(trend.previous).toBeGreaterThan(0);
        expect(['improving', 'stable', 'declining']).toContain(trend.trend);
        expect(trend.projection).toBeGreaterThan(0);
      });
    });
  });
});