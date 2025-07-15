/**
 * DNSweeper 戦略的提携 - 型定義
 * エコシステム構築・パートナーシップ管理・統合開発・共同マーケティング
 */

/**
 * パートナーシップタイプ
 */
export type PartnershipType = 
  | 'technology-alliance' 
  | 'channel' 
  | 'strategic' 
  | 'consulting' 
  | 'integration' 
  | 'reseller' 
  | 'oem' 
  | 'cloud-alliance';

/**
 * パートナーティア
 */
export type PartnerTier = 'strategic' | 'preferred' | 'certified' | 'basic';

/**
 * パートナーシップステータス
 */
export type PartnershipStatus = 
  | 'prospect' 
  | 'negotiating' 
  | 'developing' 
  | 'active' 
  | 'expanding' 
  | 'renewing' 
  | 'churned' 
  | 'terminated';

/**
 * 統合タイプ
 */
export type IntegrationType = 
  | 'api' 
  | 'webhook' 
  | 'sdk' 
  | 'plugin' 
  | 'extension' 
  | 'terraform-provider' 
  | 'kubernetes-operator' 
  | 'ci-cd' 
  | 'infrastructure-as-code' 
  | 'container-orchestration';

/**
 * 戦略的パートナーシップ
 */
export interface StrategicPartnership {
  id: string;
  partnerName: string;
  partnershipType: PartnershipType;
  tier: PartnerTier;
  status: PartnershipStatus;
  description: string;
  startDate: Date;
  endDate?: Date;
  scope: {
    geographic: string[];
    market: string[];
    products: string[];
    solutions: string[];
  };
  objectives: string[];
  keyStakeholders: {
    dnsweeper: Array<{
      name: string;
      role: string;
      responsibility: string;
    }>;
    partner: Array<{
      name: string;
      role: string;
      responsibility: string;
    }>;
  };
  budget?: {
    total: number;
    allocation: Record<string, number>;
    timeline: string;
  };
  metrics: {
    business: Record<string, { target: number; current: number }>;
    technical: Record<string, { target: number; current: number }>;
    relationship: Record<string, { target: number; current: number }>;
  };
  governance: {
    structure: string;
    reviewFrequency: string;
    escalationPath: string[];
    contractTerms: {
      duration: number; // months
      autoRenewal: boolean;
      terminationClause: string;
      exclusivityTerms?: string;
    };
  };
  risks: Array<{
    risk: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string[];
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: number;
    timeline: string;
    requirements: string[];
  }>;
}

/**
 * テクノロジー統合
 */
export interface TechnologyIntegration {
  id: string;
  partnerName: string;
  integrationType: IntegrationType;
  status: 'planning' | 'development' | 'testing' | 'active' | 'deprecated';
  description: string;
  technicalDetails: {
    integrationMethod: string;
    apiEndpoints: string[];
    authenticationMethod: string;
    dataFlow: 'unidirectional' | 'bidirectional';
    realTimeSync: boolean;
    supportedVersions?: string[];
    dependencies?: string[];
  };
  businessValue: {
    targetCustomers: string[];
    valueProposition: string;
    expectedRevenue: number;
    marketImpact: string;
    competitiveAdvantage: string;
  };
  developmentPlan: {
    phases: Array<{
      phase: string;
      duration: string;
      deliverables: string[];
      resources: string[];
      budget: number;
    }>;
    timeline: string;
    totalBudget: number;
  };
  metrics: {
    adoption: {
      target: number;
      current: number;
      timeline: string;
    };
    revenue: {
      target: number;
      current: number;
      timeline: string;
    };
    satisfaction: {
      target: number;
      current: number;
      timeline: string;
    };
  };
  governance: {
    stakeholders: string[];
    reviewFrequency: string;
    successCriteria: string[];
    escalationPath: string[];
  };
}

/**
 * Go-to-Market パートナーシップ
 */
export interface GoToMarketPartnership {
  id: string;
  partnerName: string;
  partnershipType: PartnershipType;
  tier: PartnerTier;
  status: PartnershipStatus;
  description: string;
  scope: {
    geographic: string[];
    market: string[];
    products: string[];
    solutions: string[];
  };
  businessModel: {
    revenueSharing: {
      model: string;
      rates: Record<string, number>;
      paymentTerms: string;
    };
    jointOffering?: {
      name: string;
      positioning: string;
      pricing: {
        model: string;
        discount: number;
        minimumCommitment: string;
      };
    };
  };
  goToMarketActivities: {
    jointMarketing: Array<{
      activity: string;
      frequency: string;
      budget: number;
      expectedLeads: number;
      responsibility: string;
    }>;
    salesEnablement: string[];
    technicalEnablement: string[];
  };
  metrics: {
    business: Record<string, { target: number; current: number }>;
    marketing: Record<string, { target: number; current: number }>;
    technical: Record<string, { target: number; current: number }>;
  };
  governance: {
    executiveSponsors: {
      dnsweeper: string;
      partner: string;
    };
    workingGroups: Array<{
      name: string;
      participants: string[];
      frequency: string;
    }>;
    reviewCadence: string;
    escalationProcess: string[];
  };
}

/**
 * チャネルパートナーシップ
 */
export interface ChannelPartnership {
  id: string;
  name: string;
  description: string;
  partnershipType: 'channel' | 'consulting' | 'reseller' | 'oem';
  targetPartners: string[];
  partnerCriteria: {
    technical: string[];
    business: string[];
    commitment: string[];
  };
  partnerBenefits: {
    financial: {
      margins: Record<string, number>;
      incentives: Array<{
        trigger: string;
        reward: string;
        type: string;
      }>;
      payment: string;
    };
    technical: string[];
    marketing: string[];
    sales: string[];
  };
  enablementProgram: {
    onboarding: Array<{
      stage: string;
      duration: string;
      activities: string[];
    }>;
    ongoing: string[];
  };
  metrics: {
    recruitment: {
      target: number;
      current: number;
      timeline: string;
      quality: string;
    };
    revenue: {
      target: number;
      current: number;
      timeline: string;
      attribution: string;
    };
    enablement: Record<string, { target: number; current: number }>;
  };
}

/**
 * エコシステム戦略
 */
export interface EcosystemStrategy {
  vision: string;
  mission: string;
  objectives: string[];
  principles: string[];
  partnershipTiers: Array<{
    tier: PartnerTier;
    criteria: string[];
    benefits: string[];
    commitments: string[];
  }>;
  ecosystemMap: {
    coreInfrastructure: string[];
    developmentTools: string[];
    businessApplications: string[];
    verticalSolutions: string[];
  };
  competitiveAdvantages: string[];
  riskMitigation: string[];
}

/**
 * パートナーシップメトリクス
 */
export interface PartnershipMetrics {
  partnership: string;
  timeframe: string;
  business: {
    revenueGenerated: number;
    pipelineCreated: number;
    customersAcquired: number;
    marketShareGain: number;
  };
  operational: {
    integrationHealth: number; // 0-100
    supportTickets: number;
    responseTime: number; // hours
    uptime: number; // percentage
  };
  strategic: {
    goalAlignment: number; // 0-100
    innovationIndex: number; // 0-100
    competitiveAdvantage: number; // 0-100
    futureOpportunity: number; // 0-100
  };
  relationship: {
    stakeholderSatisfaction: number; // 0-10
    communicationFrequency: number; // per month
    conflictResolution: number; // days average
    trustIndex: number; // 0-100
  };
}

/**
 * ジョイント開発
 */
export interface JointDevelopment {
  id: string;
  name: string;
  description: string;
  partners: string[];
  objectives: string[];
  projects: Array<{
    name: string;
    description: string;
    partners: string[];
    timeline: string;
    budget: number;
    deliverables: string[];
    success: string[];
  }>;
  governance: {
    structure: string;
    members: string[];
    meetings: string;
    decisionMaking: string;
  };
  metrics: {
    community?: Record<string, { target: number; current: number }>;
    business: Record<string, { target: number; current: number }>;
  };
}

/**
 * 共同マーケティング
 */
export interface CoMarketing {
  id: string;
  name: string;
  partners: string[];
  campaigns: Array<{
    name: string;
    type: string;
    objectives: string[];
    channels: string[];
    budget: number;
    timeline: {
      start: Date;
      end: Date;
    };
    responsibilities: Record<string, string[]>;
    metrics: Record<string, number>;
  }>;
  assets: {
    shared: string[];
    cobranded: string[];
    individual: Record<string, string[]>;
  };
  guidelines: {
    branding: string[];
    messaging: string[];
    approval: string[];
  };
  performance: {
    reach: number;
    engagement: number;
    leads: number;
    conversions: number;
    roi: number;
  };
}

/**
 * パートナーオンボーディング
 */
export interface PartnerOnboarding {
  partnerId: string;
  partnerName: string;
  program: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  phases: Array<{
    phase: string;
    description: string;
    duration: number; // days
    activities: Array<{
      activity: string;
      owner: string;
      status: 'pending' | 'in-progress' | 'completed' | 'blocked';
      dueDate: Date;
      completedDate?: Date;
    }>;
    exitCriteria: string[];
    success: boolean;
  }>;
  timeline: {
    startDate: Date;
    expectedEndDate: Date;
    actualEndDate?: Date;
  };
  resources: {
    assigned: string[];
    budget: number;
    tools: string[];
  };
  challenges: Array<{
    challenge: string;
    impact: 'low' | 'medium' | 'high';
    resolution: string;
    status: 'open' | 'resolved';
  }>;
  success: {
    criteria: string[];
    score: number; // 0-100
    feedback: string[];
  };
}

/**
 * パートナーシップガバナンス
 */
export interface PartnershipGovernance {
  partnershipId: string;
  governanceModel: string;
  stakeholders: Array<{
    name: string;
    organization: string;
    role: string;
    responsibilities: string[];
    authority: 'decision-maker' | 'influencer' | 'advisor' | 'executor';
  }>;
  committees: Array<{
    name: string;
    purpose: string;
    members: string[];
    frequency: string;
    authority: string[];
  }>;
  processes: {
    decisionMaking: {
      process: string;
      approval: string[];
      escalation: string[];
      timeline: string;
    };
    conflictResolution: {
      process: string;
      steps: string[];
      arbitration: string;
      timeline: string;
    };
    performanceReview: {
      frequency: string;
      participants: string[];
      metrics: string[];
      actions: string[];
    };
  };
  communication: {
    regular: Array<{
      type: string;
      frequency: string;
      participants: string[];
      agenda: string[];
    }>;
    adhoc: {
      triggers: string[];
      process: string[];
      timeline: string;
    };
  };
  documentation: {
    agreements: string[];
    procedures: string[];
    templates: string[];
    repository: string;
  };
}

/**
 * パートナー分析
 */
export interface PartnerAnalytics {
  overview: {
    totalPartners: number;
    activePartnerships: number;
    pipelineValue: number;
    revenueAttribution: number;
    partnerSatisfaction: number;
    newPartnersThisQuarter: number;
  };
  partnershipTypes: Record<string, {
    count: number;
    revenue: number;
    satisfaction: number;
  }>;
  performanceMetrics: {
    revenueGrowth: number;
    partnerRetention: number;
    timeToValue: number; // days
    dealAcceleration: number; // percentage
    customerSatisfaction: number;
  };
  topPerformers: Array<{
    partner: string;
    revenue: number;
    growth: number;
    satisfaction: number;
  }>;
  challenges: Array<{
    challenge: string;
    impact: 'low' | 'medium' | 'high';
    solution: string;
    timeline: string;
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: number;
    timeline: string;
    investment: number;
  }>;
  lastUpdated: Date;
}

/**
 * パートナーシップROI
 */
export interface PartnershipROI {
  partnershipId: string;
  timeframe: string;
  investment: {
    direct: number;
    indirect: number;
    total: number;
  };
  returns: {
    directRevenue: number;
    indirectValue: number;
    totalReturns: number;
  };
  roi: {
    financial: number;
    strategic: number;
    total: number;
  };
  metrics: {
    customerAcquisition: number;
    marketAccess: number; // 0-1
    brandAwareness: number; // 0-1
    innovationAcceleration: number; // 0-1
  };
  paybackPeriod: number; // months
  confidence: number; // 0-1
}

/**
 * パートナーエンゲージメント
 */
export interface PartnerEngagement {
  partnerId: string;
  partnerName: string;
  engagementScore: number; // 0-100
  lastActivity: Date;
  touchpoints: Array<{
    type: 'meeting' | 'email' | 'call' | 'event' | 'training' | 'support';
    date: Date;
    participants: string[];
    objective: string;
    outcome: string;
    nextSteps: string[];
  }>;
  health: {
    overall: number; // 0-100
    business: number; // 0-100
    technical: number; // 0-100
    relationship: number; // 0-100
  };
  satisfaction: {
    scores: Array<{
      date: Date;
      score: number; // 0-10
      category: string;
      feedback: string;
    }>;
    trends: {
      direction: 'improving' | 'stable' | 'declining';
      change: number; // percentage
    };
  };
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: number; // 0-1
    impact: string;
    mitigation: string[];
  }>;
  opportunities: Array<{
    opportunity: string;
    value: number;
    timeline: string;
    requirements: string[];
  }>;
}

/**
 * エコシステムマップ
 */
export interface EcosystemMap {
  categories: Array<{
    name: string;
    description: string;
    partners: Array<{
      name: string;
      type: PartnershipType;
      tier: PartnerTier;
      status: PartnershipStatus;
      integrations: string[];
      value: number;
    }>;
    coverage: number; // 0-1
    strategic: number; // 0-1
  }>;
  connections: Array<{
    from: string;
    to: string;
    type: 'integration' | 'referral' | 'joint-offering' | 'competition';
    strength: number; // 0-1
    direction: 'unidirectional' | 'bidirectional';
  }>;
  gaps: Array<{
    category: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
    solutions: string[];
  }>;
  opportunities: Array<{
    type: 'new-partner' | 'deeper-integration' | 'joint-innovation' | 'market-expansion';
    description: string;
    partners: string[];
    value: number;
    timeline: string;
  }>;
}

/**
 * パートナー契約
 */
export interface PartnerContract {
  partnerId: string;
  contractId: string;
  type: 'master-agreement' | 'sow' | 'addendum' | 'amendment';
  status: 'draft' | 'review' | 'approved' | 'signed' | 'active' | 'expired' | 'terminated';
  terms: {
    startDate: Date;
    endDate: Date;
    autoRenewal: boolean;
    renewalTerms: string;
    terminationClause: string;
  };
  financial: {
    revenueSharing: Record<string, number>;
    minimumCommitments: Record<string, number>;
    paymentTerms: string;
    penalties: Record<string, number>;
  };
  obligations: {
    dnsweeper: string[];
    partner: string[];
    joint: string[];
  };
  intellectual: {
    ipOwnership: Record<string, string>;
    licensing: string[];
    restrictions: string[];
  };
  compliance: {
    regulations: string[];
    auditing: string[];
    reporting: string[];
    certifications: string[];
  };
  governance: {
    reviewPeriods: string[];
    amendmentProcess: string;
    disputeResolution: string;
    arbitration: string;
  };
}

/**
 * パートナー通信
 */
export interface PartnerCommunication {
  partnerId: string;
  communicationPlan: {
    regular: Array<{
      type: 'newsletter' | 'update' | 'training' | 'event';
      frequency: string;
      audience: string[];
      content: string[];
      channel: string[];
    }>;
    triggered: Array<{
      trigger: string;
      type: string;
      audience: string[];
      template: string;
      timing: string;
    }>;
  };
  channels: Array<{
    channel: 'email' | 'portal' | 'slack' | 'teams' | 'phone' | 'in-person';
    usage: 'primary' | 'secondary' | 'emergency';
    contacts: string[];
    preferences: Record<string, unknown>;
  }>;
  history: Array<{
    date: Date;
    type: string;
    channel: string;
    sender: string;
    recipients: string[];
    subject: string;
    summary: string;
    response?: {
      date: Date;
      summary: string;
    };
  }>;
  feedback: Array<{
    date: Date;
    source: string;
    type: 'positive' | 'neutral' | 'negative';
    category: string;
    feedback: string;
    action: string;
    resolution?: string;
  }>;
}