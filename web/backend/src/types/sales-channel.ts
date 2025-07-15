/**
 * DNSweeper 販売チャネル拡大 - 型定義
 * オムニチャネル戦略・パートナーエコシステム・営業自動化
 */

/**
 * 販売チャネルタイプ
 */
export type ChannelType = 'direct' | 'partner' | 'reseller' | 'oem' | 'digital' | 'marketplace';

/**
 * パートナーティア
 */
export type PartnerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'strategic';

/**
 * パートナープログラムタイプ
 */
export type PartnerProgramType = 'certification' | 'solution-provider' | 'technology' | 'oem' | 'marketplace';

/**
 * パートナータイプ
 */
export type PartnerType = 'reseller' | 'system-integrator' | 'consultant' | 'oem' | 'technology' | 'referral';

/**
 * チャネル優先度
 */
export type ChannelPriority = 'high' | 'medium' | 'low';

/**
 * リード品質
 */
export type LeadQuality = 'very-high' | 'high' | 'medium' | 'low';

/**
 * リード量
 */
export type LeadVolume = 'very-high' | 'high' | 'medium' | 'low';

/**
 * 能力レベル
 */
export type CapabilityLevel = 'expert' | 'advanced' | 'intermediate' | 'basic';

/**
 * チャネル競合重要度
 */
export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * 販売チャネル
 */
export interface SalesChannel {
  id: string;
  name: string;
  type: ChannelType;
  description: string;
  status: 'active' | 'inactive' | 'developing' | 'sunset';
  priority: ChannelPriority;
  targetSegments: string[];
  geographicCoverage: string[];
  revenueSplit: RevenueSplit;
  leadSources: LeadSource[];
  salesProcess: SalesProcessSummary;
  performance: ChannelPerformance;
  budget?: number;
  manager?: string;
  lastReviewed?: Date;
}

/**
 * 収益分配
 */
export interface RevenueSplit {
  company: number; // 0-1 (percentage)
  partner: number;
  channel: number;
  reseller?: number;
  affiliate?: number;
}

/**
 * リード源
 */
export interface LeadSource {
  source: string;
  quality: LeadQuality;
  volume: LeadVolume;
  cost: number; // cost per lead
  conversionRate: number;
  attribution?: string[];
  seasonality?: number;
}

/**
 * 営業プロセス要約
 */
export interface SalesProcessSummary {
  stages: Array<{
    name: string;
    duration: number; // days
    probability: number;
  }>;
  averageDealSize: number;
  averageSalesCycle: number; // days
  closingRate: number;
  bottlenecks?: string[];
}

/**
 * チャネルパフォーマンス
 */
export interface ChannelPerformance {
  revenue: number;
  deals: number;
  averageDealSize: number;
  conversionRate: number;
  customerAcquisitionCost: number;
  returnOnInvestment: number;
  customerSatisfaction?: number;
  churnRate?: number;
  timeToFirstValue?: number; // days
}

/**
 * チャネルパートナー
 */
export interface ChannelPartner {
  id: string;
  name: string;
  type: PartnerType;
  tier: PartnerTier;
  status: 'active' | 'inactive' | 'onboarding' | 'churned';
  program: string; // partner program id
  contact: {
    primaryContact: string;
    email: string;
    phone: string;
    address: string;
    timezone?: string;
  };
  businessInfo: {
    founded: number;
    employees: number;
    annualRevenue: number;
    primaryMarkets: string[];
    verticals: string[];
    certifications: string[];
    publicTrading?: boolean;
    headquarters?: string;
  };
  performance: PartnerPerformance;
  capabilities: PartnerCapabilities;
  agreement: PartnerAgreement;
  notes?: string[];
  tags?: string[];
}

/**
 * パートナーパフォーマンス
 */
export interface PartnerPerformance {
  partnerSince: Date;
  totalRevenue: number;
  dealsClosed: number;
  averageDealSize: number;
  pipelineValue: number;
  customerSatisfaction: number;
  renewalRate: number;
  certificationStatus?: string;
  lastTraining?: Date;
  lastReview?: Date;
}

/**
 * パートナー能力
 */
export interface PartnerCapabilities {
  salesCapability: CapabilityLevel;
  technicalCapability: CapabilityLevel;
  marketingCapability: CapabilityLevel;
  supportCapability: CapabilityLevel;
  industryExpertise: string[];
  geographicCoverage: string[];
  languages?: string[];
  specializations?: string[];
}

/**
 * パートナー契約
 */
export interface PartnerAgreement {
  contractStart: Date;
  contractEnd: Date;
  territory: string[];
  exclusivity: boolean;
  minimumCommitment: number;
  commissionStructure: CommissionStructure;
  performanceRequirements?: {
    minimumRevenue?: number;
    minimumDeals?: number;
    customerSatisfaction?: number;
    certificationMaintenance?: boolean;
  };
  terminationClause?: string;
}

/**
 * コミッション構造
 */
export interface CommissionStructure {
  baseCommission: number; // percentage
  bonusCommission: number; // percentage
  incentiveThresholds: Array<{
    target: number;
    bonus: number;
  }>;
  paymentTerms?: string;
  clawbackPeriod?: number; // days
}

/**
 * パートナープログラム
 */
export interface PartnerProgram {
  id: string;
  name: string;
  type: PartnerProgramType;
  description: string;
  requirements: ProgramRequirements;
  benefits: ProgramBenefits;
  training: TrainingProgram;
  support: SupportProgram;
  incentives: ProgramIncentive[];
  applicationProcess?: string[];
  programManager?: string;
  launchDate?: Date;
}

/**
 * プログラム要件
 */
export interface ProgramRequirements {
  minimumRevenue?: number;
  technicalCertification?: boolean;
  salesTraining?: boolean;
  minimumDeals?: number;
  customerSatisfactionScore?: number;
  implementationExperience?: number;
  verticalExpertise?: string[];
  geographicPresence?: string[];
}

/**
 * プログラム特典
 */
export interface ProgramBenefits {
  commissionRate: number;
  marketingSupport: boolean;
  technicalSupport: boolean;
  earlyAccess: boolean;
  cobranding: boolean;
  leadSharing: boolean;
  exclusiveTerritory?: boolean;
  whiteLabeling?: boolean;
  apiAccess?: boolean;
  customization?: boolean;
  prioritySupport?: boolean;
}

/**
 * トレーニングプログラム
 */
export interface TrainingProgram {
  salesTrainingHours: number;
  technicalTrainingHours: number;
  certificationExam: boolean;
  ongoingEducation: boolean;
  trainingMaterials: string[];
  deliveryMethods?: string[]; // 'online', 'classroom', 'virtual', 'self-paced'
  prerequisites?: string[];
  validityPeriod?: number; // months
}

/**
 * サポートプログラム
 */
export interface SupportProgram {
  dedicatedManager: boolean;
  technicalSupport: string; // '24/7', 'business-hours', 'email-only'
  salesSupport: string;
  marketingSupport: boolean;
  enablementResources: boolean;
  customDevelopment?: boolean;
  priorityBugFixes?: boolean;
  escalationProcess?: string[];
}

/**
 * プログラムインセンティブ
 */
export interface ProgramIncentive {
  target: string;
  threshold: number;
  reward: string;
  type: 'commission-bonus' | 'cash-bonus' | 'service-upgrade' | 'recognition' | 'pricing-discount' | 'product-enhancement';
  validityPeriod?: number; // months
  conditions?: string[];
}

/**
 * 営業プロセス
 */
export interface SalesProcess {
  id: string;
  name: string;
  description: string;
  targetSegment: string;
  stages: SalesStage[];
  automation: SalesAutomation;
  metrics: SalesMetrics;
  playbooks?: string[];
  templates?: string[];
  lastUpdated?: Date;
}

/**
 * 営業ステージ
 */
export interface SalesStage {
  id: string;
  name: string;
  description: string;
  duration: number; // days
  activities: string[];
  exitCriteria: string[];
  probability: number;
  requiredFields?: string[];
  automatedActions?: string[];
}

/**
 * 営業自動化
 */
export interface SalesAutomation {
  leadScoring: boolean;
  emailSequences: boolean;
  taskReminders: boolean;
  reportGeneration: boolean;
  pipelineForecast: boolean;
  opportunityRouting?: boolean;
  proposalGeneration?: boolean;
  contractManagement?: boolean;
}

/**
 * 営業メトリクス
 */
export interface SalesMetrics {
  averageDealSize: number;
  averageSalesCycle: number; // days
  conversionRate: number;
  customerAcquisitionCost: number;
  salesVelocity: number; // (deals * deal size * win rate) / sales cycle
  winRate?: number;
  lossRate?: number;
  noDecisionRate?: number;
}

/**
 * CRM統合
 */
export interface CRMIntegration {
  platform: string; // 'salesforce', 'hubspot', 'pipedrive', 'custom'
  integrationStatus: 'active' | 'pending' | 'failed' | 'disabled';
  syncFields: string[];
  syncFrequency: string; // 'real-time', 'hourly', 'daily'
  lastSync: Date;
  dataMapping: Record<string, string>;
  errors?: string[];
}

/**
 * カスタマージャーニー
 */
export interface CustomerJourney {
  segment: string;
  touchpoints: Array<{
    stage: string;
    channel: string;
    activity: string;
    content: string;
    duration: number;
    conversionRate: number;
  }>;
  totalJourneyTime: number; // days
  dropoffPoints: Array<{
    stage: string;
    dropoffRate: number;
    reasons: string[];
  }>;
  optimizationOpportunities: string[];
}

/**
 * チャネル競合
 */
export interface ChannelConflict {
  id: string;
  type: 'territory-overlap' | 'customer-overlap' | 'pricing-conflict' | 'timing-conflict';
  severity: ConflictSeverity;
  description: string;
  affectedChannels: string[];
  conflictAreas: string[];
  impactAssessment: {
    revenueAtRisk: number;
    customerConfusion: 'high' | 'medium' | 'low';
    partnerSatisfaction: 'high' | 'medium' | 'low';
  };
  resolutionOptions: string[];
  status: 'active' | 'resolved' | 'monitoring';
  priority: 'high' | 'medium' | 'low';
  detectedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
}

/**
 * チャネル分析
 */
export interface ChannelAnalytics {
  overallPerformance: {
    totalRevenue: number;
    totalDeals: number;
    averageDealSize: number;
    overallConversionRate: number;
    totalCustomerAcquisitionCost: number;
    returnOnInvestment: number;
  };
  channelComparison: Array<{
    channel: string;
    revenue: number;
    deals: number;
    conversionRate: number;
    customerAcquisitionCost: number;
    efficiency: number;
  }>;
  partnerPerformance: Array<{
    partner: string;
    tier: PartnerTier;
    revenue: number;
    deals: number;
    satisfaction: number;
    growth: number;
  }>;
  salesFunnel: Array<{
    stage: string;
    leads: number;
    conversion: number;
    dropoffRate: number;
  }>;
  forecastAccuracy: {
    accuracy: number; // 0-1
    bias: number; // -1 to 1
    forecastVsActual: Array<{
      period: string;
      forecast: number;
      actual: number;
    }>;
  };
  channelConflicts: ChannelConflict[];
  optimizationRecommendations: Array<{
    type: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    timeline: string;
    expectedROI: number;
  }>;
  lastUpdated: Date;
}

/**
 * 地域市場データ
 */
export interface RegionalMarketData {
  region: string;
  marketSize: number;
  competitiveIntensity: 'high' | 'medium' | 'low';
  regulatoryComplexity: 'high' | 'medium' | 'low';
  culturalFactors: string[];
  preferredChannels: ChannelType[];
  averageSalesCycle: number;
  priceElasticity: number;
  localPartners: Array<{
    name: string;
    type: PartnerType;
    marketShare: number;
    capabilities: string[];
  }>;
}

/**
 * セールスイネーブルメント
 */
export interface SalesEnablement {
  content: {
    battleCards: string[];
    caseStudies: string[];
    demoScripts: string[];
    objectionHandling: string[];
    proposalTemplates: string[];
    roiCalculators: string[];
  };
  training: {
    onboardingProgram: string[];
    skillDevelopment: string[];
    productTraining: string[];
    competitiveIntelligence: string[];
    certificationPrograms: string[];
  };
  tools: {
    crmPlatform: string;
    salesIntelligence: string[];
    proposalGeneration: string[];
    documentManagement: string[];
    communicationTools: string[];
  };
  coaching: {
    callReviews: boolean;
    pipelineReviews: boolean;
    skillAssessments: boolean;
    performanceMetrics: string[];
    improvementPlans: string[];
  };
}

/**
 * チャネルインテリジェンス
 */
export interface ChannelIntelligence {
  marketTrends: Array<{
    trend: string;
    impact: 'high' | 'medium' | 'low';
    timeframe: string;
    channels: string[];
    recommendations: string[];
  }>;
  competitorAnalysis: Array<{
    competitor: string;
    channels: ChannelType[];
    strengths: string[];
    weaknesses: string[];
    marketShare: number;
    strategy: string;
  }>;
  customerBehavior: Array<{
    segment: string;
    preferredChannels: string[];
    buyingProcess: string[];
    decisionFactors: string[];
    touchpointPreferences: string[];
  }>;
  emergingOpportunities: Array<{
    opportunity: string;
    description: string;
    channels: string[];
    investmentRequired: number;
    expectedROI: number;
    riskLevel: 'high' | 'medium' | 'low';
  }>;
}

/**
 * パートナーオンボーディング
 */
export interface PartnerOnboarding {
  partnerId: string;
  programId: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  currentPhase: string;
  progress: number; // 0-100
  milestones: Array<{
    milestone: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    owner: string;
  }>;
  challenges: Array<{
    challenge: string;
    severity: 'high' | 'medium' | 'low';
    resolution: string;
    status: 'open' | 'resolved';
  }>;
  feedback: Array<{
    category: string;
    rating: number; // 1-5
    comments: string;
    date: Date;
  }>;
  completionDate?: Date;
  successScore?: number; // 0-100
}

/**
 * パートナーエンゲージメント
 */
export interface PartnerEngagement {
  partnerId: string;
  lastActivity: Date;
  communicationFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  engagementScore: number; // 0-100
  touchpoints: Array<{
    type: 'email' | 'call' | 'meeting' | 'training' | 'event';
    date: Date;
    duration: number; // minutes
    participants: string[];
    outcome: string;
    followUpRequired: boolean;
  }>;
  trainingProgress: {
    completedModules: number;
    totalModules: number;
    lastTrainingDate: Date;
    upcomingTraining: string[];
  };
  businessReviews: Array<{
    date: Date;
    type: 'quarterly' | 'annual' | 'ad-hoc';
    performance: {
      revenue: number;
      deals: number;
      pipeline: number;
      satisfaction: number;
    };
    goals: Array<{
      goal: string;
      target: number;
      actual: number;
      status: 'on-track' | 'at-risk' | 'achieved' | 'missed';
    }>;
    actionItems: string[];
  }>;
}

/**
 * チャネル最適化
 */
export interface ChannelOptimization {
  analysis: {
    performanceGaps: Array<{
      channel: string;
      gap: string;
      impact: number;
      effort: number;
      priority: 'high' | 'medium' | 'low';
    }>;
    resourceAllocation: Array<{
      channel: string;
      currentAllocation: number;
      optimalAllocation: number;
      reallocationRequired: number;
    }>;
    conflictResolution: Array<{
      conflict: string;
      resolution: string;
      benefit: number;
      timeline: string;
    }>;
  };
  recommendations: Array<{
    recommendation: string;
    rationale: string;
    implementation: string[];
    timeline: string;
    investment: number;
    expectedReturn: number;
    riskFactors: string[];
  }>;
  implementation: {
    phases: Array<{
      phase: string;
      duration: number;
      activities: string[];
      resources: string[];
      dependencies: string[];
    }>;
    timeline: string;
    budget: number;
    success: string[];
  };
}

/**
 * パートナーライフサイクル
 */
export interface PartnerLifecycle {
  partnerId: string;
  currentStage: 'prospecting' | 'evaluation' | 'onboarding' | 'active' | 'growth' | 'retention' | 'expansion' | 'churn';
  stageHistory: Array<{
    stage: string;
    startDate: Date;
    endDate?: Date;
    duration?: number; // days
    keyEvents: string[];
  }>;
  healthScore: number; // 0-100
  riskFactors: Array<{
    factor: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  growthOpportunities: Array<{
    opportunity: string;
    potential: number;
    timeline: string;
    requirements: string[];
  }>;
  renewalProbability: number; // 0-1
  expansionPotential: number; // 0-1
  churnRisk: number; // 0-1
}