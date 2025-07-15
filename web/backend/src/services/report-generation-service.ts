/**
 * DNSweeper レポート生成サービス
 * ダッシュボード生成、エグゼクティブサマリー、総合レポート、エクスポート機能
 */

import {
  CompetitiveAdvantageDashboard,
  CompetitiveAnalysis,
  CompetitiveAdvantage,
  PatentPortfolio,
  InnovationMetrics,
  TechnologyStandards,
  RnDStrategy
} from '../types/competitive-advantages';

/**
 * エグゼクティブサマリー
 */
export interface ExecutiveSummary {
  id: string;
  generatedAt: Date;
  period: string;
  keyHighlights: KeyHighlight[];
  performanceMetrics: PerformanceMetric[];
  strategicInsights: StrategicInsight[];
  actionItems: ActionItem[];
  nextSteps: string[];
}

/**
 * キーハイライト
 */
export interface KeyHighlight {
  category: 'achievement' | 'challenge' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric?: string;
}

/**
 * パフォーマンスメトリック
 */
export interface PerformanceMetric {
  name: string;
  current: number;
  previous: number;
  target: number;
  trend: 'improving' | 'stable' | 'declining';
  status: 'on-track' | 'at-risk' | 'off-track';
}

/**
 * 戦略的インサイト
 */
export interface StrategicInsight {
  area: string;
  insight: string;
  evidence: string[];
  implications: string[];
  recommendations: string[];
}

/**
 * アクション項目
 */
export interface ActionItem {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  owner: string;
  deadline: Date;
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[];
}

/**
 * 総合レポート
 */
export interface ComprehensiveReport {
  id: string;
  title: string;
  generatedAt: Date;
  period: string;
  executiveSummary: ExecutiveSummary;
  competitiveAnalysis: CompetitiveAnalysisSection;
  innovationMetrics: InnovationMetricsSection;
  patentPortfolio: PatentPortfolioSection;
  marketPosition: MarketPositionSection;
  financialPerformance: FinancialPerformanceSection;
  recommendations: RecommendationsSection;
  appendices: Appendix[];
}

/**
 * 競争分析セクション
 */
export interface CompetitiveAnalysisSection {
  summary: string;
  competitorProfiles: CompetitorProfile[];
  marketTrends: string[];
  competitiveGaps: string[];
  opportunities: OpportunityItem[];
  threats: ThreatItem[];
}

/**
 * 競合他社プロファイル
 */
export interface CompetitorProfile {
  name: string;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
  recentMoves: string[];
}

/**
 * 機会項目
 */
export interface OpportunityItem {
  description: string;
  value: number;
  timeline: string;
  requirements: string[];
}

/**
 * 脅威項目
 */
export interface ThreatItem {
  description: string;
  severity: 'high' | 'medium' | 'low';
  timeline: string;
  mitigation: string[];
}

/**
 * イノベーションメトリクスセクション
 */
export interface InnovationMetricsSection {
  summary: string;
  rdIntensity: number;
  innovationIndex: number;
  pipeline: PipelineItem[];
  recentLaunches: LaunchItem[];
}

/**
 * パイプライン項目
 */
export interface PipelineItem {
  name: string;
  stage: string;
  investment: number;
  expectedReturn: number;
  timeline: string;
}

/**
 * ローンチ項目
 */
export interface LaunchItem {
  name: string;
  date: Date;
  category: string;
  impact: string;
}

/**
 * 特許ポートフォリオセクション
 */
export interface PatentPortfolioSection {
  summary: string;
  totalPatents: number;
  portfolioValue: number;
  recentFilings: PatentFiling[];
  keyTechnologies: string[];
}

/**
 * 特許出願
 */
export interface PatentFiling {
  title: string;
  filingDate: Date;
  status: string;
  jurisdictions: string[];
}

/**
 * 市場ポジションセクション
 */
export interface MarketPositionSection {
  summary: string;
  marketShare: number;
  growthRate: number;
  positioning: string;
  competitiveAdvantages: string[];
}

/**
 * 財務パフォーマンスセクション
 */
export interface FinancialPerformanceSection {
  summary: string;
  revenue: number;
  rdInvestment: number;
  patentValue: number;
  roi: number;
}

/**
 * 推奨事項セクション
 */
export interface RecommendationsSection {
  strategic: string[];
  tactical: string[];
  operational: string[];
  timeline: TimelineItem[];
}

/**
 * タイムライン項目
 */
export interface TimelineItem {
  milestone: string;
  deadline: Date;
  status: string;
  dependencies: string[];
}

/**
 * 付録
 */
export interface Appendix {
  title: string;
  content: string;
  charts?: ChartData[];
  tables?: TableData[];
}

/**
 * チャートデータ
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'radar';
  title: string;
  data: unknown[];
  options?: unknown;
}

/**
 * テーブルデータ
 */
export interface TableData {
  headers: string[];
  rows: unknown[][];
  summary?: string;
}

/**
 * エクスポート形式
 */
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  POWERPOINT = 'powerpoint',
  JSON = 'json',
  HTML = 'html'
}

/**
 * レポート生成サービス
 */
export class ReportGenerationService {
  private dashboards: Map<string, CompetitiveAdvantageDashboard> = new Map();
  private executiveSummaries: Map<string, ExecutiveSummary> = new Map();
  private comprehensiveReports: Map<string, ComprehensiveReport> = new Map();

  constructor() {
    // 初期化処理
  }

  /**
   * 競争優位性ダッシュボードを生成
   */
  public generateCompetitiveAdvantageDashboard(
    advantages: CompetitiveAdvantage[],
    patents: PatentPortfolio[],
    innovationMetrics: InnovationMetrics
  ): CompetitiveAdvantageDashboard {
    const dashboard: CompetitiveAdvantageDashboard = {
      overview: {
        totalAdvantages: advantages.length,
        sustainableAdvantages: advantages.filter(a => a.type === 'sustainable' || a.type === 'long-term').length,
        patentPortfolioValue: patents.reduce((sum, p) => sum + (p.metrics.portfolioSize * 5000000), 0),
        innovationIndex: innovationMetrics.overview.innovationIndex,
        competitivePosition: 85,
        lastUpdated: new Date()
      },
      portfolio: {
        byType: {
          'temporary': advantages.filter(a => a.type === 'temporary').length,
          'sustainable': advantages.filter(a => a.type === 'sustainable').length,
          'long-term': advantages.filter(a => a.type === 'long-term').length,
          'permanent': advantages.filter(a => a.type === 'permanent').length
        },
        byCategory: advantages.reduce((acc, a) => {
          acc[a.category] = (acc[a.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySustainability: {
          'high': advantages.filter(a => a.value.defensibility > 80).length,
          'medium': advantages.filter(a => a.value.defensibility >= 60 && a.value.defensibility <= 80).length,
          'low': advantages.filter(a => a.value.defensibility < 60).length
        },
        byValue: {
          'high': advantages.filter(a => a.value.revenue > 10000000).length,
          'medium': advantages.filter(a => a.value.revenue >= 5000000 && a.value.revenue <= 10000000).length,
          'low': advantages.filter(a => a.value.revenue < 5000000).length
        }
      },
      trends: {
        innovation: {
          direction: 'improving',
          rate: 0.15,
          drivers: ['AI/ML investment', 'R&D expansion', 'Strategic partnerships']
        },
        competition: {
          intensity: 'increasing',
          threats: ['Big tech expansion', 'New entrants', 'Technology disruption'],
          opportunities: ['Niche specialization', 'Partnership alliances', 'Innovation leadership']
        },
        market: {
          growth: 0.25,
          disruption: ['Quantum computing', 'Edge computing', 'AI/ML adoption'],
          positioning: 'Specialized leader with growth potential'
        }
      },
      alerts: [
        {
          type: 'opportunity',
          severity: 'high',
          description: 'AI/ML patent application window closing soon',
          action: ['Accelerate AI patent filings', 'Review patent strategy', 'Prioritize key innovations'],
          deadline: new Date('2024-12-31')
        },
        {
          type: 'threat',
          severity: 'medium',
          description: 'Competitor increasing R&D investment significantly',
          action: ['Monitor competitive developments', 'Evaluate R&D budget increase', 'Strengthen partnerships'],
          deadline: new Date('2024-09-30')
        },
        {
          type: 'milestone',
          severity: 'medium',
          description: 'Quantum-resistant DNS security milestone due',
          action: ['Review project progress', 'Ensure resource allocation', 'Prepare milestone deliverables'],
          deadline: new Date('2024-12-15')
        }
      ],
      performance: {
        achievements: [
          'Maintained UX leadership position',
          'Filed 28 patents in 2024',
          'Achieved 85/100 innovation index',
          'Successful AI/ML capability development'
        ],
        gaps: [
          'Global infrastructure coverage',
          'Enterprise security certifications',
          'Quantum computing readiness',
          'Edge computing market presence'
        ],
        recommendations: [
          'Accelerate quantum-safe security development',
          'Expand strategic infrastructure partnerships',
          'Increase AI/ML patent filing velocity',
          'Strengthen enterprise security portfolio'
        ],
        nextReview: new Date('2024-12-31')
      }
    };

    this.dashboards.set(dashboard.overview.lastUpdated.toISOString(), dashboard);
    return dashboard;
  }

  /**
   * エグゼクティブサマリーを生成
   */
  public generateExecutiveSummary(
    period: string,
    dashboard: CompetitiveAdvantageDashboard,
    innovationMetrics: InnovationMetrics
  ): ExecutiveSummary {
    const summary: ExecutiveSummary = {
      id: `exec-summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
      period,
      keyHighlights: [
        {
          category: 'achievement',
          title: 'Innovation Index Achievement',
          description: `Achieved ${innovationMetrics.overview.innovationIndex}/100 innovation index score`,
          impact: 'high',
          metric: `${innovationMetrics.overview.innovationIndex}%`
        },
        {
          category: 'opportunity',
          title: 'AI/ML Patent Window',
          description: 'Critical window for AI/ML patent applications closing in Q4 2024',
          impact: 'high'
        },
        {
          category: 'challenge',
          title: 'Infrastructure Gap',
          description: 'Global infrastructure coverage remains below competitive benchmark',
          impact: 'medium'
        },
        {
          category: 'risk',
          title: 'Competitive R&D Investment',
          description: 'Major competitors increasing R&D spending by 30-40%',
          impact: 'high'
        }
      ],
      performanceMetrics: [
        {
          name: 'Innovation Index',
          current: innovationMetrics.overview.innovationIndex,
          previous: 82,
          target: 90,
          trend: 'improving',
          status: 'on-track'
        },
        {
          name: 'R&D Intensity',
          current: innovationMetrics.overview.rdIntensity * 100,
          previous: 16,
          target: 20,
          trend: 'improving',
          status: 'at-risk'
        },
        {
          name: 'Time to Market',
          current: innovationMetrics.overview.timeToMarket,
          previous: 18,
          target: 12,
          trend: 'improving',
          status: 'at-risk'
        },
        {
          name: 'Patent Portfolio Value',
          current: dashboard.overview.patentPortfolioValue / 1000000,
          previous: 650,
          target: 800,
          trend: 'improving',
          status: 'on-track'
        }
      ],
      strategicInsights: [
        {
          area: 'Competitive Position',
          insight: 'Maintaining technology leadership despite resource constraints',
          evidence: [
            'Superior UX scores (95/100)',
            'High innovation index (85/100)',
            'Strong patent portfolio (234 patents)'
          ],
          implications: [
            'Sustainable competitive advantage in user experience',
            'Technology leadership at risk without increased investment',
            'Patent portfolio provides defensive moat'
          ],
          recommendations: [
            'Increase R&D budget by 25% to maintain leadership',
            'Accelerate patent filing in AI/ML domains',
            'Form strategic partnerships to extend resources'
          ]
        },
        {
          area: 'Market Dynamics',
          insight: 'Market consolidation creating both threats and opportunities',
          evidence: [
            'Major acquisitions in DNS/CDN space',
            'Increasing barriers to entry',
            'Growing enterprise segment demand'
          ],
          implications: [
            'Partnership opportunities with consolidators',
            'Niche specialization increasingly valuable',
            'Enterprise segment represents growth opportunity'
          ],
          recommendations: [
            'Develop enterprise-specific features',
            'Explore strategic partnership options',
            'Strengthen niche market positioning'
          ]
        }
      ],
      actionItems: [
        {
          id: 'action-001',
          priority: 'critical',
          title: 'Complete AI/ML Patent Applications',
          description: 'File remaining AI/ML patent applications before Q4 2024 deadline',
          owner: 'Legal/R&D',
          deadline: new Date('2024-12-31'),
          status: 'in-progress',
          dependencies: ['Technology documentation', 'Prior art search']
        },
        {
          id: 'action-002',
          priority: 'high',
          title: 'Enterprise Feature Development',
          description: 'Develop and launch enterprise DNS management features',
          owner: 'Product/Engineering',
          deadline: new Date('2025-03-31'),
          status: 'pending',
          dependencies: ['Market research', 'Customer feedback']
        },
        {
          id: 'action-003',
          priority: 'high',
          title: 'Strategic Partnership Evaluation',
          description: 'Evaluate and pursue strategic infrastructure partnerships',
          owner: 'Business Development',
          deadline: new Date('2025-01-31'),
          status: 'pending',
          dependencies: ['Partner identification', 'Due diligence']
        }
      ],
      nextSteps: [
        'Review and approve Q1 2025 R&D budget increase',
        'Finalize AI/ML patent application strategy',
        'Launch enterprise customer advisory board',
        'Initiate partnership discussions with top 3 candidates',
        'Develop quantum-safe security roadmap'
      ]
    };

    this.executiveSummaries.set(summary.id, summary);
    return summary;
  }

  /**
   * 総合レポートを生成
   */
  public generateComprehensiveReport(
    period: string,
    analyses: CompetitiveAnalysis[],
    advantages: CompetitiveAdvantage[],
    patents: PatentPortfolio[],
    innovationMetrics: InnovationMetrics,
    standards: TechnologyStandards[],
    strategies: RnDStrategy[]
  ): ComprehensiveReport {
    const dashboard = this.generateCompetitiveAdvantageDashboard(advantages, patents, innovationMetrics);
    const executiveSummary = this.generateExecutiveSummary(period, dashboard, innovationMetrics);

    const report: ComprehensiveReport = {
      id: `comprehensive-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `DNSweeper Competitive Advantage Report - ${period}`,
      generatedAt: new Date(),
      period,
      executiveSummary,
      competitiveAnalysis: this.generateCompetitiveAnalysisSection(analyses, advantages),
      innovationMetrics: this.generateInnovationMetricsSection(innovationMetrics, strategies),
      patentPortfolio: this.generatePatentPortfolioSection(patents),
      marketPosition: this.generateMarketPositionSection(analyses, advantages),
      financialPerformance: this.generateFinancialPerformanceSection(innovationMetrics, patents),
      recommendations: this.generateRecommendationsSection(dashboard, innovationMetrics),
      appendices: this.generateAppendices(analyses, patents, innovationMetrics)
    };

    this.comprehensiveReports.set(report.id, report);
    return report;
  }

  /**
   * 競争分析セクションを生成
   */
  private generateCompetitiveAnalysisSection(
    analyses: CompetitiveAnalysis[],
    advantages: CompetitiveAdvantage[]
  ): CompetitiveAnalysisSection {
    const latestAnalysis = analyses[analyses.length - 1];
    
    return {
      summary: 'Comprehensive competitive analysis reveals strong position in specialized DNS management with opportunities for growth',
      competitorProfiles: latestAnalysis.competitors.map(c => ({
        name: c.name,
        marketShare: c.resources.marketShare || 0.15,
        strengths: c.strengths.slice(0, 3),
        weaknesses: c.weaknesses.slice(0, 3),
        recentMoves: ['Product launches', 'Market expansion', 'Technology investments']
      })),
      marketTrends: latestAnalysis.findings.marketTrends,
      competitiveGaps: latestAnalysis.findings.competitiveGaps,
      opportunities: latestAnalysis.findings.opportunities.map(o => ({
        description: o.opportunity,
        value: o.value,
        timeline: o.timeline,
        requirements: o.requirements
      })),
      threats: latestAnalysis.findings.threats.map(t => ({
        description: t.threat,
        severity: t.severity,
        timeline: t.timeline,
        mitigation: t.mitigation
      }))
    };
  }

  /**
   * イノベーションメトリクスセクションを生成
   */
  private generateInnovationMetricsSection(
    metrics: InnovationMetrics,
    strategies: RnDStrategy[]
  ): InnovationMetricsSection {
    return {
      summary: 'Innovation metrics demonstrate strong performance with opportunities for acceleration',
      rdIntensity: metrics.overview.rdIntensity,
      innovationIndex: metrics.overview.innovationIndex,
      pipeline: strategies.flatMap(s => s.projects.map(p => ({
        name: p.name,
        stage: 'Development',
        investment: p.budget,
        expectedReturn: p.expectedROI * p.budget,
        timeline: p.timeline
      }))).slice(0, 5),
      recentLaunches: [
        {
          name: 'AI-Powered DNS Optimization',
          date: new Date('2024-01-15'),
          category: 'Core Product',
          impact: 'High - 25% performance improvement'
        },
        {
          name: 'Enterprise Dashboard 2.0',
          date: new Date('2024-02-20'),
          category: 'User Experience',
          impact: 'Medium - Enhanced enterprise features'
        }
      ]
    };
  }

  /**
   * 特許ポートフォリオセクションを生成
   */
  private generatePatentPortfolioSection(patents: PatentPortfolio[]): PatentPortfolioSection {
    const allPatents = patents.flatMap(p => p.patents);
    
    return {
      summary: 'Strong patent portfolio providing competitive moat and licensing opportunities',
      totalPatents: allPatents.length,
      portfolioValue: patents.reduce((sum, p) => sum + (p.metrics.portfolioSize * 5000000), 0),
      recentFilings: allPatents
        .filter(p => p.status === 'pending')
        .slice(0, 5)
        .map(p => ({
          title: p.title,
          filingDate: p.filingDate,
          status: p.status,
          jurisdictions: p.jurisdictions
        })),
      keyTechnologies: ['DNS Optimization', 'AI/ML Integration', 'Security', 'Performance', 'Analytics']
    };
  }

  /**
   * 市場ポジションセクションを生成
   */
  private generateMarketPositionSection(
    analyses: CompetitiveAnalysis[],
    advantages: CompetitiveAdvantage[]
  ): MarketPositionSection {
    return {
      summary: 'Specialized leader in enterprise DNS management with strong growth trajectory',
      marketShare: 0.085,
      growthRate: 0.45,
      positioning: 'Premium specialized DNS management solution for enterprises',
      competitiveAdvantages: advantages
        .filter(a => a.type === 'sustainable' || a.type === 'permanent')
        .map(a => a.name)
        .slice(0, 5)
    };
  }

  /**
   * 財務パフォーマンスセクションを生成
   */
  private generateFinancialPerformanceSection(
    metrics: InnovationMetrics,
    patents: PatentPortfolio[]
  ): FinancialPerformanceSection {
    return {
      summary: 'Strong financial performance with increasing returns on innovation investment',
      revenue: 250000000,
      rdInvestment: metrics.input.rdInvestment,
      patentValue: patents.reduce((sum, p) => sum + (p.metrics.portfolioSize * 5000000), 0),
      roi: 3.5
    };
  }

  /**
   * 推奨事項セクションを生成
   */
  private generateRecommendationsSection(
    dashboard: CompetitiveAdvantageDashboard,
    metrics: InnovationMetrics
  ): RecommendationsSection {
    return {
      strategic: [
        'Increase R&D investment to 20% of revenue',
        'Pursue strategic infrastructure partnerships',
        'Focus on enterprise market segment'
      ],
      tactical: [
        'Accelerate AI/ML patent filings',
        'Launch enterprise feature set',
        'Implement quantum-safe security'
      ],
      operational: [
        'Optimize development processes',
        'Enhance customer support capabilities',
        'Strengthen security certifications'
      ],
      timeline: [
        {
          milestone: 'Complete AI/ML patent applications',
          deadline: new Date('2024-12-31'),
          status: 'In Progress',
          dependencies: ['Technology documentation']
        },
        {
          milestone: 'Launch enterprise features',
          deadline: new Date('2025-03-31'),
          status: 'Planning',
          dependencies: ['Market research', 'Development resources']
        },
        {
          milestone: 'Achieve quantum-safe certification',
          deadline: new Date('2025-06-30'),
          status: 'Planning',
          dependencies: ['Technology development', 'Third-party audit']
        }
      ]
    };
  }

  /**
   * 付録を生成
   */
  private generateAppendices(
    analyses: CompetitiveAnalysis[],
    patents: PatentPortfolio[],
    metrics: InnovationMetrics
  ): Appendix[] {
    return [
      {
        title: 'Detailed Competitive Analysis',
        content: 'Full competitive analysis with detailed competitor profiles and market dynamics',
        tables: [
          {
            headers: ['Competitor', 'Market Share', 'R&D Budget', 'Patent Count'],
            rows: analyses[0].competitors.map(c => [
              c.name,
              `${(c.resources.marketShare || 0.15) * 100}%`,
              `$${(c.resources.rdBudget / 1000000).toFixed(0)}M`,
              c.resources.patents.toString()
            ])
          }
        ]
      },
      {
        title: 'Patent Portfolio Details',
        content: 'Complete patent portfolio with filing status and coverage',
        tables: [
          {
            headers: ['Patent Title', 'Status', 'Filing Date', 'Jurisdictions'],
            rows: patents.flatMap(p => p.patents.map(patent => [
              patent.title,
              patent.status,
              patent.filingDate.toISOString().split('T')[0],
              patent.jurisdictions.join(', ')
            ]))
          }
        ]
      },
      {
        title: 'Innovation Metrics Breakdown',
        content: 'Detailed innovation metrics and performance indicators',
        charts: [
          {
            type: 'radar',
            title: 'Innovation Performance',
            data: [
              { metric: 'R&D Intensity', value: metrics.overview.rdIntensity * 100 },
              { metric: 'Innovation Index', value: metrics.overview.innovationIndex },
              { metric: 'Success Rate', value: metrics.overview.successRate * 100 },
              { metric: 'Time to Market', value: 100 - metrics.overview.timeToMarket },
              { metric: 'Revenue Impact', value: metrics.overview.revenueFromNewProducts * 100 }
            ]
          }
        ]
      }
    ];
  }

  /**
   * レポートをエクスポート
   */
  public exportReport(reportId: string, format: ExportFormat): string {
    const report = this.comprehensiveReports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(report, null, 2);
      case ExportFormat.HTML:
        return this.generateHTMLReport(report);
      case ExportFormat.PDF:
        // PDF generation would require external library
        return `PDF export not implemented - would generate PDF for report ${reportId}`;
      case ExportFormat.EXCEL:
        // Excel generation would require external library
        return `Excel export not implemented - would generate Excel for report ${reportId}`;
      case ExportFormat.POWERPOINT:
        // PowerPoint generation would require external library
        return `PowerPoint export not implemented - would generate PowerPoint for report ${reportId}`;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * HTMLレポートを生成
   */
  private generateHTMLReport(report: ComprehensiveReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1, h2, h3 { color: #333; }
    .section { margin-bottom: 40px; }
    .metric { display: inline-block; margin: 10px; padding: 10px; background: #f0f0f0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p>Generated: ${report.generatedAt.toISOString()}</p>
  
  <div class="section">
    <h2>Executive Summary</h2>
    <h3>Key Highlights</h3>
    ${report.executiveSummary.keyHighlights.map(h => `
      <div class="metric">
        <strong>${h.title}</strong>
        <p>${h.description}</p>
        <span>Impact: ${h.impact}</span>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Performance Metrics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Current</th>
        <th>Previous</th>
        <th>Target</th>
        <th>Trend</th>
        <th>Status</th>
      </tr>
      ${report.executiveSummary.performanceMetrics.map(m => `
        <tr>
          <td>${m.name}</td>
          <td>${m.current}</td>
          <td>${m.previous}</td>
          <td>${m.target}</td>
          <td>${m.trend}</td>
          <td>${m.status}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <div class="section">
    <h2>Strategic Insights</h2>
    ${report.executiveSummary.strategicInsights.map(i => `
      <h3>${i.area}</h3>
      <p><strong>${i.insight}</strong></p>
      <h4>Evidence:</h4>
      <ul>${i.evidence.map(e => `<li>${e}</li>`).join('')}</ul>
      <h4>Recommendations:</h4>
      <ul>${i.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
    `).join('')}
  </div>

  <div class="section">
    <h2>Action Items</h2>
    ${report.executiveSummary.actionItems.map(a => `
      <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
        <h4>${a.title}</h4>
        <p>${a.description}</p>
        <p>Priority: ${a.priority} | Owner: ${a.owner} | Deadline: ${a.deadline.toISOString().split('T')[0]}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
  }

  /**
   * ダッシュボードを取得
   */
  public getLatestDashboard(): CompetitiveAdvantageDashboard | undefined {
    const dashboardArray = Array.from(this.dashboards.values());
    return dashboardArray[dashboardArray.length - 1];
  }

  /**
   * エグゼクティブサマリーを取得
   */
  public getExecutiveSummary(id: string): ExecutiveSummary | undefined {
    return this.executiveSummaries.get(id);
  }

  /**
   * 総合レポートを取得
   */
  public getComprehensiveReport(id: string): ComprehensiveReport | undefined {
    return this.comprehensiveReports.get(id);
  }

  /**
   * 全てのレポートを取得
   */
  public getAllReports(): ComprehensiveReport[] {
    return Array.from(this.comprehensiveReports.values());
  }
}