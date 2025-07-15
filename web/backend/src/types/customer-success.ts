/**
 * DNSweeper 顧客成功プログラム - 型定義
 * LTV最大化・チャーン防止・アップセル・顧客体験最適化
 */

/**
 * 顧客ライフサイクルステージ
 */
export type CustomerLifecycleStage = 
  | 'prospect' 
  | 'trial' 
  | 'onboarding' 
  | 'active' 
  | 'growth' 
  | 'mature' 
  | 'at-risk' 
  | 'churned';

/**
 * ヘルスレベル
 */
export type HealthLevel = 'excellent' | 'healthy' | 'warning' | 'at-risk' | 'critical';

/**
 * リスクレベル
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * チャーン理由
 */
export type ChurnReason = 
  | 'price' 
  | 'product-fit' 
  | 'competition' 
  | 'support' 
  | 'technical-issues' 
  | 'business-change' 
  | 'other';

/**
 * 拡張タイプ
 */
export type ExpansionType = 'upsell' | 'cross-sell' | 'geographic' | 'feature' | 'user-count';

/**
 * 顧客成功プログラム
 */
export interface CustomerSuccessProgram {
  id: string;
  name: string;
  description: string;
  targetSegments: string[];
  objectives: string[];
  strategies: SuccessStrategy[];
  metrics: SuccessMetrics;
  resources: ProgramResources;
  timeline: ProgramTimeline;
  stakeholders: string[];
  budget?: number;
  status: 'active' | 'inactive' | 'planning' | 'archived';
  lastReviewed: Date;
}

/**
 * 成功戦略
 */
export interface SuccessStrategy {
  strategy: string;
  description: string;
  tactics: string[];
  channels: string[];
  frequency: string;
  expectedOutcome: string;
  metrics: string[];
  resources: string[];
}

/**
 * 成功メトリクス
 */
export interface SuccessMetrics {
  customerHealthScore: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
  netRevenueRetention: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
  grossRevenueRetention: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
  customerSatisfaction: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
  timeToValue: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
  expansionRate: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
  churnRate: { target: number; current: number; trend: 'up' | 'stable' | 'down' };
}

/**
 * プログラムリソース
 */
export interface ProgramResources {
  teamMembers: string[];
  tools: string[];
  budget: number;
  externalPartners?: string[];
  trainingPrograms?: string[];
}

/**
 * プログラムタイムライン
 */
export interface ProgramTimeline {
  startDate: Date;
  endDate?: Date;
  milestones: Array<{
    milestone: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    dependencies?: string[];
  }>;
  reviews: Array<{
    reviewDate: Date;
    type: 'monthly' | 'quarterly' | 'annual';
    participants: string[];
    outcomes?: string[];
  }>;
}

/**
 * 顧客ヘルス
 */
export interface CustomerHealth {
  customerId: string;
  healthScore: number; // 0-100
  riskLevel: RiskLevel;
  components: {
    usage: number;
    engagement: number;
    business: number;
    satisfaction: number;
  };
  trends: {
    direction: 'up' | 'stable' | 'down';
    change: number; // percentage change
  };
  lastUpdated: Date;
  recommendations: string[];
  alerts: string[];
  predictiveInsights?: {
    churnProbability: number;
    expansionProbability: number;
    recommendedActions: string[];
  };
}

/**
 * 顧客ライフサイクル
 */
export interface CustomerLifecycle {
  customerId: string;
  currentStage: CustomerLifecycleStage;
  stageHistory: Array<{
    stage: CustomerLifecycleStage;
    startDate: Date;
    endDate?: Date;
    duration?: number; // days
    keyEvents: string[];
    outcomes: string[];
  }>;
  milestones: Array<{
    milestone: string;
    targetDate: Date;
    actualDate?: Date;
    status: 'pending' | 'completed' | 'overdue' | 'skipped';
    impact: string;
  }>;
  nextActions: Array<{
    action: string;
    owner: string;
    dueDate: Date;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in-progress' | 'completed';
  }>;
  projections: {
    nextStage: CustomerLifecycleStage;
    estimatedTransitionDate: Date;
    confidence: number; // 0-1
    requiredActions: string[];
  };
}

/**
 * 顧客セグメント
 */
export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    revenue: { min: number; max: number | null };
    employees: { min: number; max: number | null };
    domains: { min: number; max: number | null };
    dnsQueries: { min: number; max: number | null };
    industryVerticals: string[];
    geographicRegions: string[];
    technicalProfile?: string[];
    businessMaturity?: string[];
  };
  characteristics: {
    decisionMakingProcess: 'simple' | 'moderate' | 'complex' | 'agile';
    buyingCycle: 'very-short' | 'short' | 'medium' | 'long';
    priceElasticity: 'very-high' | 'high' | 'medium' | 'low';
    supportExpectations: 'low' | 'low-medium' | 'medium' | 'high';
    customizationNeeds: 'very-low' | 'low' | 'medium' | 'high';
    securityRequirements: 'low' | 'low-medium' | 'medium' | 'high' | 'critical';
    complianceNeeds: 'very-low' | 'low' | 'medium' | 'high';
  };
  valueProposition: string[];
  successMetrics: {
    targetHealthScore: number;
    maxChurnRate: number;
    targetNPS: number;
    expansionRate: number;
    timeToValue: number; // days
    supportSatisfaction: number;
  };
  touchpointStrategy: TouchpointStrategy;
  customerCount?: number;
  revenueContribution?: number;
  growthRate?: number;
}

/**
 * タッチポイント戦略
 */
export interface TouchpointStrategy {
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'as-needed';
  primaryChannels: string[];
  escalationPath: string[];
  communicationPreferences: string[];
  personalization: {
    contentCustomization: boolean;
    timingOptimization: boolean;
    channelPreferences: boolean;
    languageLocalization: boolean;
  };
  automation: {
    triggerBasedOutreach: boolean;
    behavioralSegmentation: boolean;
    predictiveEngagement: boolean;
    feedbackCollection: boolean;
  };
}

/**
 * チャーン防止
 */
export interface ChurnPrevention {
  programId: string;
  name: string;
  description: string;
  targetSegments: string[];
  riskIndicators: Array<{
    indicator: string;
    threshold: string | number;
    weight: number; // 0-1
    dataSource: string;
    frequency: string;
  }>;
  interventions: Array<{
    riskLevel: RiskLevel;
    intervention: string;
    actions: string[];
    timeline: string;
    owner: string;
    successCriteria: string[];
    escalationTriggers: string[];
  }>;
  playbooks: string[];
  metrics: {
    riskDetectionAccuracy: number;
    interventionSuccessRate: number;
    churnReduction: number;
    falsePositiveRate: number;
  };
  automationRules: Array<{
    trigger: string;
    condition: string;
    action: string;
    frequency: string;
    approval?: string;
  }>;
}

/**
 * アップセル戦略
 */
export interface UpsellStrategy {
  strategyId: string;
  name: string;
  description: string;
  targetSegments: string[];
  triggers: Array<{
    trigger: string;
    condition: string;
    data: string;
    threshold: number | string;
  }>;
  opportunities: Array<{
    type: ExpansionType;
    description: string;
    targetValue: number;
    probability: number;
    timeline: string;
    requirements: string[];
  }>;
  playbooks: Array<{
    scenario: string;
    steps: string[];
    stakeholders: string[];
    timeline: string;
    successCriteria: string[];
    fallbackOptions: string[];
  }>;
  metrics: {
    identificationRate: number;
    conversionRate: number;
    averageExpansionValue: number;
    timeToExpansion: number;
    customerSatisfactionImpact: number;
  };
}

/**
 * カスタマージャーニー
 */
export interface CustomerJourney {
  segmentId: string;
  journeyName: string;
  stages: Array<{
    stage: string;
    description: string;
    duration: number; // days
    objectives: string[];
    touchpoints: Array<{
      touchpoint: string;
      channel: string;
      content: string;
      timing: string;
      owner: string;
      metrics: string[];
    }>;
    exitCriteria: string[];
    potentialIssues: Array<{
      issue: string;
      probability: number;
      impact: 'low' | 'medium' | 'high';
      mitigation: string[];
    }>;
  }>;
  successMetrics: {
    completionRate: number;
    timeToComplete: number;
    satisfactionScore: number;
    conversionRate: number;
  };
  optimizationOpportunities: Array<{
    opportunity: string;
    impact: number;
    effort: number;
    timeline: string;
  }>;
}

/**
 * オンボーディングプログラム
 */
export interface OnboardingProgram {
  id: string;
  name: string;
  targetSegment: string;
  duration: number; // days
  phases: Array<{
    name: string;
    duration: number;
    objectives: string[];
    activities: string[];
    deliverables: string[];
    successCriteria: string[];
  }>;
  resources: {
    teamMembers: string[];
    tools: string[];
    documentation: string[];
  };
  checkpoints: Array<{
    day: number;
    milestone: string;
    healthCheck: boolean;
    stakeholders?: string[];
    deliverables?: string[];
  }>;
  escalationTriggers: string[];
  successMetrics: {
    completionRate: number;
    timeToValue: number;
    satisfactionScore: number;
    adoptionRate: number;
  };
  customization: {
    industrySpecific: boolean;
    sizeSpecific: boolean;
    technicalLevel: boolean;
    geographicVariation: boolean;
  };
}

/**
 * リテンション戦略
 */
export interface RetentionStrategy {
  id: string;
  name: string;
  targetSegment: string;
  objectives: string[];
  tactics: Array<{
    tactic: string;
    description: string;
    frequency: string;
    stakeholders: string[];
    activities: string[];
    expectedOutcome: string;
  }>;
  churnSignals: Array<{
    signal: string;
    threshold: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: string;
  }>;
  interventions: Array<{
    trigger: string;
    intervention: string;
    actions: string[];
    timeline: string;
    successMetrics: string[];
  }>;
  kpis: Array<{
    metric: string;
    target: number;
    threshold: number;
    frequency: string;
  }>;
  automation: {
    alerting: boolean;
    taskCreation: boolean;
    communication: boolean;
    escalation: boolean;
  };
}

/**
 * 拡張プログラム
 */
export interface ExpansionProgram {
  id: string;
  name: string;
  description: string;
  targetSegments: string[];
  objectives: string[];
  strategies: Array<{
    strategy: string;
    description: string;
    targetMetrics: string[];
    triggers: string[];
    approach: string[];
    expectedOutcome: string;
  }>;
  playbooks: Array<{
    scenario: string;
    steps: string[];
    stakeholders: string[];
    timeline: string;
    successCriteria: string[];
  }>;
  metrics: {
    expansionRate: { target: number; current: number };
    upsellConversionRate: { target: number; current: number };
    averageExpansionValue: { target: number; current: number };
    timeToExpansion: { target: number; current: number };
  };
  enablement: {
    training: string[];
    tools: string[];
    content: string[];
    processDocumentation: string[];
  };
}

/**
 * 顧客フィードバック
 */
export interface CustomerFeedback {
  feedbackId: string;
  customerId: string;
  type: 'nps' | 'csat' | 'ces' | 'product-feedback' | 'support-feedback' | 'general';
  channel: 'survey' | 'interview' | 'support-ticket' | 'community' | 'social-media';
  rating?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  content: string;
  categories: string[];
  actionItems: Array<{
    item: string;
    priority: 'high' | 'medium' | 'low';
    owner: string;
    status: 'open' | 'in-progress' | 'completed' | 'deferred';
    dueDate?: Date;
  }>;
  submittedAt: Date;
  respondedAt?: Date;
  followUpRequired: boolean;
  impact: {
    productImprovement: boolean;
    processImprovement: boolean;
    relationshipImpact: 'positive' | 'neutral' | 'negative';
    revenueImpact?: number;
  };
}

/**
 * サクセスプレイブック
 */
export interface SuccessPlaybook {
  id: string;
  name: string;
  description: string;
  scope: string;
  applicableSegments: string[];
  triggers: string[];
  workflow: Array<{
    step: number;
    action: string;
    description: string;
    owner: string;
    timeline: string;
    activities: string[];
    outputs: string[];
    dependencies?: string[];
  }>;
  escalationCriteria: string[];
  successMetrics: string[];
  resources: string[];
  templates: string[];
  examples: Array<{
    scenario: string;
    outcome: string;
    keyLearnings: string[];
  }>;
  lastUpdated: Date;
  version: string;
}

/**
 * ヘルススコアリング
 */
export interface HealthScoring {
  modelId: string;
  name: string;
  description: string;
  applicableSegments: string[];
  components: Array<{
    component: string;
    weight: number; // 0-1
    metrics: Array<{
      metric: string;
      dataSource: string;
      calculation: string;
      weight: number;
      threshold: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
      };
    }>;
  }>;
  calculationFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
  alertThresholds: {
    critical: number;
    warning: number;
    improvement: number;
  };
  historicalTracking: {
    retentionPeriod: number; // days
    trendAnalysis: boolean;
    seasonalAdjustment: boolean;
  };
  validation: {
    accuracyMetrics: string[];
    correlationAnalysis: string[];
    predictivePower: number;
  };
}

/**
 * 顧客分析
 */
export interface CustomerAnalytics {
  overallHealth: {
    averageHealthScore: number;
    healthDistribution: {
      healthy: number;    // percentage
      warning: number;
      atrisk: number;
      critical: number;
    };
    trendAnalysis: {
      improving: number;  // percentage
      stable: number;
      declining: number;
    };
  };
  churnAnalysis: {
    overallChurnRate: number;
    churnBySegment: Record<string, number>;
    churnPrediction: {
      next30Days: number;
      next60Days: number;
      next90Days: number;
    };
    churnReasons: Array<{
      reason: ChurnReason;
      percentage: number;
      impact: number;
    }>;
    preventionSuccess: number; // percentage of at-risk customers saved
  };
  expansionAnalysis: {
    expansionRate: number;
    expansionBySegment: Record<string, number>;
    averageExpansionValue: number;
    expansionOpportunities: Array<{
      type: ExpansionType;
      count: number;
      totalValue: number;
      conversionRate: number;
    }>;
    conversionRates: {
      identified: number; // opportunities identified to qualified
      qualified: number;  // qualified to proposal
      closed: number;     // proposal to closed
    };
  };
  segmentPerformance: Record<string, {
    healthScore: number;
    churnRate: number;
    expansionRate: number;
    satisfactionScore: number;
    revenuePerCustomer: number;
    growthRate: number;
  }>;
  journeyAnalysis: {
    onboardingSuccess: Record<string, number>; // completion rates by segment
    timeToValue: Record<string, number>;       // average days by segment
    adoptionRates: Record<string, number>;     // feature adoption by segment
    satisfactionTrends: Record<string, Array<{
      period: string;
      score: number;
    }>>;
  };
  lastUpdated: Date;
  dataQuality: {
    completeness: number;
    accuracy: number;
    freshness: number;
    consistency: number;
  };
}

/**
 * カスタマーサクセスKPI
 */
export interface CustomerSuccessKPI {
  kpiId: string;
  name: string;
  description: string;
  category: 'health' | 'retention' | 'expansion' | 'satisfaction' | 'efficiency';
  formula: string;
  targetValue: number;
  currentValue: number;
  trend: 'up' | 'stable' | 'down';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dataSource: string[];
  stakeholders: string[];
  alertThresholds: {
    critical: number;
    warning: number;
    target: number;
    excellent: number;
  };
  historicalData: Array<{
    period: string;
    value: number;
    target: number;
  }>;
  benchmarks: {
    industry: number;
    bestInClass: number;
    internal: number;
  };
}

/**
 * カスタマーサクセス予測
 */
export interface CustomerSuccessPrediction {
  customerId: string;
  predictionDate: Date;
  timeframe: number; // days
  predictions: {
    churnProbability: {
      probability: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        trend: 'increasing' | 'stable' | 'decreasing';
      }>;
    };
    expansionProbability: {
      probability: number;
      confidence: number;
      estimatedValue: number;
      timeframe: number;
      type: ExpansionType[];
    };
    healthTrajectory: {
      predictedScore: number;
      confidence: number;
      keyInfluencers: string[];
    };
    satisfactionTrend: {
      predictedNPS: number;
      predictedCSAT: number;
      confidence: number;
    };
  };
  recommendedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: number;
    timeline: string;
    resources: string[];
  }>;
  modelVersion: string;
  lastUpdated: Date;
}

/**
 * サクセスプラン
 */
export interface SuccessPlan {
  customerId: string;
  planId: string;
  name: string;
  segment: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  objectives: Array<{
    objective: string;
    target: string;
    dueDate: Date;
    status: 'not-started' | 'in-progress' | 'completed' | 'at-risk';
    progress: number; // 0-100
    keyResults: string[];
  }>;
  milestones: Array<{
    milestone: string;
    dueDate: Date;
    status: 'pending' | 'completed' | 'overdue';
    criteria: string[];
    deliverables: string[];
  }>;
  risks: Array<{
    risk: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string[];
    status: 'monitoring' | 'mitigating' | 'resolved';
  }>;
  stakeholders: Array<{
    name: string;
    role: string;
    involvement: 'primary' | 'secondary' | 'informed';
    contactInfo: string;
  }>;
  resources: {
    teamMembers: string[];
    budget: number;
    tools: string[];
    timeline: string;
  };
  reviews: Array<{
    date: Date;
    type: 'checkpoint' | 'milestone' | 'quarterly';
    attendees: string[];
    outcomes: string[];
    nextSteps: string[];
  }>;
  createdAt: Date;
  lastUpdated: Date;
  createdBy: string;
}