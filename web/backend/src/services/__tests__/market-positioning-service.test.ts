/**
 * MarketPositioningService テストスイート
 */

import { MarketPositioningService, MarketPositioningAnalysis, MarketSegment, GrowthOpportunity } from '../market-positioning-service';
import { TechnologyStandards } from '../../types/competitive-advantages';

describe('MarketPositioningService', () => {
  let service: MarketPositioningService;

  beforeEach(() => {
    service = new MarketPositioningService();
  });

  describe('初期化', () => {
    it('市場ポジショニング分析が初期化される', () => {
      const analysis = service.getMarketPositioningAnalysis('dns-market-positioning-2024');
      expect(analysis).toBeDefined();
      expect(analysis?.name).toBe('DNS Market Positioning Analysis 2024');
      expect(analysis?.marketSegments).toHaveLength(4);
    });

    it('技術標準が初期化される', () => {
      const standards = service.getAllTechnologyStandards();
      expect(standards).toHaveLength(2);
      
      const dnsSecurityStandards = service.getTechnologyStandards('dns-security-standards');
      expect(dnsSecurityStandards).toBeDefined();
      expect(dnsSecurityStandards?.name).toBe('DNS Security and Privacy Standards Leadership');
    });
  });

  describe('市場ポジショニング分析', () => {
    it('市場ポジショニング分析を追加できる', () => {
      const testAnalysis: MarketPositioningAnalysis = {
        id: 'test-analysis',
        name: 'Test Analysis',
        marketSegments: [],
        competitivePosition: {
          current: 'Test current',
          desired: 'Test desired',
          gap: [],
          strengths: [],
          weaknesses: [],
          differentiators: []
        },
        marketShare: {
          total: 0.1,
          bySegment: {},
          byRegion: {},
          trend: 'growing',
          projectedGrowth: 0.2
        },
        growthOpportunities: [],
        positioningStrategy: {
          primaryPositioning: 'Test positioning',
          targetSegments: [],
          valueProposition: 'Test value prop',
          messagingStrategy: [],
          competitiveDifferentiation: [],
          pricingStrategy: 'Test pricing'
        },
        recommendedActions: []
      };

      service.addMarketPositioningAnalysis(testAnalysis);
      const retrieved = service.getMarketPositioningAnalysis('test-analysis');
      expect(retrieved).toEqual(testAnalysis);
    });

    it('全ての市場ポジショニング分析を取得できる', () => {
      const analyses = service.getAllMarketPositioningAnalyses();
      expect(analyses).toHaveLength(1);
      expect(analyses[0].id).toBe('dns-market-positioning-2024');
    });
  });

  describe('技術標準管理', () => {
    it('技術標準を追加できる', () => {
      const testStandards: TechnologyStandards = {
        id: 'test-standards',
        name: 'Test Standards',
        domain: 'Test Domain',
        participation: [],
        influence: {
          currentLevel: 'low',
          targetLevel: 'high',
          keyAreas: [],
          strategicGoals: []
        },
        timeline: {
          shortTerm: [],
          mediumTerm: [],
          longTerm: []
        },
        competitiveAdvantage: {
          market: [],
          technical: [],
          business: []
        }
      };

      service.addTechnologyStandards(testStandards);
      const retrieved = service.getTechnologyStandards('test-standards');
      expect(retrieved).toEqual(testStandards);
    });

    it('全ての技術標準を取得できる', () => {
      const standards = service.getAllTechnologyStandards();
      expect(standards).toHaveLength(2);
      
      const ids = standards.map(s => s.id);
      expect(ids).toContain('dns-security-standards');
      expect(ids).toContain('enterprise-automation-standards');
    });
  });

  describe('市場セグメント分析', () => {
    it('市場セグメントを分析できる', () => {
      const segments = service.analyzeMarketSegments('dns-market-positioning-2024');
      expect(segments).toHaveLength(4);
      
      const enterpriseSegment = segments.find(s => s.id === 'enterprise-segment');
      expect(enterpriseSegment).toBeDefined();
      expect(enterpriseSegment?.size).toBe(8500000000);
      expect(enterpriseSegment?.growth).toBe(0.15);
    });

    it('存在しない分析IDでエラーが発生する', () => {
      expect(() => {
        service.analyzeMarketSegments('non-existent-id');
      }).toThrow('Market positioning analysis not found: non-existent-id');
    });

    it('競争の激しさが正しく計算される', () => {
      const segments = service.analyzeMarketSegments('dns-market-positioning-2024');
      
      // 各セグメントの競争激しさが計算されることを確認
      segments.forEach(segment => {
        expect(segment).toHaveProperty('competitiveIntensity');
        expect(['high', 'medium', 'low']).toContain(segment.competitiveIntensity);
      });
    });

    it('成長ポテンシャルが正しく計算される', () => {
      const segments = service.analyzeMarketSegments('dns-market-positioning-2024');
      
      // 各セグメントの成長ポテンシャルが計算されることを確認
      segments.forEach(segment => {
        expect(segment).toHaveProperty('growthPotential');
        expect(['high', 'medium', 'low']).toContain(segment.growthPotential);
      });
    });

    it('参入障壁分析が実行される', () => {
      const segments = service.analyzeMarketSegments('dns-market-positioning-2024');
      
      // 各セグメントの参入障壁分析が実行されることを確認
      segments.forEach(segment => {
        expect(segment).toHaveProperty('barrierAnalysis');
        expect(segment.barrierAnalysis).toHaveProperty('overall');
        expect(segment.barrierAnalysis).toHaveProperty('primary');
        expect(segment.barrierAnalysis).toHaveProperty('mitigation');
      });
    });
  });

  describe('成長機会の優先順位付け', () => {
    it('成長機会を優先順位付けできる', () => {
      const opportunities = service.prioritizeGrowthOpportunities('dns-market-positioning-2024');
      expect(opportunities).toHaveLength(4);
      
      // 優先順位が正しく計算されることを確認
      opportunities.forEach(opportunity => {
        expect(opportunity).toHaveProperty('priority');
        expect(opportunity).toHaveProperty('feasibility');
        expect(opportunity).toHaveProperty('strategicFit');
        expect(['high', 'medium', 'low']).toContain(opportunity.priority);
        expect(['high', 'medium', 'low']).toContain(opportunity.feasibility);
        expect(['high', 'medium', 'low']).toContain(opportunity.strategicFit);
      });
    });

    it('機会が価値の高い順にソートされる', () => {
      const opportunities = service.prioritizeGrowthOpportunities('dns-market-positioning-2024');
      
      // 各機会の総合スコアが降順になっていることを確認
      for (let i = 0; i < opportunities.length - 1; i++) {
        const current = opportunities[i];
        const next = opportunities[i + 1];
        
        // 高い価値の機会が前に来ることを確認
        expect(current.value).toBeGreaterThanOrEqual(next.value * 0.5); // 許容範囲内
      }
    });

    it('存在しない分析IDでエラーが発生する', () => {
      expect(() => {
        service.prioritizeGrowthOpportunities('non-existent-id');
      }).toThrow('Market positioning analysis not found: non-existent-id');
    });
  });

  describe('市場データの整合性', () => {
    it('市場セグメントデータが整合性を保つ', () => {
      const analysis = service.getMarketPositioningAnalysis('dns-market-positioning-2024');
      expect(analysis).toBeDefined();
      
      const segments = analysis!.marketSegments;
      expect(segments).toHaveLength(4);
      
      // 各セグメントの必須フィールドが存在することを確認
      segments.forEach(segment => {
        expect(segment.id).toBeDefined();
        expect(segment.name).toBeDefined();
        expect(segment.size).toBeGreaterThan(0);
        expect(segment.growth).toBeGreaterThan(0);
        expect(segment.characteristics).toHaveLength(5);
        expect(segment.keyPlayers.length).toBeGreaterThan(0);
        expect(segment.barriers.length).toBeGreaterThan(0);
        expect(segment.opportunities.length).toBeGreaterThan(0);
      });
    });

    it('市場シェアデータが整合性を保つ', () => {
      const analysis = service.getMarketPositioningAnalysis('dns-market-positioning-2024');
      expect(analysis).toBeDefined();
      
      const marketShare = analysis!.marketShare;
      expect(marketShare.total).toBeGreaterThan(0);
      expect(marketShare.total).toBeLessThan(1);
      expect(marketShare.projectedGrowth).toBeGreaterThan(0);
      expect(['growing', 'stable', 'declining']).toContain(marketShare.trend);
      
      // セグメント別市場シェアが存在することを確認
      expect(Object.keys(marketShare.bySegment)).toHaveLength(4);
      expect(Object.keys(marketShare.byRegion)).toHaveLength(4);
    });

    it('競争ポジションデータが整合性を保つ', () => {
      const analysis = service.getMarketPositioningAnalysis('dns-market-positioning-2024');
      expect(analysis).toBeDefined();
      
      const position = analysis!.competitivePosition;
      expect(position.current).toBeDefined();
      expect(position.desired).toBeDefined();
      expect(position.gap.length).toBeGreaterThan(0);
      expect(position.strengths.length).toBeGreaterThan(0);
      expect(position.weaknesses.length).toBeGreaterThan(0);
      expect(position.differentiators.length).toBeGreaterThan(0);
    });
  });

  describe('戦略的分析', () => {
    it('ポジショニング戦略が適切に定義される', () => {
      const analysis = service.getMarketPositioningAnalysis('dns-market-positioning-2024');
      expect(analysis).toBeDefined();
      
      const strategy = analysis!.positioningStrategy;
      expect(strategy.primaryPositioning).toBeDefined();
      expect(strategy.targetSegments).toHaveLength(2);
      expect(strategy.valueProposition).toBeDefined();
      expect(strategy.messagingStrategy.length).toBeGreaterThan(0);
      expect(strategy.competitiveDifferentiation.length).toBeGreaterThan(0);
      expect(strategy.pricingStrategy).toBeDefined();
    });

    it('推奨アクションが適切に定義される', () => {
      const analysis = service.getMarketPositioningAnalysis('dns-market-positioning-2024');
      expect(analysis).toBeDefined();
      
      const actions = analysis!.recommendedActions;
      expect(actions).toHaveLength(5);
      
      actions.forEach(action => {
        expect(action.area).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(action.priority);
        expect(action.action).toBeDefined();
        expect(action.timeline).toBeDefined();
        expect(action.resources.length).toBeGreaterThan(0);
        expect(action.expectedImpact).toBeDefined();
      });
    });
  });
});