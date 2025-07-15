/**
 * CompetitiveAnalysisCore テストスイート
 */

import { CompetitiveAnalysisCore } from '../competitive-analysis-core';
import { CompetitiveAnalysis, CompetitiveAdvantage } from '../../types/competitive-advantages';

describe('CompetitiveAnalysisCore', () => {
  let core: CompetitiveAnalysisCore;

  beforeEach(() => {
    core = new CompetitiveAnalysisCore();
  });

  describe('競争分析機能', () => {
    it('初期化時に基本的な競争分析が作成される', () => {
      const analysis = core.getCompetitiveAnalysis('dns-market-competitive-analysis');
      expect(analysis).toBeDefined();
      expect(analysis?.name).toBe('DNS Market Competitive Analysis 2024');
      expect(analysis?.competitors).toHaveLength(3);
    });

    it('競争分析を追加できる', () => {
      const newAnalysis: CompetitiveAnalysis = {
        id: 'test-analysis',
        name: 'Test Analysis',
        scope: 'Test scope',
        competitors: [],
        methodology: {
          framework: 'Test framework',
          dataCollection: [],
          updateFrequency: 'monthly',
          confidenceLevel: 0.8
        },
        findings: {
          marketTrends: [],
          competitiveGaps: [],
          opportunities: [],
          threats: []
        },
        recommendations: []
      };

      core.addCompetitiveAnalysis(newAnalysis);
      const retrieved = core.getCompetitiveAnalysis('test-analysis');
      expect(retrieved).toEqual(newAnalysis);
    });

    it('全ての競争分析を取得できる', () => {
      const analyses = core.getAllCompetitiveAnalyses();
      expect(analyses).toHaveLength(1);
      expect(analyses[0].id).toBe('dns-market-competitive-analysis');
    });
  });

  describe('競争優位性機能', () => {
    it('初期化時に競争優位性が作成される', () => {
      const advantages = core.getAllCompetitiveAdvantages();
      expect(advantages).toHaveLength(3);
      
      const uxAdvantage = core.getCompetitiveAdvantage('superior-user-experience');
      expect(uxAdvantage).toBeDefined();
      expect(uxAdvantage?.name).toBe('Superior User Experience and Interface Design');
    });

    it('競争優位性を追加できる', () => {
      const newAdvantage: CompetitiveAdvantage = {
        id: 'test-advantage',
        name: 'Test Advantage',
        description: 'Test description',
        type: 'temporary',
        category: 'technology',
        sources: [{
          source: 'Test source',
          strength: 8,
          sustainability: 7,
          imitability: 'moderate',
          substitutability: 'medium',
          rarity: 'common'
        }],
        competitiveGap: {
          currentPosition: 'Test current',
          targetPosition: 'Test target',
          gap: 'Test gap',
          timeline: '2024'
        },
        defensibility: {
          barriers: ['Test barrier'],
          moat: 'Test moat',
          sustainability: 'Test sustainability'
        },
        metrics: {}
      };

      core.addCompetitiveAdvantage(newAdvantage);
      const retrieved = core.getCompetitiveAdvantage('test-advantage');
      expect(retrieved).toEqual(newAdvantage);
    });

    it('競争優位性の強度計算が正しい', () => {
      const uxAdvantage = core.getCompetitiveAdvantage('superior-user-experience');
      expect(uxAdvantage?.sources).toHaveLength(3);
      expect(uxAdvantage?.sources[0].strength).toBe(9);
      expect(uxAdvantage?.sources[0].sustainability).toBe(8);
    });
  });

  describe('イノベーションメトリクス', () => {
    it('イノベーションメトリクスが正しく計算される', () => {
      const metrics = core.getInnovationMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.overview.rdIntensity).toBe(0.18);
      expect(metrics.overview.innovationIndex).toBe(85);
      expect(metrics.input.rdInvestment).toBe(45000000);
      expect(metrics.process.projectsInPipeline).toBe(24);
    });

    it('イノベーション指標の構造が正しい', () => {
      const metrics = core.getInnovationMetrics();
      expect(metrics.overview).toBeDefined();
      expect(metrics.input).toBeDefined();
      expect(metrics.process).toBeDefined();
      expect(metrics.output).toBeDefined();
      expect(metrics.impact).toBeDefined();
    });
  });

  describe('ダッシュボード生成', () => {
    it('競争優位性ダッシュボードが正しく生成される', () => {
      const dashboard = core.generateCompetitiveAdvantageDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.id).toBe('competitive-advantage-dashboard');
      expect(dashboard.overview.totalAdvantages).toBe(3);
      expect(dashboard.overview.averageStrength).toBeGreaterThan(0);
    });

    it('ダッシュボードに市場分析が含まれる', () => {
      const dashboard = core.generateCompetitiveAdvantageDashboard();
      expect(dashboard.marketAnalysis).toBeDefined();
      expect(dashboard.marketAnalysis.opportunities).toHaveLength(3);
      expect(dashboard.marketAnalysis.threats).toHaveLength(2);
      expect(dashboard.marketAnalysis.totalMarketValue).toBeGreaterThan(0);
    });

    it('ダッシュボードに推奨事項が含まれる', () => {
      const dashboard = core.generateCompetitiveAdvantageDashboard();
      expect(dashboard.recommendations).toHaveLength(3);
      expect(dashboard.recommendations[0].area).toBe('Competitive Positioning');
      expect(dashboard.recommendations[0].priority).toBe('high');
    });

    it('強度分析がカテゴリ別に正しく分類される', () => {
      const dashboard = core.generateCompetitiveAdvantageDashboard();
      expect(dashboard.strengthAnalysis.byCategory).toBeDefined();
      expect(dashboard.strengthAnalysis.topAdvantages).toHaveLength(3);
    });
  });

  describe('データ整合性', () => {
    it('競争分析データが整合性を保つ', () => {
      const analysis = core.getCompetitiveAnalysis('dns-market-competitive-analysis');
      expect(analysis?.competitors).toHaveLength(3);
      
      // Cloudflareの競合データをチェック
      const cloudflare = analysis?.competitors.find(c => c.name === 'Cloudflare');
      expect(cloudflare).toBeDefined();
      expect(cloudflare?.type).toBe('direct');
      expect(cloudflare?.strengths).toHaveLength(5);
      expect(cloudflare?.weaknesses).toHaveLength(5);
    });

    it('競争優位性データが整合性を保つ', () => {
      const advantages = core.getAllCompetitiveAdvantages();
      advantages.forEach(advantage => {
        expect(advantage.id).toBeDefined();
        expect(advantage.name).toBeDefined();
        expect(advantage.sources).toHaveLength(3);
        expect(advantage.competitiveGap).toBeDefined();
        expect(advantage.defensibility).toBeDefined();
      });
    });
  });
});