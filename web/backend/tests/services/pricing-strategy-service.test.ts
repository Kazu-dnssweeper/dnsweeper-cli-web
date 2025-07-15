/**
 * DNSweeper 価格戦略最適化サービステスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PricingStrategyService } from '../../src/services/pricing-strategy-service';

describe('PricingStrategyService', () => {
  let service: PricingStrategyService;

  beforeEach(() => {
    service = new PricingStrategyService();
  });

  describe('基本価格戦略', () => {
    it('フリーミアム戦略を取得できる', () => {
      const strategy = service.getPricingStrategy('freemium');
      
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe('Freemium');
      expect(strategy?.model).toBe('freemium');
      expect(strategy?.tiers).toHaveLength(3);
      expect(strategy?.tiers[0].id).toBe('free');
      expect(strategy?.tiers[0].basePrice).toBe(0);
      expect(strategy?.tiers[1].id).toBe('pro');
      expect(strategy?.tiers[1].basePrice).toBe(29);
      expect(strategy?.tiers[2].id).toBe('enterprise');
      expect(strategy?.tiers[2].basePrice).toBe(299);
    });

    it('従量課金戦略を取得できる', () => {
      const strategy = service.getPricingStrategy('pay-as-you-go');
      
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe('Pay-as-you-go');
      expect(strategy?.model).toBe('usage-based');
      expect(strategy?.tiers[0].usagePricing).toBeDefined();
      expect(strategy?.tiers[0].usagePricing?.dnsQuery).toBe(0.001);
      expect(strategy?.tiers[0].usagePricing?.csvFile).toBe(0.10);
    });

    it('すべての価格戦略を取得できる', () => {
      const strategies = service.getAllPricingStrategies();
      
      expect(strategies).toHaveLength(2);
      expect(strategies.map(s => s.id)).toContain('freemium');
      expect(strategies.map(s => s.id)).toContain('pay-as-you-go');
    });
  });

  describe('地域別価格設定', () => {
    it('日本の地域別価格を取得できる', () => {
      const regional = service.getRegionalPricing('JP');
      
      expect(regional).toBeDefined();
      expect(regional?.name).toBe('日本');
      expect(regional?.currency).toBe('JPY');
      expect(regional?.pppAdjustment.multiplier).toBe(0.85);
      expect(regional?.taxConfiguration.rate).toBe(0.10);
      expect(regional?.localizedFeatures).toContain('日本語サポート');
    });

    it('米国の地域別価格を取得できる', () => {
      const regional = service.getRegionalPricing('US');
      
      expect(regional).toBeDefined();
      expect(regional?.currency).toBe('USD');
      expect(regional?.pppAdjustment.multiplier).toBe(1.0);
      expect(regional?.taxConfiguration.rate).toBe(0.08);
    });

    it('すべての地域別価格を取得できる', () => {
      const regions = service.getAllRegionalPricing();
      
      expect(regions.length).toBeGreaterThan(5);
      expect(regions.map(r => r.region)).toContain('JP');
      expect(regions.map(r => r.region)).toContain('US');
      expect(regions.map(r => r.region)).toContain('EU');
      expect(regions.map(r => r.region)).toContain('CN');
      expect(regions.map(r => r.region)).toContain('IN');
    });
  });

  describe('地域別価格計算', () => {
    it('日本向けの価格を正しく計算できる', () => {
      const result = service.calculateRegionalPrice(100, 'JP', 'pro');
      
      expect(result.localPrice).toBe(85); // 100 * 0.85
      expect(result.currency).toBe('JPY');
      expect(result.pppAdjusted).toBe(85);
      expect(result.taxIncluded).toBe(93.5); // 85 * 1.10
      expect(result.savings).toBe(15);
    });

    it('インド向けの価格を正しく計算できる', () => {
      const result = service.calculateRegionalPrice(100, 'IN', 'pro');
      
      expect(result.localPrice).toBe(25); // 100 * 0.25
      expect(result.currency).toBe('INR');
      expect(result.pppAdjusted).toBe(25);
      expect(result.taxIncluded).toBe(29.5); // 25 * 1.18
      expect(result.savings).toBe(75);
    });

    it('存在しない地域はエラーを返す', () => {
      expect(() => {
        service.calculateRegionalPrice(100, 'INVALID', 'pro');
      }).toThrow('地域価格設定が見つかりません');
    });
  });

  describe('競合価格分析', () => {
    it('Cloudflareの競合分析を取得できる', () => {
      const competitor = service.getCompetitivePricing('Cloudflare DNS');
      
      expect(competitor).toBeDefined();
      expect(competitor?.competitorType).toBe('indirect');
      expect(competitor?.marketShare).toBe(0.25);
      expect(competitor?.strengths).toContain('高速');
      expect(competitor?.weaknesses).toContain('機能制限');
    });

    it('AWS Route53の競合分析を取得できる', () => {
      const competitor = service.getCompetitivePricing('AWS Route53');
      
      expect(competitor).toBeDefined();
      expect(competitor?.competitorType).toBe('indirect');
      expect(competitor?.marketShare).toBe(0.35);
      expect(competitor?.pricingModel).toBe('usage-based');
    });

    it('すべての競合分析を取得できる', () => {
      const competitors = service.getAllCompetitivePricing();
      
      expect(competitors.length).toBeGreaterThan(3);
      expect(competitors.map(c => c.competitorName)).toContain('DNSControl');
      expect(competitors.map(c => c.competitorName)).toContain('octoDNS');
      expect(competitors.map(c => c.competitorName)).toContain('AWS Route53');
      expect(competitors.map(c => c.competitorName)).toContain('Cloudflare DNS');
    });
  });

  describe('バンドルパッケージ', () => {
    it('スタートアップパッケージを取得できる', () => {
      const bundle = service.getBundlePackage('startup-bundle');
      
      expect(bundle).toBeDefined();
      expect(bundle?.name).toBe('Startup Accelerator');
      expect(bundle?.discount).toBe(0.50);
      expect(bundle?.pricing.basePrice).toBe(14.50);
      expect(bundle?.eligibilityCriteria.companyAge).toBe(24);
    });

    it('エンタープライズパッケージを取得できる', () => {
      const bundle = service.getBundlePackage('enterprise-suite');
      
      expect(bundle).toBeDefined();
      expect(bundle?.discount).toBe(0.20);
      expect(bundle?.pricing.basePrice).toBe(239.20);
      expect(bundle?.pricing.setupFee).toBe(5000);
    });

    it('教育機関パッケージを取得できる', () => {
      const bundle = service.getBundlePackage('education-package');
      
      expect(bundle).toBeDefined();
      expect(bundle?.discount).toBe(0.70);
      expect(bundle?.pricing.basePrice).toBe(8.70);
      expect(bundle?.eligibilityCriteria.organizationType).toBe('education');
    });

    it('すべてのバンドルパッケージを取得できる', () => {
      const bundles = service.getAllBundlePackages();
      
      expect(bundles).toHaveLength(3);
      expect(bundles.map(b => b.id)).toContain('startup-bundle');
      expect(bundles.map(b => b.id)).toContain('enterprise-suite');
      expect(bundles.map(b => b.id)).toContain('education-package');
    });
  });

  describe('動的価格調整', () => {
    it('需要に基づいて価格を調整できる', async () => {
      const demandMetrics = {
        currentDemand: 1200,
        historicalDemand: [1000, 900, 1100, 1000, 950],
        seasonality: 0.5,
        competitorActivity: 0.2
      };

      const result = await service.executeDynamicPricing('US', 'pro', demandMetrics);
      
      expect(result.originalPrice).toBe(29);
      expect(result.adjustedPrice).toBeGreaterThan(29); // 需要が高いので価格上昇
      expect(result.adjustmentFactors.demand).toBeGreaterThan(1);
      expect(result.adjustmentFactors.seasonal).toBeGreaterThan(1);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.recommendations).toHaveLength(2);
    });

    it('存在しないティアはエラーを返す', async () => {
      const demandMetrics = {
        currentDemand: 1000,
        historicalDemand: [1000],
        seasonality: 0,
        competitorActivity: 0
      };

      await expect(
        service.executeDynamicPricing('US', 'invalid', demandMetrics)
      ).rejects.toThrow('価格ティア が見つかりません');
    });
  });

  describe('価格最適化提案', () => {
    it('低い変換率に対して価格引き下げを提案する', () => {
      const performance = {
        conversionRate: 0.05,
        churnRate: 0.03,
        customerSatisfaction: 4.2,
        competitivePosition: 0.5
      };

      const optimizations = service.optimizePricingStrategy(performance);
      
      expect(optimizations.length).toBeGreaterThan(0);
      expect(optimizations[0].strategy).toBe('Lower Price Point');
      expect(optimizations[0].priority).toBe('high');
      expect(optimizations[0].expectedImpact.conversion).toBeGreaterThan(0);
    });

    it('高いチャーン率に対して年間契約を提案する', () => {
      const performance = {
        conversionRate: 0.15,
        churnRate: 0.08,
        customerSatisfaction: 4.0,
        competitivePosition: 0.6
      };

      const optimizations = service.optimizePricingStrategy(performance);
      
      const annualIncentive = optimizations.find(o => o.strategy === 'Annual Commitment Incentive');
      expect(annualIncentive).toBeDefined();
      expect(annualIncentive?.expectedImpact.churn).toBeLessThan(0);
      expect(annualIncentive?.riskLevel).toBe('low');
    });

    it('高い顧客満足度に対してプレミアムティアを提案する', () => {
      const performance = {
        conversionRate: 0.20,
        churnRate: 0.02,
        customerSatisfaction: 4.7,
        competitivePosition: 0.8
      };

      const optimizations = service.optimizePricingStrategy(performance);
      
      const premiumTier = optimizations.find(o => o.strategy === 'Value-Based Premium Tier');
      expect(premiumTier).toBeDefined();
      expect(premiumTier?.expectedImpact.revenue).toBeGreaterThan(0.3);
      expect(premiumTier?.priority).toBe('medium');
    });
  });

  describe('価格分析', () => {
    it('価格分析データを取得できる', () => {
      const analytics = service.getPricingAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.conversionRates).toBeDefined();
      expect(analytics.revenueMetrics).toBeDefined();
      expect(analytics.priceSensitivity).toBeDefined();
      expect(analytics.regionalPerformance).toBeDefined();
      expect(analytics.priceSensitivity.elasticityCoefficient).toBe(-1.2);
      expect(analytics.priceSensitivity.demandForecast.length).toBeGreaterThan(0);
    });
  });
});