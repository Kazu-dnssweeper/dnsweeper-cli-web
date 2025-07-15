/**
 * ReportGenerationService テストスイート
 */

import { ReportGenerationService, ExecutiveSummary, ComprehensiveReport, ExportFormat } from '../report-generation-service';
import {
  CompetitiveAnalysis,
  CompetitiveAdvantage,
  PatentPortfolio,
  InnovationMetrics,
  TechnologyStandards,
  RnDStrategy
} from '../../types/competitive-advantages';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  let mockAdvantages: CompetitiveAdvantage[];
  let mockPatents: PatentPortfolio[];
  let mockInnovationMetrics: InnovationMetrics;
  let mockAnalyses: CompetitiveAnalysis[];
  let mockStandards: TechnologyStandards[];
  let mockStrategies: RnDStrategy[];

  beforeEach(() => {
    service = new ReportGenerationService();
    
    // モックデータの準備
    mockAdvantages = [
      {
        id: 'adv-001',
        name: 'Superior User Experience',
        description: 'Best-in-class user interface',
        type: 'sustainable',
        category: 'User Experience',
        sources: [
          {
            type: 'internal',
            name: 'UI/UX Team',
            strength: 90,
            sustainability: 85,
            evidence: ['User satisfaction scores', 'Industry awards']
          }
        ],
        value: {
          revenue: 15000000,
          marketShare: 0.05,
          customerRetention: 0.95,
          defensibility: 85
        },
        timeframe: '2-3 years',
        maintenanceRequirements: ['Continuous innovation', 'User research'],
        risks: ['Competitor catch-up', 'Technology changes'],
        dependencies: ['Design team', 'Technology platform']
      },
      {
        id: 'adv-002',
        name: 'AI-Powered Optimization',
        description: 'Advanced AI/ML capabilities',
        type: 'temporary',
        category: 'Technology',
        sources: [
          {
            type: 'technology',
            name: 'AI/ML Platform',
            strength: 85,
            sustainability: 60,
            evidence: ['Patent portfolio', 'Performance metrics']
          }
        ],
        value: {
          revenue: 8000000,
          marketShare: 0.03,
          customerRetention: 0.88,
          defensibility: 70
        },
        timeframe: '1-2 years',
        maintenanceRequirements: ['R&D investment', 'Talent acquisition'],
        risks: ['Technology commoditization', 'Open source alternatives'],
        dependencies: ['ML team', 'Data infrastructure']
      }
    ];

    mockPatents = [
      {
        id: 'patent-portfolio-001',
        name: 'Core Technology Patents',
        description: 'DNS optimization patents',
        patents: [
          {
            patentId: 'US-001',
            title: 'DNS Query Optimization',
            status: 'granted',
            filingDate: new Date('2023-01-15'),
            grantDate: new Date('2024-03-20'),
            expiryDate: new Date('2043-01-15'),
            jurisdictions: ['US', 'EU', 'JP'],
            inventors: ['John Doe', 'Jane Smith'],
            technologyArea: 'DNS Optimization',
            businessValue: {
              revenue: 5000000,
              marketShare: 0.02,
              defensiveValue: 8000000,
              licensingPotential: 2000000
            },
            claims: {
              independent: 3,
              dependent: 24,
              coverage: ['Query routing', 'Caching', 'Optimization']
            },
            prosecution: {
              cost: 450000,
              timeline: '18 months',
              challenges: ['Prior art'],
              strategy: 'Continuation strategy'
            }
          }
        ],
        strategy: {
          focus: ['DNS technology', 'AI/ML integration'],
          geographies: ['US', 'EU', 'Asia'],
          timeline: 'Ongoing',
          budget: 2000000,
          objectives: ['Market protection', 'Licensing revenue']
        },
        management: {
          committee: ['Legal', 'R&D', 'Business'],
          reviewFrequency: 'quarterly',
          evaluationCriteria: ['Business value', 'Strategic fit'],
          maintenanceBudget: 500000
        },
        metrics: {
          portfolioSize: 45,
          activePatents: 28,
          pendingApplications: 17,
          geographicCoverage: 0.75,
          citationCount: 234,
          licensingRevenue: 3500000
        }
      }
    ];

    mockInnovationMetrics = {
      overview: {
        rdIntensity: 0.18,
        innovationIndex: 85,
        timeToMarket: 16,
        successRate: 0.72,
        revenueFromNewProducts: 0.42
      },
      input: {
        rdInvestment: 45000000,
        researchStaff: 132,
        externalPartnerships: 18,
        ideaSubmissions: 180
      },
      process: {
        projectsInPipeline: 24,
        averageCycleTime: 18,
        stageLoss: {
          'Ideation to Concept': 0.60,
          'Concept to Development': 0.35,
          'Development to Launch': 0.25,
          'Launch to Market': 0.15
        },
        qualityMetrics: {
          defectRate: 0.08,
          customerSatisfaction: 4.6,
          adoptionRate: 0.78,
          timeToValue: 8.5
        }
      },
      output: {
        newProductsLaunched: 8,
        featuresDelivered: 156,
        patentApplications: 28,
        publicationsAuthored: 12
      },
      impact: {
        revenueImpact: 125000000,
        marketShareGain: 0.08,
        customerRetention: 0.94,
        competitiveAdvantage: 0.82
      }
    };

    mockAnalyses = [
      {
        id: 'analysis-001',
        name: 'DNS Market Analysis 2024',
        scope: 'Global DNS market',
        competitors: [
          {
            name: 'Cloudflare',
            type: 'direct',
            marketPosition: 'Market leader',
            strengths: ['Global infrastructure', 'Brand recognition'],
            weaknesses: ['Complex pricing', 'Limited customization'],
            strategy: 'Global expansion',
            resources: {
              rdBudget: 500000000,
              patents: 234,
              talent: 3200,
              partnerships: ['Microsoft', 'Google'],
              marketShare: 0.22
            },
            threats: {
              current: ['Market dominance'],
              emerging: ['Technology lock-in']
            },
            opportunities: ['Partnership potential']
          }
        ],
        marketConditions: {
          size: 5000000000,
          growth: 0.25,
          trends: ['AI adoption', 'Security focus'],
          barriers: ['Infrastructure costs', 'Technical expertise'],
          regulations: ['Data privacy', 'Cybersecurity']
        },
        methodology: {
          framework: 'Porter\'s Five Forces',
          dataCollection: ['Public reports', 'Market research'],
          updateFrequency: 'quarterly',
          confidenceLevel: 0.87
        },
        findings: {
          marketTrends: ['AI integration', 'Security focus', 'Edge computing'],
          competitiveGaps: ['Enterprise features', 'User experience'],
          opportunities: [
            {
              opportunity: 'Enterprise market',
              value: 150000000,
              requirements: ['Enterprise features', 'Sales team'],
              timeline: '2024-2026'
            }
          ],
          threats: [
            {
              threat: 'Market consolidation',
              severity: 'high',
              timeline: 'Immediate',
              mitigation: ['Differentiation', 'Niche focus']
            }
          ]
        },
        recommendations: ['Focus on enterprise', 'Accelerate AI development'],
        lastUpdated: new Date()
      }
    ];

    mockStandards = [
      {
        id: 'standard-001',
        name: 'DNS Standards',
        category: 'Technical Standards',
        status: 'active',
        organization: 'IETF',
        description: 'Core DNS protocol standards',
        relevance: 'critical',
        companyPosition: 'Contributor',
        involvement: {
          level: 'active',
          representatives: ['Tech Lead'],
          workingGroups: ['DNS WG'],
          contributions: ['RFC proposals']
        },
        timeline: {
          adopted: new Date('2020-01-01'),
          nextReview: new Date('2025-01-01'),
          sunset: null
        },
        impact: {
          products: ['Core DNS'],
          revenue: 50000000,
          marketAccess: 'Global',
          competitiveAdvantage: 'High'
        },
        strategy: {
          objective: 'Influence standards',
          approach: 'Active participation',
          resources: 2000000,
          partnerships: ['Industry consortiums']
        }
      }
    ];

    mockStrategies = [
      {
        id: 'strategy-001',
        name: 'AI/ML R&D Strategy',
        focus: 'AI-powered DNS',
        timeHorizon: '3 years',
        budget: 15000000,
        objectives: ['Technology leadership', 'Market differentiation'],
        projects: [
          {
            id: 'proj-001',
            name: 'AI DNS Optimization',
            priority: 'high',
            phase: 'development',
            budget: 5000000,
            timeline: '18 months',
            objectives: ['Performance improvement'],
            keyMilestones: ['Prototype', 'Beta', 'Launch'],
            risks: ['Technical complexity'],
            expectedROI: 3.5
          }
        ],
        partnerships: [
          {
            partner: 'University Research Lab',
            type: 'research',
            scope: 'AI algorithms',
            investment: 1000000,
            duration: '2 years',
            expectedOutcomes: ['New algorithms', 'Patents']
          }
        ],
        metrics: {
          totalProjects: 8,
          activeProjects: 6,
          completedProjects: 2,
          successRate: 0.75,
          averageROI: 3.2,
          patentsGenerated: 12
        },
        governance: {
          committee: 'R&D Steering Committee',
          reviewFrequency: 'monthly',
          decisionProcess: 'Stage-gate',
          performanceMetrics: ['ROI', 'Time to market']
        }
      }
    ];
  });

  describe('初期化', () => {
    it('サービスが正しく初期化される', () => {
      expect(service).toBeDefined();
      expect(service.getLatestDashboard()).toBeUndefined();
      expect(service.getAllReports()).toHaveLength(0);
    });
  });

  describe('競争優位性ダッシュボード生成', () => {
    it('ダッシュボードを正しく生成する', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.overview.totalAdvantages).toBe(2);
      expect(dashboard.overview.sustainableAdvantages).toBe(1);
      expect(dashboard.overview.patentPortfolioValue).toBe(225000000); // 45 patents * 5M each
      expect(dashboard.overview.innovationIndex).toBe(85);
      expect(dashboard.overview.competitivePosition).toBe(85);
    });

    it('ポートフォリオ分析が正しい', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );

      expect(dashboard.portfolio.byType.sustainable).toBe(1);
      expect(dashboard.portfolio.byType.temporary).toBe(1);
      expect(dashboard.portfolio.byCategory['User Experience']).toBe(1);
      expect(dashboard.portfolio.byCategory['Technology']).toBe(1);
    });

    it('トレンド情報が含まれる', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );

      expect(dashboard.trends.innovation.direction).toBe('improving');
      expect(dashboard.trends.innovation.rate).toBe(0.15);
      expect(dashboard.trends.competition.intensity).toBe('increasing');
      expect(dashboard.trends.market.growth).toBe(0.25);
    });

    it('アラートが生成される', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );

      expect(dashboard.alerts).toHaveLength(3);
      expect(dashboard.alerts[0].type).toBe('opportunity');
      expect(dashboard.alerts[0].severity).toBe('high');
      expect(dashboard.alerts[0].action).toBeDefined();
    });

    it('パフォーマンス情報が含まれる', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );

      expect(dashboard.performance.achievements).toHaveLength(4);
      expect(dashboard.performance.gaps).toHaveLength(4);
      expect(dashboard.performance.recommendations).toHaveLength(4);
      expect(dashboard.performance.nextReview).toBeDefined();
    });
  });

  describe('エグゼクティブサマリー生成', () => {
    it('エグゼクティブサマリーを正しく生成する', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );
      const summary = service.generateExecutiveSummary('Q1 2024', dashboard, mockInnovationMetrics);

      expect(summary).toBeDefined();
      expect(summary.period).toBe('Q1 2024');
      expect(summary.keyHighlights).toHaveLength(4);
      expect(summary.performanceMetrics).toHaveLength(4);
      expect(summary.strategicInsights).toHaveLength(2);
      expect(summary.actionItems).toHaveLength(3);
      expect(summary.nextSteps).toHaveLength(5);
    });

    it('キーハイライトが適切に分類される', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );
      const summary = service.generateExecutiveSummary('Q1 2024', dashboard, mockInnovationMetrics);

      const categories = summary.keyHighlights.map(h => h.category);
      expect(categories).toContain('achievement');
      expect(categories).toContain('opportunity');
      expect(categories).toContain('challenge');
      expect(categories).toContain('risk');
    });

    it('パフォーマンスメトリクスが正しく計算される', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );
      const summary = service.generateExecutiveSummary('Q1 2024', dashboard, mockInnovationMetrics);

      const innovationMetric = summary.performanceMetrics.find(m => m.name === 'Innovation Index');
      expect(innovationMetric).toBeDefined();
      expect(innovationMetric?.current).toBe(85);
      expect(innovationMetric?.trend).toBe('improving');
    });

    it('アクション項目が優先度順にソートされる', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );
      const summary = service.generateExecutiveSummary('Q1 2024', dashboard, mockInnovationMetrics);

      expect(summary.actionItems[0].priority).toBe('critical');
      expect(['high', 'medium', 'low']).toContain(summary.actionItems[1].priority);
    });
  });

  describe('総合レポート生成', () => {
    it('総合レポートを正しく生成する', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      expect(report).toBeDefined();
      expect(report.title).toContain('DNSweeper Competitive Advantage Report');
      expect(report.period).toBe('Q1 2024');
      expect(report.executiveSummary).toBeDefined();
      expect(report.competitiveAnalysis).toBeDefined();
      expect(report.innovationMetrics).toBeDefined();
      expect(report.patentPortfolio).toBeDefined();
      expect(report.marketPosition).toBeDefined();
      expect(report.financialPerformance).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.appendices).toBeDefined();
    });

    it('競争分析セクションが正しく生成される', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      expect(report.competitiveAnalysis.competitorProfiles).toHaveLength(1);
      expect(report.competitiveAnalysis.marketTrends).toHaveLength(3);
      expect(report.competitiveAnalysis.opportunities).toHaveLength(1);
      expect(report.competitiveAnalysis.threats).toHaveLength(1);
    });

    it('イノベーションメトリクスセクションが正しく生成される', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      expect(report.innovationMetrics.rdIntensity).toBe(0.18);
      expect(report.innovationMetrics.innovationIndex).toBe(85);
      expect(report.innovationMetrics.pipeline).toBeDefined();
      expect(report.innovationMetrics.recentLaunches).toHaveLength(2);
    });

    it('付録が正しく生成される', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      expect(report.appendices).toHaveLength(3);
      expect(report.appendices[0].title).toContain('Competitive Analysis');
      expect(report.appendices[1].title).toContain('Patent Portfolio');
      expect(report.appendices[2].title).toContain('Innovation Metrics');
    });
  });

  describe('レポートエクスポート', () => {
    it('JSON形式でエクスポートできる', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      const exported = service.exportReport(report.id, ExportFormat.JSON);
      expect(exported).toBeDefined();
      
      const parsed = JSON.parse(exported);
      expect(parsed.title).toBe(report.title);
      expect(parsed.period).toBe(report.period);
    });

    it('HTML形式でエクスポートできる', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      const exported = service.exportReport(report.id, ExportFormat.HTML);
      expect(exported).toContain('<!DOCTYPE html>');
      expect(exported).toContain(report.title);
      expect(exported).toContain('Executive Summary');
      expect(exported).toContain('Performance Metrics');
    });

    it('サポートされていない形式でエラーを投げる', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      expect(() => {
        service.exportReport(report.id, 'invalid' as ExportFormat);
      }).toThrow('Unsupported export format');
    });

    it('存在しないレポートIDでエラーを投げる', () => {
      expect(() => {
        service.exportReport('non-existent', ExportFormat.JSON);
      }).toThrow('Report not found');
    });
  });

  describe('レポート管理', () => {
    it('最新のダッシュボードを取得できる', () => {
      service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );

      const latest = service.getLatestDashboard();
      expect(latest).toBeDefined();
      expect(latest?.overview.totalAdvantages).toBe(2);
    });

    it('エグゼクティブサマリーを取得できる', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );
      const summary = service.generateExecutiveSummary('Q1 2024', dashboard, mockInnovationMetrics);

      const retrieved = service.getExecutiveSummary(summary.id);
      expect(retrieved).toEqual(summary);
    });

    it('総合レポートを取得できる', () => {
      const report = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      const retrieved = service.getComprehensiveReport(report.id);
      expect(retrieved).toEqual(report);
    });

    it('全てのレポートを取得できる', () => {
      service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      service.generateComprehensiveReport(
        'Q2 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      const allReports = service.getAllReports();
      expect(allReports).toHaveLength(2);
    });
  });

  describe('データ整合性', () => {
    it('ダッシュボードのタイムスタンプが正しい', () => {
      const before = new Date();
      const dashboard = service.generateCompetitiveAdvantageDashboard(
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics
      );
      const after = new Date();

      expect(dashboard.overview.lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(dashboard.overview.lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('レポートIDがユニークである', () => {
      const report1 = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      const report2 = service.generateComprehensiveReport(
        'Q1 2024',
        mockAnalyses,
        mockAdvantages,
        mockPatents,
        mockInnovationMetrics,
        mockStandards,
        mockStrategies
      );

      expect(report1.id).not.toBe(report2.id);
    });

    it('空のデータでも正しく処理される', () => {
      const dashboard = service.generateCompetitiveAdvantageDashboard([], [], mockInnovationMetrics);
      
      expect(dashboard.overview.totalAdvantages).toBe(0);
      expect(dashboard.overview.sustainableAdvantages).toBe(0);
      expect(dashboard.overview.patentPortfolioValue).toBe(0);
    });
  });
});