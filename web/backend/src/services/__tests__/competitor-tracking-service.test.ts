/**
 * CompetitorTrackingService テストスイート
 */

import { CompetitorTrackingService, CompetitorProfile, CompetitiveThreat } from '../competitor-tracking-service';

describe('CompetitorTrackingService', () => {
  let service: CompetitorTrackingService;

  beforeEach(() => {
    service = new CompetitorTrackingService();
  });

  describe('初期化', () => {
    it('競合他社が初期化される', () => {
      const competitors = service.getAllCompetitors();
      expect(competitors).toHaveLength(3);
      
      const cloudflare = service.getCompetitor('cloudflare');
      expect(cloudflare).toBeDefined();
      expect(cloudflare?.name).toBe('Cloudflare');
      expect(cloudflare?.type).toBe('direct');
    });

    it('各競合他社のデータが完全である', () => {
      const competitors = service.getAllCompetitors();
      
      competitors.forEach(competitor => {
        expect(competitor.id).toBeDefined();
        expect(competitor.name).toBeDefined();
        expect(competitor.strengths.length).toBeGreaterThan(0);
        expect(competitor.weaknesses.length).toBeGreaterThan(0);
        expect(competitor.resources).toBeDefined();
        expect(competitor.innovation).toBeDefined();
        expect(competitor.trackingMetrics).toBeDefined();
      });
    });
  });

  describe('競合他社管理', () => {
    it('新しい競合他社を追加できる', () => {
      const newCompetitor: CompetitorProfile = {
        id: 'test-competitor',
        name: 'Test Competitor',
        type: 'potential',
        marketPosition: 'Emerging player',
        strengths: ['Innovation'],
        weaknesses: ['Limited resources'],
        strategy: 'Disruptive approach',
        resources: {
          rdBudget: 10000000,
          patents: 5,
          talent: 50,
          partnerships: []
        },
        innovation: {
          focus: ['New technology'],
          capabilities: ['R&D'],
          pipeline: ['Product X'],
          timeline: ['2024: Launch']
        },
        threats: [],
        opportunities: [],
        trackingMetrics: {
          marketShare: 0.01,
          marketShareTrend: 'growing'
        },
        lastUpdated: new Date()
      };

      service.addCompetitor(newCompetitor);
      const retrieved = service.getCompetitor('test-competitor');
      expect(retrieved).toEqual(newCompetitor);
    });

    it('競合他社を更新できる', () => {
      const updates = {
        trackingMetrics: {
          marketShare: 0.25,
          marketShareTrend: 'growing' as const
        }
      };

      service.updateCompetitor('cloudflare', updates);
      const updated = service.getCompetitor('cloudflare');
      expect(updated?.trackingMetrics.marketShare).toBe(0.25);
      expect(updated?.lastUpdated).toBeDefined();
    });

    it('存在しない競合他社の更新は何も起こらない', () => {
      const updates = { name: 'New Name' };
      service.updateCompetitor('non-existent', updates);
      const competitor = service.getCompetitor('non-existent');
      expect(competitor).toBeUndefined();
    });
  });

  describe('競合動向分析', () => {
    it('競合動向を分析できる', () => {
      const analysis = service.analyzeCompetitorTrends('cloudflare');
      
      expect(analysis.competitorId).toBe('cloudflare');
      expect(analysis.period).toBe('quarterly');
      expect(analysis.trends).toHaveLength(3);
      expect(analysis.predictions.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('存在しない競合他社でエラーが発生する', () => {
      expect(() => {
        service.analyzeCompetitorTrends('non-existent');
      }).toThrow('Competitor not found: non-existent');
    });

    it('トレンドが適切に分類される', () => {
      const analysis = service.analyzeCompetitorTrends('cloudflare');
      
      analysis.trends.forEach(trend => {
        expect(trend.category).toBeDefined();
        expect(trend.trend).toBeDefined();
        expect(['positive', 'negative', 'neutral']).toContain(trend.direction);
        expect(['high', 'medium', 'low']).toContain(trend.significance);
        expect(trend.evidence.length).toBeGreaterThan(0);
      });
    });
  });

  describe('競合インテリジェンスレポート', () => {
    it('インテリジェンスレポートを生成できる', () => {
      const report = service.generateIntelligenceReport();
      
      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.competitors).toHaveLength(3);
      expect(report.marketDynamics).toBeDefined();
      expect(report.threatAssessment).toBeDefined();
      expect(report.opportunityAssessment).toBeDefined();
      expect(report.strategicRecommendations).toHaveLength(3);
    });

    it('市場動態が正しく分析される', () => {
      const report = service.generateIntelligenceReport();
      const dynamics = report.marketDynamics;
      
      expect(dynamics.marketConcentration).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(dynamics.competitiveIntensity);
      expect(dynamics.entryBarriers.length).toBeGreaterThan(0);
      expect(dynamics.disruptionRisk).toBeGreaterThan(0);
      expect(dynamics.consolidationTrend).toBeDefined();
    });

    it('脅威評価が適切に実行される', () => {
      const report = service.generateIntelligenceReport();
      const assessment = report.threatAssessment;
      
      expect(assessment.criticalThreats).toBeDefined();
      expect(assessment.emergingThreats).toBeDefined();
      expect(assessment.mitigationStrategies.length).toBeGreaterThan(0);
      expect(assessment.overallRisk).toBeGreaterThan(0);
    });

    it('機会評価が適切に実行される', () => {
      const report = service.generateIntelligenceReport();
      const assessment = report.opportunityAssessment;
      
      expect(assessment.prioritizedOpportunities).toBeDefined();
      expect(assessment.quickWins).toBeDefined();
      expect(assessment.strategicBets).toBeDefined();
      expect(assessment.totalValue).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンス比較', () => {
    it('市場シェアを比較できる', () => {
      const comparison = service.compareCompetitorPerformance('marketShare');
      
      expect(comparison.size).toBe(3);
      expect(comparison.get('Cloudflare')).toBeDefined();
      expect(comparison.get('AWS Route 53')).toBeDefined();
      expect(comparison.get('Google Cloud DNS')).toBeDefined();
    });

    it('成長率を比較できる', () => {
      const comparison = service.compareCompetitorPerformance('growthRate');
      
      comparison.forEach((value, name) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('脅威アラート', () => {
    it('高レベルの脅威アラートを生成できる', () => {
      const alerts = service.generateThreatAlerts('high');
      
      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach(alert => {
        expect(alert.severity).toBe('high');
        expect(alert.probability).toBeGreaterThan(0.6);
      });
    });

    it('脅威が優先度順にソートされる', () => {
      const alerts = service.generateThreatAlerts('medium');
      
      for (let i = 0; i < alerts.length - 1; i++) {
        const currentScore = alerts[i].probability * alerts[i].impact;
        const nextScore = alerts[i + 1].probability * alerts[i + 1].impact;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('競合他社名が脅威説明に含まれる', () => {
      const alerts = service.generateThreatAlerts('high');
      
      alerts.forEach(alert => {
        expect(alert.threat).toMatch(/^(Cloudflare|AWS Route 53|Google Cloud DNS):/);
      });
    });
  });

  describe('データ整合性', () => {
    it('リソースデータが整合性を保つ', () => {
      const competitors = service.getAllCompetitors();
      
      competitors.forEach(competitor => {
        expect(competitor.resources.rdBudget).toBeGreaterThan(0);
        expect(competitor.resources.patents).toBeGreaterThan(0);
        expect(competitor.resources.talent).toBeGreaterThan(0);
        expect(competitor.resources.partnerships.length).toBeGreaterThan(0);
      });
    });

    it('イノベーションデータが整合性を保つ', () => {
      const competitors = service.getAllCompetitors();
      
      competitors.forEach(competitor => {
        expect(competitor.innovation.focus.length).toBeGreaterThan(0);
        expect(competitor.innovation.capabilities.length).toBeGreaterThan(0);
        expect(competitor.innovation.pipeline.length).toBeGreaterThan(0);
        expect(competitor.innovation.timeline.length).toBeGreaterThan(0);
      });
    });

    it('追跡メトリクスが有効な範囲内にある', () => {
      const competitors = service.getAllCompetitors();
      
      competitors.forEach(competitor => {
        expect(competitor.trackingMetrics.marketShare).toBeGreaterThan(0);
        expect(competitor.trackingMetrics.marketShare).toBeLessThan(1);
        expect(['growing', 'stable', 'declining']).toContain(competitor.trackingMetrics.marketShareTrend);
      });
    });
  });
});