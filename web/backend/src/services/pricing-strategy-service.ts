/**
 * DNSweeper 価格戦略最適化サービス
 * 地域別価格設定・購買力平価調整・競合分析
 */

import {
  PricingStrategy,
  RegionalPricing,
  PricingTier,
  PurchasePowerParityAdjustment,
  CompetitivePricing,
  PricingElasticity,
  BundlePackage,
  PromotionStrategy,
  DynamicPricing,
  PricingAnalytics
} from '../types/pricing-strategy';

/**
 * 価格戦略最適化サービス
 */
export class PricingStrategyService {
  private pricingStrategies: Map<string, PricingStrategy> = new Map();
  private regionalPricing: Map<string, RegionalPricing> = new Map();
  private competitivePricing: Map<string, CompetitivePricing> = new Map();
  private bundlePackages: Map<string, BundlePackage> = new Map();
  private pricingAnalytics: PricingAnalytics;

  constructor() {
    this.initializeBasePricing();
    this.setupRegionalPricing();
    this.configureCompetitivePricing();
    this.createBundlePackages();
    this.initializePricingAnalytics();
  }

  // ===== 基本価格戦略の初期化 =====

  /**
   * 基本価格戦略の初期化
   */
  private initializeBasePricing(): void {
    // フリーミアム戦略
    this.addPricingStrategy({
      id: 'freemium',
      name: 'Freemium',
      description: '無料プランから始めて、成長とともにアップグレード',
      model: 'freemium',
      tiers: [
        {
          id: 'free',
          name: 'Free',
          description: '個人開発者・小規模プロジェクト向け',
          basePrice: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          features: [
            'DNS解決機能（月1万回まで）',
            'CSV処理（月10ファイルまで）',
            '基本レポート',
            'コミュニティサポート'
          ],
          limits: {
            dnsQueries: 10000,
            csvFiles: 10,
            domains: 5,
            storage: 100 // MB
          }
        },
        {
          id: 'pro',
          name: 'Pro',
          description: '成長企業・開発チーム向け',
          basePrice: 29,
          currency: 'USD',
          billingCycle: 'monthly',
          features: [
            'DNS解決機能（月100万回まで）',
            '無制限CSV処理',
            '高度なリスク分析',
            'API統合',
            'メールサポート'
          ],
          limits: {
            dnsQueries: 1000000,
            csvFiles: -1, // unlimited
            domains: 100,
            storage: 10000 // MB
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: '大企業・エンタープライズ向け',
          basePrice: 299,
          currency: 'USD',
          billingCycle: 'monthly',
          features: [
            '無制限DNS解決',
            'カスタムAPI',
            '専用サポート',
            'SLA保証',
            'オンプレミス対応'
          ],
          limits: {
            dnsQueries: -1, // unlimited
            csvFiles: -1,
            domains: -1,
            storage: -1
          }
        }
      ],
      elasticity: {
        freeToProConversion: 0.15,
        proToEnterpriseConversion: 0.08,
        priceElasticity: -1.2,
        demandSensitivity: 'medium'
      }
    });

    // 従量課金戦略
    this.addPricingStrategy({
      id: 'pay-as-you-go',
      name: 'Pay-as-you-go',
      description: '使った分だけ支払う従量課金モデル',
      model: 'usage-based',
      tiers: [
        {
          id: 'payg',
          name: 'Pay-as-you-go',
          description: '従量課金プラン',
          basePrice: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          features: [
            'DNS解決: $0.001/クエリ',
            'CSV処理: $0.10/ファイル',
            'レポート生成: $0.05/レポート',
            '使用量ダッシュボード'
          ],
          limits: {},
          usagePricing: {
            dnsQuery: 0.001,
            csvFile: 0.10,
            report: 0.05,
            apiCall: 0.0001
          }
        }
      ],
      elasticity: {
        priceElasticity: -0.8,
        demandSensitivity: 'low'
      }
    });
  }

  /**
   * 地域別価格設定
   */
  private setupRegionalPricing(): void {
    // 主要地域の購買力平価調整
    const regions = [
      {
        region: 'US',
        name: '北米',
        currency: 'USD',
        pppAdjustment: 1.0,
        taxRate: 0.08,
        localizedFeatures: ['英語サポート', 'USD決済']
      },
      {
        region: 'EU',
        name: 'ヨーロッパ',
        currency: 'EUR',
        pppAdjustment: 0.95,
        taxRate: 0.20, // VAT
        localizedFeatures: ['多言語サポート', 'EUR決済', 'GDPR準拠']
      },
      {
        region: 'JP',
        name: '日本',
        currency: 'JPY',
        pppAdjustment: 0.85,
        taxRate: 0.10,
        localizedFeatures: ['日本語サポート', 'JPY決済', '日本語UI']
      },
      {
        region: 'CN',
        name: '中国',
        currency: 'CNY',
        pppAdjustment: 0.45,
        taxRate: 0.06,
        localizedFeatures: ['中国語サポート', 'CNY決済', '現地データセンター']
      },
      {
        region: 'IN',
        name: 'インド',
        currency: 'INR',
        pppAdjustment: 0.25,
        taxRate: 0.18, // GST
        localizedFeatures: ['英語/ヒンディー語サポート', 'INR決済', '現地法準拠']
      },
      {
        region: 'BR',
        name: 'ブラジル',
        currency: 'BRL',
        pppAdjustment: 0.35,
        taxRate: 0.17,
        localizedFeatures: ['ポルトガル語サポート', 'BRL決済']
      },
      {
        region: 'AU',
        name: 'オーストラリア',
        currency: 'AUD',
        pppAdjustment: 0.90,
        taxRate: 0.10, // GST
        localizedFeatures: ['英語サポート', 'AUD決済', 'APAC時間帯サポート']
      },
      {
        region: 'KR',
        name: '韓国',
        currency: 'KRW',
        pppAdjustment: 0.70,
        taxRate: 0.10,
        localizedFeatures: ['韓国語サポート', 'KRW決済', '現地データセンター']
      },
      {
        region: 'AE',
        name: '中東',
        currency: 'AED',
        pppAdjustment: 0.80,
        taxRate: 0.05,
        localizedFeatures: ['アラビア語/英語サポート', 'AED決済', 'イスラム法準拠']
      },
      {
        region: 'ZA',
        name: '南アフリカ',
        currency: 'ZAR',
        pppAdjustment: 0.30,
        taxRate: 0.15,
        localizedFeatures: ['英語サポート', 'ZAR決済', 'アフリカ地域対応']
      }
    ];

    regions.forEach(region => {
      this.setRegionalPricing(region.region, {
        region: region.region,
        name: region.name,
        currency: region.currency,
        pppAdjustment: {
          multiplier: region.pppAdjustment,
          baseCurrency: 'USD',
          lastUpdated: new Date(),
          source: 'OECD PPP Data 2024'
        },
        taxConfiguration: {
          rate: region.taxRate,
          type: region.region === 'EU' ? 'VAT' : 'Sales Tax',
          included: false
        },
        paymentMethods: this.getRegionalPaymentMethods(region.region),
        localizedFeatures: region.localizedFeatures,
        competitivePosition: this.getCompetitivePosition(region.region),
        marketPenetration: this.getMarketPenetration(region.region)
      });
    });
  }

  /**
   * 競合価格分析の設定
   */
  private configureCompetitivePricing(): void {
    const competitors = [
      {
        name: 'DNSControl',
        type: 'direct',
        pricingModel: 'open-source',
        marketShare: 0.15,
        strengths: ['オープンソース', 'YAML設定', 'GitOps'],
        weaknesses: ['CLI専用', 'UI不足', '学習曲線'],
        pricing: {
          free: 0,
          pro: 0, // オープンソース
          enterprise: 25000 // サポート契約
        }
      },
      {
        name: 'octoDNS',
        type: 'direct',
        pricingModel: 'open-source',
        marketShare: 0.12,
        strengths: ['Python', 'プロバイダー多数', 'コミュニティ'],
        weaknesses: ['技術者向け', 'UI不足', '複雑な設定'],
        pricing: {
          free: 0,
          pro: 0,
          enterprise: 20000
        }
      },
      {
        name: 'AWS Route53',
        type: 'indirect',
        pricingModel: 'usage-based',
        marketShare: 0.35,
        strengths: ['AWS統合', '高可用性', 'グローバル'],
        weaknesses: ['高コスト', 'AWS依存', '複雑な料金'],
        pricing: {
          queries: 0.0004, // per query
          hostedZone: 0.50, // per zone per month
          healthChecks: 0.75 // per health check per month
        }
      },
      {
        name: 'Cloudflare DNS',
        type: 'indirect',
        pricingModel: 'freemium',
        marketShare: 0.25,
        strengths: ['高速', '無料プラン', 'CDN統合'],
        weaknesses: ['機能制限', '企業向け不足', 'ロックイン'],
        pricing: {
          free: 0,
          pro: 20,
          business: 200,
          enterprise: 5000
        }
      },
      {
        name: 'Google Cloud DNS',
        type: 'indirect',
        pricingModel: 'usage-based',
        marketShare: 0.13,
        strengths: ['GCP統合', '信頼性', 'API'],
        weaknesses: ['GCP依存', '機能不足', 'UI'],
        pricing: {
          queries: 0.0004,
          zone: 0.20
        }
      }
    ];

    competitors.forEach(competitor => {
      this.addCompetitivePricing(competitor.name, {
        competitorName: competitor.name,
        competitorType: competitor.type,
        pricingModel: competitor.pricingModel,
        marketShare: competitor.marketShare,
        lastUpdated: new Date(),
        pricing: competitor.pricing,
        strengths: competitor.strengths,
        weaknesses: competitor.weaknesses,
        differentiators: this.calculateDifferentiators(competitor.name),
        priceAdvantage: this.calculatePriceAdvantage(competitor.pricing),
        recommendations: this.generateCompetitiveRecommendations(competitor)
      });
    });
  }

  /**
   * バンドルパッケージの作成
   */
  private createBundlePackages(): void {
    // スタートアップパッケージ
    this.addBundlePackage({
      id: 'startup-bundle',
      name: 'Startup Accelerator',
      description: 'スタートアップ向け特別パッケージ',
      includedTiers: ['pro'],
      discount: 0.50, // 50% off
      validityPeriod: 12, // 12 months
      features: [
        'Pro機能フルアクセス',
        'スタートアップメンタリング',
        '技術コンサルティング（月4時間）',
        'コミュニティアクセス'
      ],
      eligibilityCriteria: {
        companyAge: 24, // months
        funding: 1000000, // USD
        employees: 50
      },
      pricing: {
        basePrice: 14.50, // 50% off from $29
        setupFee: 0,
        minimumCommitment: 12
      }
    });

    // エンタープライズバンドル
    this.addBundlePackage({
      id: 'enterprise-suite',
      name: 'Enterprise Complete Suite',
      description: '大企業向け包括的ソリューション',
      includedTiers: ['enterprise'],
      discount: 0.20, // 20% off
      validityPeriod: 36, // 3 years
      features: [
        'Enterprise機能フルアクセス',
        'カスタム開発',
        '専任サクセスマネージャー',
        '24/7プレミアムサポート',
        'オンサイトトレーニング',
        'SLA 99.99%保証'
      ],
      eligibilityCriteria: {
        employees: 1000,
        domains: 1000,
        annualVolume: 100000000 // queries
      },
      pricing: {
        basePrice: 239.20, // 20% off from $299
        setupFee: 5000,
        minimumCommitment: 36
      }
    });

    // 教育機関パッケージ
    this.addBundlePackage({
      id: 'education-package',
      name: 'Education & Research',
      description: '教育機関・研究機関向け特別価格',
      includedTiers: ['pro'],
      discount: 0.70, // 70% off
      validityPeriod: 12,
      features: [
        'Pro機能フルアクセス',
        '学生・研究者サポート',
        '教育向けドキュメント',
        'ケーススタディ作成支援'
      ],
      eligibilityCriteria: {
        organizationType: 'education',
        accreditation: true,
        nonProfit: true
      },
      pricing: {
        basePrice: 8.70, // 70% off from $29
        setupFee: 0,
        minimumCommitment: 12
      }
    });
  }

  /**
   * 価格分析システムの初期化
   */
  private initializePricingAnalytics(): void {
    this.pricingAnalytics = {
      conversionRates: {
        freeToProMonthly: 0.0,
        freeToProAnnual: 0.0,
        proToEnterpriseMonthly: 0.0,
        proToEnterpriseAnnual: 0.0,
        churnRateMonthly: 0.0,
        churnRateAnnual: 0.0
      },
      revenueMetrics: {
        monthlyRecurringRevenue: 0,
        annualRecurringRevenue: 0,
        averageRevenuePerUser: 0,
        customerLifetimeValue: 0,
        customerAcquisitionCost: 0,
        paybackPeriod: 0
      },
      priceSensitivity: {
        elasticityCoefficient: -1.2,
        priceOptimizationScore: 0.0,
        demandForecast: this.generateDemandForecast(),
        competitivePosition: 'neutral'
      },
      regionalPerformance: this.generateRegionalPerformance(),
      lastUpdated: new Date()
    };
  }

  // ===== パブリックAPI =====

  /**
   * 地域別価格の計算
   */
  calculateRegionalPrice(
    basePriceUSD: number,
    targetRegion: string,
    tier: string
  ): {
    localPrice: number;
    currency: string;
    pppAdjusted: number;
    taxIncluded: number;
    savings: number;
  } {
    const regional = this.regionalPricing.get(targetRegion);
    if (!regional) {
      throw new Error(`地域価格設定が見つかりません: ${targetRegion}`);
    }

    const pppAdjusted = basePriceUSD * regional.pppAdjustment.multiplier;
    const taxAmount = pppAdjusted * regional.taxConfiguration.rate;
    const taxIncluded = pppAdjusted + taxAmount;
    const savings = basePriceUSD - pppAdjusted;

    return {
      localPrice: pppAdjusted,
      currency: regional.currency,
      pppAdjusted,
      taxIncluded,
      savings
    };
  }

  /**
   * 動的価格調整の実行
   */
  async executeDynamicPricing(
    region: string,
    tier: string,
    demandMetrics: {
      currentDemand: number;
      historicalDemand: number[];
      seasonality: number;
      competitorActivity: number;
    }
  ): Promise<DynamicPricing> {
    const baseStrategy = this.pricingStrategies.get('freemium');
    const baseTier = baseStrategy?.tiers.find(t => t.id === tier);
    
    if (!baseTier) {
      throw new Error(`価格ティア が見つかりません: ${tier}`);
    }

    // 需要ベースの調整
    const demandMultiplier = this.calculateDemandMultiplier(demandMetrics);
    
    // 競合ベースの調整
    const competitiveMultiplier = this.calculateCompetitiveMultiplier(region, tier);
    
    // 季節性調整
    const seasonalMultiplier = this.calculateSeasonalMultiplier(demandMetrics.seasonality);
    
    // 総合調整係数
    const totalMultiplier = demandMultiplier * competitiveMultiplier * seasonalMultiplier;
    
    const adjustedPrice = baseTier.basePrice * totalMultiplier;
    const regionalPrice = this.calculateRegionalPrice(adjustedPrice, region, tier);

    return {
      originalPrice: baseTier.basePrice,
      adjustedPrice,
      adjustmentFactors: {
        demand: demandMultiplier,
        competitive: competitiveMultiplier,
        seasonal: seasonalMultiplier,
        total: totalMultiplier
      },
      regionalPrice,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      confidence: this.calculatePricingConfidence(demandMetrics),
      recommendations: this.generatePricingRecommendations(totalMultiplier)
    };
  }

  /**
   * 価格戦略の最適化提案
   */
  optimizePricingStrategy(
    currentPerformance: {
      conversionRate: number;
      churnRate: number;
      customerSatisfaction: number;
      competitivePosition: number;
    }
  ): Array<{
    strategy: string;
    description: string;
    expectedImpact: {
      revenue: number;
      conversion: number;
      churn: number;
    };
    implementation: string[];
    priority: 'high' | 'medium' | 'low';
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const optimizations = [];

    // 価格弾力性分析
    if (currentPerformance.conversionRate < 0.1) {
      optimizations.push({
        strategy: 'Lower Price Point',
        description: 'より低価格の中間ティアを導入',
        expectedImpact: {
          revenue: 0.15,
          conversion: 0.25,
          churn: -0.10
        },
        implementation: [
          '$19の中間ティア「Growth」を新設',
          'Proティアの機能を一部制限',
          'A/Bテストで効果測定'
        ],
        priority: 'high',
        riskLevel: 'medium'
      });
    }

    // 年間契約促進
    if (currentPerformance.churnRate > 0.05) {
      optimizations.push({
        strategy: 'Annual Commitment Incentive',
        description: '年間契約での大幅割引提供',
        expectedImpact: {
          revenue: 0.20,
          conversion: 0.10,
          churn: -0.30
        },
        implementation: [
          '年間契約で2ヶ月無料',
          '年間プラン専用機能追加',
          'キャッシュフロー改善'
        ],
        priority: 'medium',
        riskLevel: 'low'
      });
    }

    // 価値ベース価格設定
    if (currentPerformance.customerSatisfaction > 4.5) {
      optimizations.push({
        strategy: 'Value-Based Premium Tier',
        description: '高価値ユーザー向けプレミアムティア',
        expectedImpact: {
          revenue: 0.35,
          conversion: 0.05,
          churn: 0.02
        },
        implementation: [
          '$499 Premium Enterpriseティア',
          '専任サクセスマネージャー',
          'カスタムAPI開発'
        ],
        priority: 'medium',
        riskLevel: 'medium'
      });
    }

    return optimizations.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 };
      return priorityScore[b.priority] - priorityScore[a.priority];
    });
  }

  // ===== ヘルパーメソッド =====

  private addPricingStrategy(strategy: PricingStrategy): void {
    this.pricingStrategies.set(strategy.id, strategy);
  }

  private setRegionalPricing(region: string, pricing: RegionalPricing): void {
    this.regionalPricing.set(region, pricing);
  }

  private addCompetitivePricing(competitor: string, pricing: CompetitivePricing): void {
    this.competitivePricing.set(competitor, pricing);
  }

  private addBundlePackage(bundle: BundlePackage): void {
    this.bundlePackages.set(bundle.id, bundle);
  }

  private getRegionalPaymentMethods(region: string): string[] {
    const paymentMethods: Record<string, string[]> = {
      'US': ['Credit Card', 'PayPal', 'Bank Transfer', 'Apple Pay', 'Google Pay'],
      'EU': ['Credit Card', 'PayPal', 'SEPA', 'Klarna', 'Stripe'],
      'JP': ['Credit Card', 'Bank Transfer', 'PayPay', 'Rakuten Pay'],
      'CN': ['Alipay', 'WeChat Pay', 'Union Pay', 'Bank Transfer'],
      'IN': ['UPI', 'Net Banking', 'Credit Card', 'Paytm', 'Razorpay'],
      'default': ['Credit Card', 'PayPal']
    };
    return paymentMethods[region] || paymentMethods.default;
  }

  private getCompetitivePosition(region: string): 'leader' | 'challenger' | 'follower' | 'niche' {
    // 地域別の競合ポジション
    const positions: Record<string, 'leader' | 'challenger' | 'follower' | 'niche'> = {
      'US': 'challenger',
      'EU': 'follower',
      'JP': 'niche',
      'CN': 'follower',
      'IN': 'challenger'
    };
    return positions[region] || 'niche';
  }

  private getMarketPenetration(region: string): number {
    // 地域別市場浸透率
    const penetration: Record<string, number> = {
      'US': 0.02,
      'EU': 0.01,
      'JP': 0.005,
      'CN': 0.001,
      'IN': 0.003
    };
    return penetration[region] || 0.001;
  }

  private calculateDifferentiators(competitorName: string): string[] {
    const baseDifferentiators = [
      'Web UIによる視覚的管理',
      'リスクスコア分析',
      'CSV一括処理',
      '日本語完全対応',
      '中小企業向け価格設定'
    ];

    const competitorSpecific: Record<string, string[]> = {
      'DNSControl': ['GUI操作', 'ノーコード設定', '学習コスト削減'],
      'octoDNS': ['簡単設定', 'ビジュアル管理', '非技術者対応'],
      'AWS Route53': ['価格優位性', 'シンプル価格', '設定簡単'],
      'Cloudflare DNS': ['機能充実', '中小企業特化', 'サポート充実']
    };

    return [...baseDifferentiators, ...(competitorSpecific[competitorName] || [])];
  }

  private calculatePriceAdvantage(competitorPricing: any): number {
    // 競合価格との比較優位性（正の値ほど優位）
    const ourProPrice = 29; // USD
    
    if (competitorPricing.pro !== undefined) {
      return competitorPricing.pro > 0 ? (competitorPricing.pro - ourProPrice) / competitorPricing.pro : 1;
    }
    
    if (competitorPricing.business !== undefined) {
      return (competitorPricing.business - ourProPrice) / competitorPricing.business;
    }
    
    return 0;
  }

  private generateCompetitiveRecommendations(competitor: any): string[] {
    const recommendations = [];
    
    if (competitor.pricing.free === 0 && competitor.pricingModel === 'open-source') {
      recommendations.push('オープンソースとの差別化でUI/UXの価値を強調');
      recommendations.push('サポート品質での差別化');
    }
    
    if (competitor.marketShare > 0.2) {
      recommendations.push('市場リーダーとの機能比較表作成');
      recommendations.push('ニッチ市場への集中戦略');
    }
    
    return recommendations;
  }

  private calculateDemandMultiplier(demandMetrics: any): number {
    const currentVsHistorical = demandMetrics.currentDemand / (demandMetrics.historicalDemand.reduce((a: number, b: number) => a + b, 0) / demandMetrics.historicalDemand.length);
    
    // 需要が高い場合は価格を上げ、低い場合は下げる
    return Math.max(0.8, Math.min(1.2, currentVsHistorical));
  }

  private calculateCompetitiveMultiplier(region: string, tier: string): number {
    // 競合状況に基づく調整（簡易版）
    return 1.0; // 中立的な調整
  }

  private calculateSeasonalMultiplier(seasonality: number): number {
    // 季節性調整（-1 to 1 の範囲で入力される想定）
    return 1.0 + (seasonality * 0.1); // ±10%の調整
  }

  private calculatePricingConfidence(demandMetrics: any): number {
    // 価格調整の信頼度（0-1）
    const dataQuality = demandMetrics.historicalDemand.length >= 12 ? 1.0 : 0.5;
    const volatility = this.calculateVolatility(demandMetrics.historicalDemand);
    
    return Math.max(0.3, dataQuality * (1 - volatility));
  }

  private calculateVolatility(data: number[]): number {
    if (data.length < 2) return 1;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.min(1, stdDev / mean); // 変動係数を正規化
  }

  private generatePricingRecommendations(totalMultiplier: number): string[] {
    const recommendations = [];
    
    if (totalMultiplier > 1.1) {
      recommendations.push('需要が高いため価格引き上げを検討');
      recommendations.push('プレミアム機能の追加でより高価格帯を狙う');
    } else if (totalMultiplier < 0.9) {
      recommendations.push('需要低下のため価格引き下げまたはプロモーション実施');
      recommendations.push('バンドル商品での価値向上を検討');
    } else {
      recommendations.push('現在の価格水準が適正');
      recommendations.push('機能追加による価値向上に注力');
    }
    
    return recommendations;
  }

  private generateDemandForecast(): Array<{ period: string; expectedDemand: number; confidence: number }> {
    // 簡易的な需要予測
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    return months.map(month => ({
      period: month,
      expectedDemand: Math.floor(Math.random() * 1000) + 500,
      confidence: Math.random() * 0.3 + 0.7
    }));
  }

  private generateRegionalPerformance(): Record<string, { revenue: number; customers: number; growth: number }> {
    const regions = ['US', 'EU', 'JP', 'CN', 'IN'];
    const performance: Record<string, { revenue: number; customers: number; growth: number }> = {};
    
    regions.forEach(region => {
      performance[region] = {
        revenue: Math.floor(Math.random() * 50000) + 10000,
        customers: Math.floor(Math.random() * 500) + 100,
        growth: (Math.random() - 0.5) * 0.4 // -20% to +20%
      };
    });
    
    return performance;
  }

  // ===== ゲッターメソッド =====

  getPricingStrategy(id: string): PricingStrategy | undefined {
    return this.pricingStrategies.get(id);
  }

  getRegionalPricing(region: string): RegionalPricing | undefined {
    return this.regionalPricing.get(region);
  }

  getCompetitivePricing(competitor: string): CompetitivePricing | undefined {
    return this.competitivePricing.get(competitor);
  }

  getBundlePackage(id: string): BundlePackage | undefined {
    return this.bundlePackages.get(id);
  }

  getPricingAnalytics(): PricingAnalytics {
    return this.pricingAnalytics;
  }

  getAllPricingStrategies(): PricingStrategy[] {
    return Array.from(this.pricingStrategies.values());
  }

  getAllRegionalPricing(): RegionalPricing[] {
    return Array.from(this.regionalPricing.values());
  }

  getAllCompetitivePricing(): CompetitivePricing[] {
    return Array.from(this.competitivePricing.values());
  }

  getAllBundlePackages(): BundlePackage[] {
    return Array.from(this.bundlePackages.values());
  }
}

/**
 * グローバルサービスインスタンス
 */
export const pricingStrategyService = new PricingStrategyService();