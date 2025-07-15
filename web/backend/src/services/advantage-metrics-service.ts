/**
 * DNSweeper 競争優位性メトリクスサービス
 * 競争優位性指標の計算と管理、イノベーション指標、KPI計算、パフォーマンス分析
 */

import {
  InnovationMetrics,
  InnovationManagement,
  RnDStrategy
} from '../types/competitive-advantages';

/**
 * 競争優位性メトリクス
 */
export interface AdvantageMetrics {
  id: string;
  period: string;
  overallScore: number;
  categoryScores: CategoryScores;
  kpis: KeyPerformanceIndicators;
  trends: MetricTrends;
  benchmarks: Benchmarks;
  recommendations: MetricRecommendation[];
}

/**
 * カテゴリ別スコア
 */
export interface CategoryScores {
  innovation: number;
  marketPosition: number;
  technology: number;
  financial: number;
  operational: number;
  customer: number;
}

/**
 * 重要業績評価指標
 */
export interface KeyPerformanceIndicators {
  rdIntensity: number;
  innovationIndex: number;
  timeToMarket: number;
  successRate: number;
  revenueFromNewProducts: number;
  patentApplications: number;
  customerSatisfaction: number;
  marketShareGrowth: number;
  operationalEfficiency: number;
  employeeProductivity: number;
}

/**
 * メトリクストレンド
 */
export interface MetricTrends {
  rdInvestment: TrendData;
  innovationOutput: TrendData;
  marketPerformance: TrendData;
  operationalMetrics: TrendData;
}

/**
 * トレンドデータ
 */
export interface TrendData {
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'stable' | 'declining';
  projection: number;
}

/**
 * ベンチマーク
 */
export interface Benchmarks {
  industry: BenchmarkComparison;
  competitors: BenchmarkComparison;
  bestInClass: BenchmarkComparison;
}

/**
 * ベンチマーク比較
 */
export interface BenchmarkComparison {
  rdIntensity: ComparisonData;
  innovationIndex: ComparisonData;
  timeToMarket: ComparisonData;
  successRate: ComparisonData;
  marketShareGrowth: ComparisonData;
}

/**
 * 比較データ
 */
export interface ComparisonData {
  ours: number;
  benchmark: number;
  gap: number;
  position: 'ahead' | 'at-par' | 'behind';
}

/**
 * メトリクス推奨事項
 */
export interface MetricRecommendation {
  area: string;
  metric: string;
  current: number;
  target: number;
  gap: number;
  actions: string[];
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

/**
 * イノベーションパイプライン
 */
export interface InnovationPipeline {
  stage: string;
  projects: InnovationProject[];
  metrics: StageMetrics;
  forecast: PipelineForecast;
}

/**
 * イノベーションプロジェクト
 */
export interface InnovationProject {
  id: string;
  name: string;
  stage: string;
  type: 'incremental' | 'adjacent' | 'transformational';
  investmentToDate: number;
  projectedRevenue: number;
  probability: number;
  timeline: string;
  riskLevel: 'low' | 'medium' | 'high';
  strategicValue: number;
}

/**
 * ステージメトリクス
 */
export interface StageMetrics {
  projectCount: number;
  totalInvestment: number;
  averageDuration: number;
  successRate: number;
  conversionRate: number;
}

/**
 * パイプライン予測
 */
export interface PipelineForecast {
  expectedRevenue: number;
  expectedLaunches: number;
  investmentRequired: number;
  timeline: string;
}

/**
 * ROI分析
 */
export interface ROIAnalysis {
  totalInvestment: number;
  totalReturn: number;
  roi: number;
  paybackPeriod: number;
  npv: number;
  irr: number;
  breakEvenPoint: string;
  sensitivityAnalysis: SensitivityAnalysis;
}

/**
 * 感度分析
 */
export interface SensitivityAnalysis {
  baseCase: ScenarioData;
  optimistic: ScenarioData;
  pessimistic: ScenarioData;
  keyDrivers: string[];
  riskFactors: string[];
}

/**
 * シナリオデータ
 */
export interface ScenarioData {
  roi: number;
  npv: number;
  paybackPeriod: number;
  assumptions: Record<string, number>;
}

/**
 * 競争優位性メトリクスサービス
 */
export class AdvantageMetricsService {
  private metrics: Map<string, AdvantageMetrics> = new Map();
  private innovationPipeline: Map<string, InnovationPipeline> = new Map();
  private roiAnalyses: Map<string, ROIAnalysis> = new Map();

  constructor() {
    this.initializeMetrics();
    this.initializePipeline();
  }

  /**
   * メトリクスの初期化
   */
  private initializeMetrics(): void {
    const currentMetrics: AdvantageMetrics = {
      id: 'advantage-metrics-2024-q1',
      period: '2024 Q1',
      overallScore: 82.5,
      categoryScores: {
        innovation: 85,
        marketPosition: 78,
        technology: 88,
        financial: 80,
        operational: 82,
        customer: 87
      },
      kpis: {
        rdIntensity: 0.18, // 18% of revenue
        innovationIndex: 85,
        timeToMarket: 16, // months
        successRate: 0.72,
        revenueFromNewProducts: 0.42,
        patentApplications: 28,
        customerSatisfaction: 4.6,
        marketShareGrowth: 0.45,
        operationalEfficiency: 0.82,
        employeeProductivity: 145000 // revenue per employee
      },
      trends: {
        rdInvestment: {
          current: 45000000,
          previous: 38000000,
          change: 0.184,
          trend: 'improving',
          projection: 52000000
        },
        innovationOutput: {
          current: 156, // features delivered
          previous: 132,
          change: 0.182,
          trend: 'improving',
          projection: 180
        },
        marketPerformance: {
          current: 0.085, // market share
          previous: 0.058,
          change: 0.466,
          trend: 'improving',
          projection: 0.12
        },
        operationalMetrics: {
          current: 0.82,
          previous: 0.78,
          change: 0.051,
          trend: 'improving',
          projection: 0.85
        }
      },
      benchmarks: {
        industry: {
          rdIntensity: { ours: 0.18, benchmark: 0.12, gap: 0.06, position: 'ahead' },
          innovationIndex: { ours: 85, benchmark: 72, gap: 13, position: 'ahead' },
          timeToMarket: { ours: 16, benchmark: 22, gap: -6, position: 'ahead' },
          successRate: { ours: 0.72, benchmark: 0.58, gap: 0.14, position: 'ahead' },
          marketShareGrowth: { ours: 0.45, benchmark: 0.25, gap: 0.20, position: 'ahead' }
        },
        competitors: {
          rdIntensity: { ours: 0.18, benchmark: 0.15, gap: 0.03, position: 'ahead' },
          innovationIndex: { ours: 85, benchmark: 78, gap: 7, position: 'ahead' },
          timeToMarket: { ours: 16, benchmark: 18, gap: -2, position: 'ahead' },
          successRate: { ours: 0.72, benchmark: 0.65, gap: 0.07, position: 'ahead' },
          marketShareGrowth: { ours: 0.45, benchmark: 0.35, gap: 0.10, position: 'ahead' }
        },
        bestInClass: {
          rdIntensity: { ours: 0.18, benchmark: 0.22, gap: -0.04, position: 'behind' },
          innovationIndex: { ours: 85, benchmark: 92, gap: -7, position: 'behind' },
          timeToMarket: { ours: 16, benchmark: 12, gap: 4, position: 'behind' },
          successRate: { ours: 0.72, benchmark: 0.85, gap: -0.13, position: 'behind' },
          marketShareGrowth: { ours: 0.45, benchmark: 0.60, gap: -0.15, position: 'behind' }
        }
      },
      recommendations: [
        {
          area: 'R&D Investment',
          metric: 'R&D Intensity',
          current: 0.18,
          target: 0.22,
          gap: 0.04,
          actions: [
            'Increase R&D budget by 20%',
            'Hire 15 additional researchers',
            'Expand AI/ML capabilities',
            'Establish new research partnerships'
          ],
          impact: 'high',
          effort: 'high'
        },
        {
          area: 'Innovation Speed',
          metric: 'Time to Market',
          current: 16,
          target: 12,
          gap: 4,
          actions: [
            'Implement rapid prototyping process',
            'Enhance development automation',
            'Streamline approval processes',
            'Adopt agile methodologies'
          ],
          impact: 'high',
          effort: 'medium'
        },
        {
          area: 'Success Rate',
          metric: 'Project Success Rate',
          current: 0.72,
          target: 0.85,
          gap: 0.13,
          actions: [
            'Improve project selection criteria',
            'Enhance market validation process',
            'Strengthen technical feasibility assessment',
            'Implement stage-gate reviews'
          ],
          impact: 'medium',
          effort: 'medium'
        }
      ]
    };

    this.metrics.set(currentMetrics.id, currentMetrics);
  }

  /**
   * イノベーションパイプラインの初期化
   */
  private initializePipeline(): void {
    const pipelines: InnovationPipeline[] = [
      {
        stage: 'Ideation',
        projects: [
          {
            id: 'proj-001',
            name: 'AI-Powered DNS Optimization',
            stage: 'Ideation',
            type: 'transformational',
            investmentToDate: 250000,
            projectedRevenue: 15000000,
            probability: 0.4,
            timeline: '24 months',
            riskLevel: 'high',
            strategicValue: 9
          },
          {
            id: 'proj-002',
            name: 'Edge DNS Enhancement',
            stage: 'Ideation',
            type: 'adjacent',
            investmentToDate: 150000,
            projectedRevenue: 8000000,
            probability: 0.6,
            timeline: '18 months',
            riskLevel: 'medium',
            strategicValue: 7
          }
        ],
        metrics: {
          projectCount: 8,
          totalInvestment: 1200000,
          averageDuration: 4, // weeks
          successRate: 0.35,
          conversionRate: 0.60
        },
        forecast: {
          expectedRevenue: 35000000,
          expectedLaunches: 3,
          investmentRequired: 5000000,
          timeline: '18-24 months'
        }
      },
      {
        stage: 'Development',
        projects: [
          {
            id: 'proj-010',
            name: 'Multi-Cloud DNS Management',
            stage: 'Development',
            type: 'incremental',
            investmentToDate: 2500000,
            projectedRevenue: 25000000,
            probability: 0.8,
            timeline: '9 months',
            riskLevel: 'low',
            strategicValue: 8
          },
          {
            id: 'proj-011',
            name: 'Security Analytics Platform',
            stage: 'Development',
            type: 'adjacent',
            investmentToDate: 3200000,
            projectedRevenue: 35000000,
            probability: 0.7,
            timeline: '12 months',
            riskLevel: 'medium',
            strategicValue: 9
          }
        ],
        metrics: {
          projectCount: 5,
          totalInvestment: 15000000,
          averageDuration: 10, // months
          successRate: 0.75,
          conversionRate: 0.85
        },
        forecast: {
          expectedRevenue: 85000000,
          expectedLaunches: 4,
          investmentRequired: 12000000,
          timeline: '9-15 months'
        }
      }
    ];

    pipelines.forEach(pipeline => {
      this.innovationPipeline.set(pipeline.stage, pipeline);
    });
  }

  // ===== 公開メソッド =====

  /**
   * 現在のメトリクスを取得
   */
  public getCurrentMetrics(): AdvantageMetrics | undefined {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.period.localeCompare(a.period))[0];
  }

  /**
   * 期間別メトリクスを取得
   */
  public getMetricsByPeriod(period: string): AdvantageMetrics | undefined {
    return Array.from(this.metrics.values())
      .find(m => m.period === period);
  }

  /**
   * 全てのメトリクスを取得
   */
  public getAllMetrics(): AdvantageMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * メトリクスを追加
   */
  public addMetrics(metrics: AdvantageMetrics): void {
    this.metrics.set(metrics.id, metrics);
  }

  /**
   * イノベーションメトリクスを計算
   */
  public calculateInnovationMetrics(): InnovationMetrics {
    const current = this.getCurrentMetrics();
    const pipeline = Array.from(this.innovationPipeline.values());

    return {
      overview: {
        rdIntensity: current?.kpis.rdIntensity || 0.18,
        innovationIndex: current?.kpis.innovationIndex || 85,
        timeToMarket: current?.kpis.timeToMarket || 16,
        successRate: current?.kpis.successRate || 0.72,
        revenueFromNewProducts: current?.kpis.revenueFromNewProducts || 0.42
      },
      input: {
        rdInvestment: current?.trends.rdInvestment.current || 45000000,
        researchStaff: 132,
        externalPartnerships: 18,
        ideaSubmissions: 180
      },
      process: {
        projectsInPipeline: pipeline.reduce((sum, p) => sum + p.projects.length, 0),
        averageCycleTime: 18,
        stageLoss: {
          'Ideation to Concept': 0.60,
          'Concept to Development': 0.35,
          'Development to Launch': 0.25,
          'Launch to Market': 0.15
        },
        qualityMetrics: {
          defectRate: 0.08,
          customerSatisfaction: current?.kpis.customerSatisfaction || 4.6,
          adoptionRate: 0.78,
          timeToValue: 8.5
        }
      },
      output: {
        newProductsLaunched: 8,
        featuresDelivered: current?.trends.innovationOutput.current || 156,
        patentApplications: current?.kpis.patentApplications || 28,
        publicationsAuthored: 12
      },
      impact: {
        revenueImpact: 125000000,
        marketShareGain: current?.kpis.marketShareGrowth || 0.08,
        customerRetention: 0.94,
        competitiveAdvantage: 0.82
      }
    };
  }

  /**
   * ROI分析を実行
   */
  public performROIAnalysis(projectId?: string): ROIAnalysis {
    const totalInvestment = projectId ? 
      this.getProjectInvestment(projectId) : 
      this.getTotalInnovationInvestment();
    
    const totalReturn = projectId ?
      this.getProjectReturn(projectId) :
      this.getTotalInnovationReturn();

    const roi = (totalReturn - totalInvestment) / totalInvestment;
    const paybackPeriod = totalInvestment / (totalReturn / 5); // Assume 5-year period
    const npv = this.calculateNPV(totalInvestment, totalReturn, 0.12, 5);
    const irr = this.calculateIRR(totalInvestment, totalReturn, 5);

    const analysis: ROIAnalysis = {
      totalInvestment,
      totalReturn,
      roi,
      paybackPeriod,
      npv,
      irr,
      breakEvenPoint: `${Math.round(paybackPeriod * 12)} months`,
      sensitivityAnalysis: {
        baseCase: {
          roi,
          npv,
          paybackPeriod,
          assumptions: {
            revenue: 1.0,
            cost: 1.0,
            timeline: 1.0
          }
        },
        optimistic: {
          roi: roi * 1.3,
          npv: npv * 1.3,
          paybackPeriod: paybackPeriod * 0.8,
          assumptions: {
            revenue: 1.2,
            cost: 0.9,
            timeline: 0.9
          }
        },
        pessimistic: {
          roi: roi * 0.7,
          npv: npv * 0.7,
          paybackPeriod: paybackPeriod * 1.3,
          assumptions: {
            revenue: 0.8,
            cost: 1.1,
            timeline: 1.2
          }
        },
        keyDrivers: ['Market adoption rate', 'Competitive response', 'Technology maturity'],
        riskFactors: ['Market timing', 'Technical complexity', 'Resource availability']
      }
    };

    this.roiAnalyses.set(projectId || 'overall', analysis);
    return analysis;
  }

  /**
   * パイプライン分析を実行
   */
  public analyzePipeline(): Map<string, InnovationPipeline> {
    return this.innovationPipeline;
  }

  /**
   * メトリクストレンドを分析
   */
  public analyzeMetricTrends(metricName: keyof KeyPerformanceIndicators, periods: number = 4): TrendData[] {
    const metrics = this.getAllMetrics()
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-periods);

    return metrics.map((m, index) => {
      const current = m.kpis[metricName] as number;
      const previous = index > 0 ? (metrics[index - 1].kpis[metricName] as number) : current;
      const change = previous !== 0 ? (current - previous) / previous : 0;

      return {
        current,
        previous,
        change,
        trend: change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable',
        projection: current * (1 + change)
      };
    });
  }

  /**
   * ベンチマーク分析を実行
   */
  public performBenchmarkAnalysis(competitorData?: Record<string, number>): BenchmarkComparison {
    const current = this.getCurrentMetrics();
    if (!current) {
      throw new Error('No current metrics available');
    }

    const benchmark = competitorData || {
      rdIntensity: 0.15,
      innovationIndex: 78,
      timeToMarket: 18,
      successRate: 0.65,
      marketShareGrowth: 0.35
    };

    return {
      rdIntensity: this.compareMetric(current.kpis.rdIntensity, benchmark.rdIntensity),
      innovationIndex: this.compareMetric(current.kpis.innovationIndex, benchmark.innovationIndex),
      timeToMarket: this.compareMetric(current.kpis.timeToMarket, benchmark.timeToMarket, true),
      successRate: this.compareMetric(current.kpis.successRate, benchmark.successRate),
      marketShareGrowth: this.compareMetric(current.kpis.marketShareGrowth, benchmark.marketShareGrowth)
    };
  }

  // ===== プライベートメソッド =====

  private getProjectInvestment(projectId: string): number {
    for (const pipeline of this.innovationPipeline.values()) {
      const project = pipeline.projects.find(p => p.id === projectId);
      if (project) {
        return project.investmentToDate;
      }
    }
    return 0;
  }

  private getProjectReturn(projectId: string): number {
    for (const pipeline of this.innovationPipeline.values()) {
      const project = pipeline.projects.find(p => p.id === projectId);
      if (project) {
        return project.projectedRevenue * project.probability;
      }
    }
    return 0;
  }

  private getTotalInnovationInvestment(): number {
    return Array.from(this.innovationPipeline.values())
      .reduce((sum, pipeline) => sum + pipeline.metrics.totalInvestment, 0);
  }

  private getTotalInnovationReturn(): number {
    return Array.from(this.innovationPipeline.values())
      .reduce((sum, pipeline) => sum + pipeline.forecast.expectedRevenue, 0);
  }

  private calculateNPV(investment: number, returns: number, discountRate: number, years: number): number {
    const annualReturn = returns / years;
    let npv = -investment;
    
    for (let year = 1; year <= years; year++) {
      npv += annualReturn / Math.pow(1 + discountRate, year);
    }
    
    return npv;
  }

  private calculateIRR(investment: number, returns: number, years: number): number {
    // Simplified IRR calculation
    const annualReturn = returns / years;
    let irr = 0;
    let npv = 0;
    
    for (irr = 0; irr < 1; irr += 0.01) {
      npv = -investment;
      for (let year = 1; year <= years; year++) {
        npv += annualReturn / Math.pow(1 + irr, year);
      }
      if (npv > 0) break;
    }
    
    return irr;
  }

  private compareMetric(ours: number, benchmark: number, lowerIsBetter: boolean = false): ComparisonData {
    const gap = ours - benchmark;
    const position = lowerIsBetter ? 
      (ours < benchmark ? 'ahead' : ours > benchmark ? 'behind' : 'at-par') :
      (ours > benchmark ? 'ahead' : ours < benchmark ? 'behind' : 'at-par');

    return { ours, benchmark, gap, position };
  }

  /**
   * 推奨事項を生成
   */
  public generateRecommendations(): MetricRecommendation[] {
    const current = this.getCurrentMetrics();
    if (!current) return [];

    const recommendations: MetricRecommendation[] = [];

    // ベストインクラスとの比較に基づく推奨事項
    Object.entries(current.benchmarks.bestInClass).forEach(([metric, comparison]) => {
      if (comparison.position === 'behind' && Math.abs(comparison.gap) > 0.1) {
        recommendations.push({
          area: this.getMetricArea(metric),
          metric: this.getMetricName(metric),
          current: comparison.ours,
          target: comparison.benchmark,
          gap: comparison.gap,
          actions: this.getImprovementActions(metric),
          impact: Math.abs(comparison.gap) > 0.2 ? 'high' : 'medium',
          effort: this.getEffortLevel(metric)
        });
      }
    });

    return recommendations;
  }

  private getMetricArea(metric: string): string {
    const areaMap: Record<string, string> = {
      rdIntensity: 'R&D Investment',
      innovationIndex: 'Innovation Performance',
      timeToMarket: 'Development Speed',
      successRate: 'Project Success',
      marketShareGrowth: 'Market Performance'
    };
    return areaMap[metric] || 'General';
  }

  private getMetricName(metric: string): string {
    const nameMap: Record<string, string> = {
      rdIntensity: 'R&D Intensity',
      innovationIndex: 'Innovation Index',
      timeToMarket: 'Time to Market',
      successRate: 'Success Rate',
      marketShareGrowth: 'Market Share Growth'
    };
    return nameMap[metric] || metric;
  }

  private getImprovementActions(metric: string): string[] {
    const actionMap: Record<string, string[]> = {
      rdIntensity: [
        'Increase R&D budget allocation',
        'Optimize R&D resource utilization',
        'Expand research partnerships',
        'Access government R&D incentives'
      ],
      innovationIndex: [
        'Enhance innovation processes',
        'Improve idea generation',
        'Strengthen innovation culture',
        'Increase cross-functional collaboration'
      ],
      timeToMarket: [
        'Streamline development processes',
        'Implement agile methodologies',
        'Enhance prototyping capabilities',
        'Improve decision-making speed'
      ],
      successRate: [
        'Strengthen project selection',
        'Improve feasibility assessment',
        'Enhance risk management',
        'Better market validation'
      ],
      marketShareGrowth: [
        'Accelerate market expansion',
        'Enhance competitive positioning',
        'Improve customer acquisition',
        'Strengthen value proposition'
      ]
    };
    return actionMap[metric] || ['Develop improvement plan'];
  }

  private getEffortLevel(metric: string): 'high' | 'medium' | 'low' {
    const effortMap: Record<string, 'high' | 'medium' | 'low'> = {
      rdIntensity: 'high',
      innovationIndex: 'medium',
      timeToMarket: 'medium',
      successRate: 'medium',
      marketShareGrowth: 'high'
    };
    return effortMap[metric] || 'medium';
  }
}