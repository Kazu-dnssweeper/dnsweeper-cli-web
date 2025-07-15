/**
 * DNSweeper ターゲット市場分析 - 型定義
 * TAM/SAM/SOM分析・市場機会評価・競合分析・成長予測
 */

/**
 * 市場成熟度
 */
export type MarketMaturity = 'emerging' | 'growing' | 'mature' | 'declining';

/**
 * 競争レベル
 */
export type CompetitionLevel = 'low' | 'medium' | 'high' | 'very-high';

/**
 * リスクレベル
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 市場参入アプローチ
 */
export type MarketEntryApproach = 'aggressive' | 'focused differentiation' | 'niche focus' | 'partnership-led';

/**
 * 意思決定サイクル
 */
export type DecisionCycle = 'very-short' | 'short' | 'medium' | 'long' | 'very-long';

/**
 * 市場分析
 */
export interface MarketAnalysis {
  id: string;
  name: string;
  description: string;
  geography: string;
  timeframe: {
    startYear: number;
    endYear: number;
    projectionYears: number;
  };
  tamAnalysis: TAMAnalysis;
  samAnalysis: SAMAnalysis;
  somAnalysis: SOMAnalysis;
  marketTrends: MarketTrend[];
  risks: Array<{
    risk: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string[];
  }>;
  lastUpdated: Date;
  dataSource: string;
  confidence: number; // 0-1
}

/**
 * TAM（Total Addressable Market）分析
 */
export interface TAMAnalysis {
  totalMarketSize: number; // USD
  cagr: number; // Compound Annual Growth Rate
  methodology: string;
  keyAssumptions: string[];
  marketDrivers: Array<{
    driver: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
    growthContribution: number; // 0-1
  }>;
  projectedGrowth: Array<{
    year: number;
    marketSize: number;
  }>;
}

/**
 * SAM（Serviceable Addressable Market）分析
 */
export interface SAMAnalysis {
  serviceableMarket: number; // USD
  targetSegments: string[];
  geographicReach: string[];
  channelCapability: string[];
  marketBarriers: Array<{
    barrier: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  competitionIntensity: CompetitionLevel;
  marketAccess: {
    barriers: string[];
    opportunities: string[];
    timeToMarket: string;
  };
}

/**
 * SOM（Serviceable Obtainable Market）分析
 */
export interface SOMAnalysis {
  obtainableMarket: number; // USD
  targetMarketShare: number; // 0-1
  revenueProjection: Array<{
    year: number;
    revenue: number;
    customers: number;
  }>;
  keyConstraints: string[];
  goToMarketStrategy: {
    primaryChannels: string[];
    marketingApproach: string;
    salesModel: string;
    expansionStrategy: string;
  };
  competitivePosition: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

/**
 * 市場セグメント
 */
export interface MarketSegment {
  id: string;
  name: string;
  description: string;
  size: {
    companies: number;
    marketValue: number;
    growth: number; // annual growth rate
  };
  characteristics: {
    averageRevenue: number; // per company
    decisionCycle: DecisionCycle;
    budgetRange: { min: number; max: number };
    decisionMakers: string[];
    keyRequirements: string[];
  };
  behavior: {
    buyingProcess: string[];
    evaluationCriteria: string[];
    averageSalesCycle: number; // days
    churnRate: number;
    expansionRate: number;
  };
  competition: {
    primaryCompetitors: string[];
    competitiveFactors: string[];
    winRate: number;
    averageDealSize: number;
  };
  opportunity: {
    marketGap: string;
    differentiators: string[];
    addressableRevenue: number;
    timeToCapture: string;
  };
  customerProfiles?: Array<{
    profile: string;
    percentage: number;
    characteristics: string[];
    needs: string[];
  }>;
}

/**
 * 競合環境
 */
export interface CompetitiveLandscape {
  marketStructure: 'monopoly' | 'oligopoly' | 'competitive' | 'fragmented';
  competitionIntensity: CompetitionLevel;
  marketLeaders: Array<{
    company: string;
    product: string;
    marketShare: number;
    revenue: number;
    strengths: string[];
    weaknesses: string[];
    strategy: string;
  }>;
  challengers: Array<{
    company: string;
    product: string;
    marketShare: number;
    revenue: number;
    strengths: string[];
    weaknesses: string[];
    strategy: string;
  }>;
  nicherPlayers: Array<{
    company: string;
    product: string;
    marketShare: number;
    revenue: number;
    strengths: string[];
    weaknesses: string[];
    strategy: string;
  }>;
  emergingTrends: Array<{
    trend: string;
    description: string;
    impact: string;
    timeline: string;
  }>;
  competitiveThreats: Array<{
    threat: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }>;
  opportunities: Array<{
    opportunity: string;
    description: string;
    potential: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
}

/**
 * 市場機会
 */
export interface MarketOpportunity {
  id: string;
  name: string;
  description: string;
  marketSize: number;
  addressableRevenue: number;
  timeline: string;
  probability: number; // 0-1
  riskLevel: RiskLevel;
  requirements: {
    investment: number;
    timeline: string;
    resources: string[];
    capabilities: string[];
  };
  competition: {
    directCompetitors: number;
    indirectCompetitors: number;
    competitiveAdvantage: string[];
  };
  businessCase: {
    revenueProjection: Array<{
      year: number;
      revenue: number;
    }>;
    investmentRequired: number;
    breakEvenPoint: string;
    roi: number;
    paybackPeriod: string;
  };
  keySuccessFactors: string[];
  marketValidation?: {
    customerInterviews: number;
    surveyResponses: number;
    pilotPrograms: number;
    marketTestResults: string[];
  };
}

/**
 * 成長予測
 */
export interface GrowthProjection {
  timeframe: string;
  scenarios: {
    conservative: {
      growth: number;
      marketShare: number;
      revenue: number;
      assumptions: string[];
    };
    realistic: {
      growth: number;
      marketShare: number;
      revenue: number;
      assumptions: string[];
    };
    optimistic: {
      growth: number;
      marketShare: number;
      revenue: number;
      assumptions: string[];
    };
  };
  keyFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    probability: number;
    description: string;
  }>;
  risksToGrowth: Array<{
    risk: string;
    impact: number; // percentage impact on growth
    mitigation: string[];
  }>;
}

/**
 * 市場トレンド
 */
export interface MarketTrend {
  trend: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
  implications: string[];
  opportunityRating?: number; // 0-10
  threatRating?: number; // 0-10
}

/**
 * 顧客行動
 */
export interface CustomerBehavior {
  segment: string;
  buyingJourney: Array<{
    stage: string;
    duration: number; // days
    activities: string[];
    influencers: string[];
    painPoints: string[];
    touchpoints: string[];
  }>;
  decisionFactors: Array<{
    factor: string;
    importance: number; // 0-10
    currentSatisfaction: number; // 0-10
    competitiveGap: number; // -5 to +5
  }>;
  adoption: {
    innovators: number; // percentage
    earlyAdopters: number;
    earlyMajority: number;
    lateMajority: number;
    laggards: number;
  };
  loyalty: {
    retentionRate: number;
    referralRate: number;
    expansionRate: number;
    satisfactionScore: number;
  };
}

/**
 * 地域市場
 */
export interface RegionalMarket {
  region: string;
  countries: string[];
  marketSize: number;
  growth: number;
  maturity: MarketMaturity;
  competitionLevel: CompetitionLevel;
  regulatoryComplexity: 'low' | 'medium' | 'high';
  characteristics: {
    keyPlayers: string[];
    marketDynamics: string;
    customerPreferences: string[];
    buyingBehavior: string;
  };
  opportunities: {
    segments: string[];
    gaps: string[];
    timeline: string;
  };
  challenges: {
    barriers: string[];
    risks: string[];
    mitigation: string[];
  };
  strategy: {
    approach: MarketEntryApproach;
    channels: string[];
    investment: number;
    timeline: string;
  };
}

/**
 * 業界分析
 */
export interface IndustryAnalysis {
  industry: string;
  marketSize: number;
  growth: number;
  dnsSpending: number; // Total DNS spending in industry
  characteristics: {
    keyRequirements: string[];
    regulatoryEnvironment: string;
    technologyAdoption: string;
    budgetCycles: string;
  };
  painPoints: string[];
  opportunities: {
    marketGap: string;
    addressableRevenue: number;
    keyRequirements: string[];
    timeline: string;
  };
  competition: {
    incumbents: string[];
    barriers: string[];
    differentiators: string[];
  };
  trends?: Array<{
    trend: string;
    impact: string;
    timeline: string;
  }>;
}

/**
 * 市場参入戦略
 */
export interface MarketEntry {
  targetMarket: {
    region: string;
    segment: string;
    marketSize: number;
    expectedShare: number;
    timeline: string;
  };
  entryStrategy: {
    approach: MarketEntryApproach;
    channels: string[];
    positioning: string;
    differentiators: string[];
  };
  investmentPlan: {
    totalInvestment: number;
    allocation: {
      productDevelopment: number;
      salesMarketing: number;
      operations: number;
      contingency: number;
    };
    timeline: string;
    expectedROI: number;
  };
  milestones: Array<{
    milestone: string;
    timeline: string;
    deliverables: string[];
  }>;
  riskAssessment: {
    keyRisks: string[];
    mitigation: string[];
  };
  successMetrics: string[];
}

/**
 * 市場調査
 */
export interface MarketResearch {
  researchId: string;
  title: string;
  objective: string;
  methodology: string[];
  sampleSize: number;
  geographicScope: string[];
  timeline: {
    startDate: Date;
    endDate: Date;
    duration: number; // days
  };
  findings: {
    keyInsights: string[];
    marketSize: number;
    growthRate: number;
    customerNeeds: string[];
    competitiveLandscape: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: Array<{
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    timeline: string;
    investment: number;
    expectedImpact: string;
  }>;
  dataQuality: {
    reliability: number; // 0-1
    validity: number; // 0-1
    completeness: number; // 0-1
    limitations: string[];
  };
  followUpActions: Array<{
    action: string;
    owner: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed';
  }>;
}

/**
 * 市場規模算定
 */
export interface MarketSizing {
  sizingId: string;
  market: string;
  geography: string;
  timeframe: string;
  methodology: {
    approach: 'top-down' | 'bottom-up' | 'hybrid';
    dataSources: string[];
    assumptions: string[];
    calculations: string[];
  };
  results: {
    tam: number;
    sam: number;
    som: number;
    confidence: number; // 0-1
    scenarios: {
      conservative: number;
      realistic: number;
      optimistic: number;
    };
  };
  segmentation: Array<{
    segment: string;
    size: number;
    percentage: number;
    growth: number;
  }>;
  validation: {
    benchmarks: Array<{
      source: string;
      value: number;
      variance: number;
    }>;
    sensitivityAnalysis: Array<{
      variable: string;
      impact: number; // percentage change in market size
      range: { min: number; max: number };
    }>;
  };
}

/**
 * 収益予測
 */
export interface RevenueProjection {
  projectionId: string;
  name: string;
  timeframe: string;
  baselineScenario: {
    assumptions: string[];
    revenueStream: Array<{
      year: number;
      month?: number;
      revenue: number;
      customers: number;
      averageRevenue: number;
    }>;
    growth: {
      yearOverYear: number[];
      monthOverMonth: number[];
      compoundAnnual: number;
    };
  };
  scenarios: {
    conservative: {
      description: string;
      adjustments: string[];
      revenue: Array<{ period: string; value: number }>;
    };
    optimistic: {
      description: string;
      adjustments: string[];
      revenue: Array<{ period: string; value: number }>;
    };
    stressTest: {
      description: string;
      adjustments: string[];
      revenue: Array<{ period: string; value: number }>;
    };
  };
  drivers: Array<{
    driver: string;
    impact: number; // correlation coefficient
    description: string;
    controlLevel: 'high' | 'medium' | 'low';
  }>;
  risks: Array<{
    risk: string;
    probability: number; // 0-1
    impact: number; // percentage impact on revenue
    mitigation: string[];
  }>;
  validation: {
    historicalAccuracy: number; // for existing projections
    benchmarkComparison: Array<{
      metric: string;
      ourValue: number;
      benchmarkValue: number;
      variance: number;
    }>;
    sensitivityAnalysis: Array<{
      variable: string;
      baseCase: number;
      optimistic: number;
      pessimistic: number;
      revenueImpact: { optimistic: number; pessimistic: number };
    }>;
  };
}

/**
 * 競合比較分析
 */
export interface CompetitiveComparison {
  comparisonId: string;
  title: string;
  scope: string;
  competitors: Array<{
    name: string;
    category: 'direct' | 'indirect' | 'substitute';
    marketShare: number;
    revenue: number;
    strengths: string[];
    weaknesses: string[];
    positioning: string;
  }>;
  comparisonMatrix: {
    criteria: Array<{
      criterion: string;
      weight: number; // 0-1
      description: string;
    }>;
    scores: Array<{
      competitor: string;
      scores: Array<{
        criterion: string;
        score: number; // 0-10
        notes: string;
      }>;
      totalScore: number;
      ranking: number;
    }>;
  };
  gapAnalysis: Array<{
    gap: string;
    severity: 'low' | 'medium' | 'high';
    competitorAdvantage: string[];
    closingStrategy: string[];
    timeline: string;
    investment: number;
  }>;
  strategicImplications: {
    immediateActions: string[];
    mediumTermStrategy: string[];
    longTermVision: string[];
    resourceRequirements: string[];
  };
}

/**
 * 市場ポジショニング
 */
export interface MarketPositioning {
  positioningId: string;
  market: string;
  targetSegments: string[];
  positioningStatement: string;
  valueProposition: {
    primary: string;
    supporting: string[];
    proofPoints: string[];
    differentiators: string[];
  };
  competitivePositioning: {
    axes: Array<{
      axis: string;
      description: string;
      ourPosition: number; // 0-100
      competitors: Array<{
        name: string;
        position: number;
      }>;
    }>;
    quadrantAnalysis: {
      ourQuadrant: string;
      description: string;
      advantages: string[];
      challenges: string[];
      movementStrategy: string;
    };
  };
  messaging: {
    primaryMessage: string;
    supportingMessages: string[];
    audienceSpecific: Array<{
      audience: string;
      message: string;
      channels: string[];
      tone: string;
    }>;
  };
  validation: {
    marketTesting: Array<{
      test: string;
      results: string;
      insights: string[];
    }>;
    customerFeedback: Array<{
      source: string;
      feedback: string;
      sentiment: 'positive' | 'neutral' | 'negative';
    }>;
    adjustments: string[];
  };
}

/**
 * 市場参入タイミング分析
 */
export interface MarketTimingAnalysis {
  analysisId: string;
  market: string;
  evaluationDate: Date;
  marketReadiness: {
    score: number; // 0-100
    factors: Array<{
      factor: string;
      current: number; // 0-10
      optimal: number; // 0-10
      trend: 'improving' | 'stable' | 'declining';
      timeline: string;
    }>;
  };
  competitiveDynamics: {
    currentIntensity: CompetitionLevel;
    anticipatedChanges: string[];
    windowOfOpportunity: {
      opens: Date;
      closes: Date;
      duration: number; // months
      probability: number; // 0-1
    };
  };
  recommendations: {
    timing: 'immediate' | 'wait-and-see' | 'delayed-entry' | 'alternative-approach';
    rationale: string[];
    optimalEntry: Date;
    preparationTime: number; // months
    successProbability: number; // 0-1
  };
  scenarios: Array<{
    scenario: string;
    entryTiming: Date;
    marketConditions: string[];
    expectedOutcome: string;
    probability: number; // 0-1
  }>;
}