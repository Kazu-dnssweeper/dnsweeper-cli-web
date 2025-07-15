/**
 * DNSweeper 価格戦略最適化 - 型定義
 * 地域別価格設定・購買力平価調整・競合分析
 */

/**
 * 価格設定モデル
 */
export type PricingModel = 'freemium' | 'usage-based' | 'subscription' | 'one-time' | 'hybrid';

/**
 * 需要感度レベル
 */
export type DemandSensitivity = 'low' | 'medium' | 'high';

/**
 * 競合分析対象タイプ
 */
export type CompetitorType = 'direct' | 'indirect' | 'substitute' | 'potential';

/**
 * 競合ポジション
 */
export type CompetitivePosition = 'leader' | 'challenger' | 'follower' | 'niche';

/**
 * 価格戦略
 */
export interface PricingStrategy {
  id: string;
  name: string;
  description: string;
  model: PricingModel;
  tiers: PricingTier[];
  elasticity: PricingElasticity;
  targetMarket?: string[];
  effectiveDate?: Date;
  expiryDate?: Date;
}

/**
 * 価格ティア
 */
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  features: string[];
  limits: {
    dnsQueries?: number; // -1 for unlimited
    csvFiles?: number;
    domains?: number;
    storage?: number; // MB
    apiCalls?: number;
    users?: number;
  };
  usagePricing?: {
    dnsQuery?: number;
    csvFile?: number;
    report?: number;
    apiCall?: number;
    storage?: number;
  };
  setupFee?: number;
  minimumCommitment?: number; // months
}

/**
 * 購買力平価調整
 */
export interface PurchasePowerParityAdjustment {
  multiplier: number;
  baseCurrency: string;
  lastUpdated: Date;
  source: string;
  confidence?: number;
}

/**
 * 地域別価格設定
 */
export interface RegionalPricing {
  region: string;
  name: string;
  currency: string;
  pppAdjustment: PurchasePowerParityAdjustment;
  taxConfiguration: {
    rate: number;
    type: 'VAT' | 'Sales Tax' | 'GST' | 'None';
    included: boolean;
  };
  paymentMethods: string[];
  localizedFeatures: string[];
  competitivePosition: CompetitivePosition;
  marketPenetration: number;
  regulatoryRequirements?: string[];
  localPartners?: string[];
}

/**
 * 価格弾力性
 */
export interface PricingElasticity {
  freeToProConversion?: number;
  proToEnterpriseConversion?: number;
  priceElasticity: number; // % change in demand / % change in price
  demandSensitivity: DemandSensitivity;
  crossElasticity?: { [competitor: string]: number };
}

/**
 * 競合価格分析
 */
export interface CompetitivePricing {
  competitorName: string;
  competitorType: CompetitorType;
  pricingModel: string;
  marketShare: number;
  lastUpdated: Date;
  pricing: Record<string, number | string>;
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
  priceAdvantage: number; // positive = we're cheaper
  recommendations: string[];
  dataSource?: string;
  reliability?: number;
}

/**
 * バンドルパッケージ
 */
export interface BundlePackage {
  id: string;
  name: string;
  description: string;
  includedTiers: string[];
  discount: number; // 0.1 = 10% off
  validityPeriod: number; // months
  features: string[];
  eligibilityCriteria: {
    companyAge?: number; // months
    funding?: number; // USD
    employees?: number;
    domains?: number;
    annualVolume?: number;
    organizationType?: 'startup' | 'enterprise' | 'education' | 'non-profit';
    accreditation?: boolean;
    nonProfit?: boolean;
  };
  pricing: {
    basePrice: number;
    setupFee: number;
    minimumCommitment: number; // months
  };
  terms?: string[];
  autoRenewal?: boolean;
}

/**
 * プロモーション戦略
 */
export interface PromotionStrategy {
  id: string;
  name: string;
  type: 'discount' | 'free-trial' | 'freemium-upgrade' | 'bundle' | 'loyalty';
  description: string;
  discountPercentage?: number;
  discountAmount?: number;
  freeTrialDays?: number;
  validFrom: Date;
  validUntil: Date;
  targetSegments: string[];
  eligibilityCriteria: Record<string, unknown>;
  usageLimit?: {
    totalUses?: number;
    usesPerCustomer?: number;
    usesPerDay?: number;
  };
  performance?: {
    redemptions: number;
    conversions: number;
    revenue: number;
    cost: number;
    roi: number;
  };
}

/**
 * 動的価格調整
 */
export interface DynamicPricing {
  originalPrice: number;
  adjustedPrice: number;
  adjustmentFactors: {
    demand: number;
    competitive: number;
    seasonal: number;
    inventory?: number;
    geographic?: number;
    total: number;
  };
  regionalPrice: {
    localPrice: number;
    currency: string;
    pppAdjusted: number;
    taxIncluded: number;
    savings: number;
  };
  validFrom: Date;
  validUntil: Date;
  confidence: number; // 0-1
  recommendations: string[];
}

/**
 * 価格分析データ
 */
export interface PricingAnalytics {
  conversionRates: {
    freeToProMonthly: number;
    freeToProAnnual: number;
    proToEnterpriseMonthly: number;
    proToEnterpriseAnnual: number;
    churnRateMonthly: number;
    churnRateAnnual: number;
  };
  revenueMetrics: {
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
    averageRevenuePerUser: number;
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    paybackPeriod: number; // months
  };
  priceSensitivity: {
    elasticityCoefficient: number;
    priceOptimizationScore: number; // 0-100
    demandForecast: Array<{
      period: string;
      expectedDemand: number;
      confidence: number;
    }>;
    competitivePosition: CompetitivePosition;
  };
  regionalPerformance: Record<string, {
    revenue: number;
    customers: number;
    growth: number; // % growth rate
  }>;
  lastUpdated: Date;
}

/**
 * 価格最適化推奨事項
 */
export interface PricingOptimization {
  strategy: string;
  description: string;
  expectedImpact: {
    revenue: number; // % change
    conversion: number; // % change
    churn: number; // % change
    customerSatisfaction?: number; // % change
  };
  implementation: string[];
  priority: 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high';
  timeline: string;
  resources: string[];
  kpis: string[];
  successCriteria: string[];
}

/**
 * 市場調査データ
 */
export interface MarketResearch {
  region: string;
  marketSize: {
    tam: number; // Total Addressable Market
    sam: number; // Serviceable Addressable Market
    som: number; // Serviceable Obtainable Market
  };
  competitorAnalysis: {
    marketLeader: string;
    marketShare: Record<string, number>;
    pricingBenchmark: Record<string, number>;
    featureComparison: Record<string, string[]>;
  };
  customerSegments: {
    segment: string;
    size: number;
    characteristics: string[];
    priceWillingness: number;
    acquisitionCost: number;
  }[];
  trendAnalysis: {
    marketGrowth: number; // % annual growth
    pricingTrends: string[];
    technologyTrends: string[];
    regulatoryChanges: string[];
  };
  recommendations: string[];
  dataSource: string;
  lastUpdated: Date;
  reliability: number; // 0-1
}

/**
 * 価格実験データ
 */
export interface PricingExperiment {
  id: string;
  name: string;
  description: string;
  type: 'A/B' | 'multivariate' | 'sequential';
  status: 'planning' | 'running' | 'completed' | 'paused' | 'cancelled';
  variants: {
    id: string;
    name: string;
    price: number;
    features: string[];
    allocation: number; // % of traffic
  }[];
  targetSegment: string[];
  startDate: Date;
  endDate: Date;
  sampleSize: number;
  confidenceLevel: number;
  primaryMetric: string;
  secondaryMetrics: string[];
  results?: {
    variant: string;
    conversions: number;
    revenue: number;
    significance: number;
    confidenceInterval: [number, number];
  }[];
  insights?: string[];
  recommendations?: string[];
}

/**
 * 顧客価値セグメント
 */
export interface CustomerValueSegment {
  segmentId: string;
  name: string;
  description: string;
  characteristics: {
    size: string; // 'startup' | 'sme' | 'enterprise'
    industry: string[];
    geography: string[];
    techSavviness: 'low' | 'medium' | 'high';
    priceConscious: 'low' | 'medium' | 'high';
  };
  valueProposition: string[];
  painPoints: string[];
  buyingBehavior: {
    decisionTimeframe: number; // days
    decisionMakers: string[];
    evaluationCriteria: string[];
    budgetRange: [number, number];
  };
  pricingRecommendations: {
    strategy: string;
    suggestedPrice: number;
    packaging: string[];
    promotions: string[];
  };
  lifetime: {
    acquisitionCost: number;
    retentionRate: number;
    expansionRate: number;
    churnRate: number;
    lifetimeValue: number;
  };
}

/**
 * 収益予測モデル
 */
export interface RevenueProjection {
  timeframe: string; // 'Q1 2025', '2025', etc.
  scenarios: {
    conservative: {
      customers: number;
      averageRevenue: number;
      totalRevenue: number;
      growth: number;
    };
    realistic: {
      customers: number;
      averageRevenue: number;
      totalRevenue: number;
      growth: number;
    };
    optimistic: {
      customers: number;
      averageRevenue: number;
      totalRevenue: number;
      growth: number;
    };
  };
  assumptions: string[];
  riskFactors: string[];
  keyDrivers: string[];
  sensitivityAnalysis: {
    factor: string;
    impact: number; // % change in revenue per % change in factor
  }[];
}