/**
 * DNSweeper 競争優位性 - 型定義
 * 特許戦略・技術標準化・R&D・イノベーション・知的財産管理
 */

/**
 * 特許ステータス
 */
export type PatentStatus = 'idea' | 'filing' | 'pending' | 'granted' | 'expired' | 'abandoned';

/**
 * 標準化レベル
 */
export type StandardLevel = 'industry' | 'international' | 'national' | 'consortium' | 'defacto';

/**
 * R&Dフェーズ
 */
export type RnDPhase = 'research' | 'development' | 'prototype' | 'testing' | 'commercialization';

/**
 * イノベーションタイプ
 */
export type InnovationType = 'disruptive' | 'sustaining' | 'architectural' | 'component' | 'breakthrough';

/**
 * 競争優位性の持続期間
 */
export type CompetitiveAdvantageType = 'temporary' | 'sustainable' | 'long-term' | 'permanent';

/**
 * 特許ポートフォリオ
 */
export interface PatentPortfolio {
  id: string;
  name: string;
  description: string;
  patents: Array<{
    patentId: string;
    title: string;
    status: PatentStatus;
    filingDate: Date;
    grantDate?: Date;
    expiryDate?: Date;
    jurisdictions: string[];
    inventors: string[];
    technologyArea: string;
    businessValue: {
      revenue: number; // Annual revenue protected
      marketShare: number; // Market share protected
      defensiveValue: number; // Defensive value
      licensingPotential: number; // Licensing revenue potential
    };
    claims: {
      independent: number;
      dependent: number;
      coverage: string[];
    };
    prosecution: {
      cost: number;
      timeline: string;
      challenges: string[];
      strategy: string;
    };
  }>;
  strategy: {
    objectives: string[];
    approach: 'offensive' | 'defensive' | 'balanced';
    budget: {
      annual: number;
      filing: number;
      prosecution: number;
      maintenance: number;
      enforcement: number;
    };
    coverage: {
      coreProducts: number; // percentage covered
      futureProducts: number;
      keyFeatures: string[];
      whitespace: string[];
    };
  };
  landscape: {
    competitorPatents: Array<{
      competitor: string;
      patentCount: number;
      keyPatents: string[];
      threats: string[];
      opportunities: string[];
    }>;
    freedomToOperate: {
      risks: Array<{
        patent: string;
        owner: string;
        risk: 'low' | 'medium' | 'high';
        mitigation: string[];
      }>;
      clearance: string[];
    };
  };
  metrics: {
    portfolioSize: number;
    pendingApplications: number;
    grantRate: number;
    maintenanceCost: number;
    citationIndex: number;
    commercializationRate: number;
  };
}

/**
 * 技術標準化
 */
export interface TechnologyStandards {
  id: string;
  name: string;
  description: string;
  standards: Array<{
    standardId: string;
    name: string;
    description: string;
    level: StandardLevel;
    organization: string;
    status: 'draft' | 'review' | 'approved' | 'published' | 'deprecated';
    domain: string;
    contribution: {
      leadership: 'chair' | 'editor' | 'contributor' | 'observer';
      proposals: number;
      acceptedProposals: number;
      influence: 'high' | 'medium' | 'low';
    };
    businessImpact: {
      marketAccess: string[];
      competitiveAdvantage: string[];
      revenue: number;
      costSavings: number;
    };
    implementation: {
      inProducts: string[];
      compatibilityLevel: number; // 0-100
      migrationEffort: string;
      timeline: string;
    };
    ecosystem: {
      adopters: string[];
      supporters: string[];
      opposition: string[];
      networkEffect: number; // 0-100
    };
  }>;
  strategy: {
    objectives: string[];
    approach: 'leader' | 'fast-follower' | 'selective' | 'observer';
    focus: string[];
    participation: Array<{
      organization: string;
      commitment: 'high' | 'medium' | 'low';
      investment: number;
      benefits: string[];
    }>;
  };
  governance: {
    committee: {
      members: string[];
      roles: Record<string, string>;
      meetings: string;
      decisions: string[];
    };
    voting: {
      power: number; // voting weight
      coalitions: string[];
      strategy: string[];
    };
  };
  metrics: {
    standardsParticipation: number;
    leadershipPositions: number;
    proposalAcceptanceRate: number;
    marketAdoption: number;
    implementationCompliance: number;
  };
}

/**
 * R&D戦略
 */
export interface RnDStrategy {
  id: string;
  name: string;
  description: string;
  vision: string;
  objectives: string[];
  programs: Array<{
    programId: string;
    name: string;
    description: string;
    phase: RnDPhase;
    type: InnovationType;
    duration: string;
    budget: {
      total: number;
      allocated: number;
      spent: number;
      timeline: string;
    };
    team: {
      lead: string;
      size: number;
      skills: string[];
      external: Array<{
        organization: string;
        type: 'university' | 'research-institute' | 'industry' | 'consultant';
        contribution: string;
        cost: number;
      }>;
    };
    technology: {
      area: string;
      maturity: 'basic-research' | 'applied-research' | 'development' | 'demonstration';
      readiness: number; // TRL 1-9
      dependencies: string[];
      risks: Array<{
        risk: string;
        probability: number;
        impact: string;
        mitigation: string[];
      }>;
    };
    commercialization: {
      timeline: string;
      marketPotential: number;
      businessModel: string;
      goToMarket: string;
      ipStrategy: string;
    };
    milestones: Array<{
      milestone: string;
      date: Date;
      deliverables: string[];
      success: string[];
      status: 'pending' | 'achieved' | 'missed';
    }>;
    metrics: {
      progress: number; // 0-100
      qualityScore: number; // 0-100
      innovationIndex: number; // 0-100
      commercialViability: number; // 0-100
    };
  }>;
  innovation: {
    process: {
      ideaGeneration: string[];
      evaluation: string[];
      selection: string[];
      development: string[];
      commercialization: string[];
    };
    culture: {
      principles: string[];
      incentives: string[];
      resources: string[];
      collaboration: string[];
    };
    external: {
      partnerships: Array<{
        partner: string;
        type: 'university' | 'research-institute' | 'startup' | 'corporation';
        focus: string;
        investment: number;
        benefits: string[];
      }>;
      openInnovation: {
        challenges: string[];
        platforms: string[];
        community: string[];
        results: string[];
      };
    };
  };
  resources: {
    budget: {
      annual: number;
      allocation: {
        basicResearch: number;
        appliedResearch: number;
        development: number;
        infrastructure: number;
        talent: number;
      };
      trend: string;
    };
    facilities: Array<{
      location: string;
      type: string;
      capabilities: string[];
      utilization: number;
      investment: number;
    }>;
    talent: {
      researchers: number;
      engineers: number;
      external: number;
      skills: string[];
      development: string[];
    };
  };
  metrics: {
    output: {
      publications: number;
      patents: number;
      prototypes: number;
      products: number;
    };
    impact: {
      revenueFromNewProducts: number;
      marketShareGain: number;
      costReduction: number;
      timeToMarket: number;
    };
    efficiency: {
      roi: number;
      successRate: number;
      cycleTime: number;
      resourceUtilization: number;
    };
  };
}

/**
 * イノベーション管理
 */
export interface InnovationManagement {
  id: string;
  name: string;
  framework: {
    process: Array<{
      stage: string;
      description: string;
      activities: string[];
      gates: string[];
      criteria: string[];
      duration: string;
    }>;
    governance: {
      committee: string[];
      decisionRights: Record<string, string>;
      reviewCadence: string;
      escalation: string[];
    };
  };
  pipeline: Array<{
    innovationId: string;
    name: string;
    description: string;
    type: InnovationType;
    stage: string;
    value: {
      marketPotential: number;
      investmentRequired: number;
      roi: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    timeline: {
      startDate: Date;
      milestones: Array<{
        milestone: string;
        date: Date;
        status: 'pending' | 'achieved' | 'at-risk';
      }>;
      expectedCompletion: Date;
    };
    team: {
      champion: string;
      members: string[];
      sponsors: string[];
      stakeholders: string[];
    };
    resources: {
      budget: number;
      people: number;
      infrastructure: string[];
      external: string[];
    };
    risks: Array<{
      risk: string;
      impact: 'low' | 'medium' | 'high';
      probability: number;
      mitigation: string[];
    }>;
    success: {
      criteria: string[];
      metrics: Record<string, number>;
      validation: string[];
    };
  }>;
  portfolio: {
    balance: {
      byType: Record<InnovationType, number>;
      byStage: Record<string, number>;
      byRisk: Record<string, number>;
      byTimeline: Record<string, number>;
    };
    performance: {
      activeProjects: number;
      successRate: number;
      averageROI: number;
      timeToMarket: number;
      investmentUtilization: number;
    };
    strategy: {
      allocation: Record<string, number>;
      priorities: string[];
      constraints: string[];
      optimization: string[];
    };
  };
  capabilities: {
    core: string[];
    emerging: string[];
    gaps: string[];
    development: Array<{
      capability: string;
      currentLevel: number; // 0-10
      targetLevel: number;
      plan: string[];
      timeline: string;
    }>;
  };
  ecosystem: {
    internal: {
      departments: string[];
      collaboration: string[];
      knowledge: string[];
    };
    external: {
      partners: string[];
      networks: string[];
      communities: string[];
      platforms: string[];
    };
  };
}

/**
 * 知的財産管理
 */
export interface IntellectualPropertyManagement {
  id: string;
  name: string;
  strategy: {
    objectives: string[];
    approach: 'offensive' | 'defensive' | 'balanced';
    focus: string[];
    budget: {
      annual: number;
      allocation: {
        patents: number;
        trademarks: number;
        copyrights: number;
        tradeSecrets: number;
        enforcement: number;
      };
    };
  };
  portfolio: {
    patents: {
      total: number;
      granted: number;
      pending: number;
      value: number;
      coverage: string[];
    };
    trademarks: {
      total: number;
      registered: number;
      pending: number;
      international: number;
      value: number;
    };
    copyrights: {
      total: number;
      registered: number;
      commercialValue: number;
      licensing: number;
    };
    tradeSecrets: {
      identified: number;
      protected: number;
      value: number;
      risk: string[];
    };
  };
  lifecycle: {
    creation: {
      identification: string[];
      evaluation: string[];
      protection: string[];
      documentation: string[];
    };
    management: {
      maintenance: string[];
      monitoring: string[];
      enforcement: string[];
      licensing: string[];
    };
    monetization: {
      licensing: Array<{
        licensee: string;
        technology: string;
        terms: string;
        revenue: number;
        duration: string;
      }>;
      sale: Array<{
        buyer: string;
        assets: string[];
        value: number;
        date: Date;
      }>;
      crossLicensing: Array<{
        partner: string;
        scope: string;
        benefits: string[];
        risks: string[];
      }>;
    };
  };
  protection: {
    measures: {
      legal: string[];
      technical: string[];
      administrative: string[];
      physical: string[];
    };
    monitoring: {
      infringement: string[];
      competitors: string[];
      markets: string[];
      enforcement: string[];
    };
    enforcement: {
      strategy: string;
      budget: number;
      cases: Array<{
        case: string;
        infringer: string;
        ip: string;
        status: 'investigation' | 'negotiation' | 'litigation' | 'resolved';
        outcome: string;
        cost: number;
      }>;
    };
  };
  valuation: {
    methods: string[];
    portfolio: {
      totalValue: number;
      costBasis: number;
      marketValue: number;
      income: number;
    };
    assets: Array<{
      asset: string;
      type: string;
      value: number;
      method: string;
      date: Date;
      confidence: number;
    }>;
  };
  metrics: {
    creation: {
      inventionDisclosures: number;
      patentApplications: number;
      grantRate: number;
      timeToGrant: number;
    };
    value: {
      portfolioValue: number;
      licensingRevenue: number;
      costAvoidance: number;
      roi: number;
    };
    protection: {
      infringementCases: number;
      enforcementSuccessRate: number;
      averageSettlement: number;
      protectionCoverage: number;
    };
  };
}

/**
 * 競争分析
 */
export interface CompetitiveAnalysis {
  id: string;
  name: string;
  scope: string;
  competitors: Array<{
    name: string;
    type: 'direct' | 'indirect' | 'substitute' | 'emerging';
    marketPosition: string;
    strengths: string[];
    weaknesses: string[];
    strategy: string;
    resources: {
      rdBudget: number;
      patents: number;
      talent: number;
      partnerships: string[];
    };
    innovation: {
      focus: string[];
      capabilities: string[];
      pipeline: string[];
      timeline: string[];
    };
    threats: Array<{
      threat: string;
      severity: 'low' | 'medium' | 'high';
      timeline: string;
      mitigation: string[];
    }>;
    opportunities: Array<{
      opportunity: string;
      value: number;
      requirements: string[];
      timeline: string;
    }>;
  }>;
  analysis: {
    landscape: {
      structure: string;
      dynamics: string;
      trends: string[];
      disruptions: string[];
    };
    positioning: {
      ourPosition: string;
      advantages: string[];
      disadvantages: string[];
      differentiation: string[];
    };
    benchmarking: Array<{
      dimension: string;
      ourScore: number; // 0-10
      competitorScores: Record<string, number>;
      gap: number;
      actions: string[];
    }>;
  };
  intelligence: {
    sources: string[];
    monitoring: {
      patents: string[];
      publications: string[];
      movements: string[];
      partnerships: string[];
    };
    alerts: Array<{
      type: string;
      competitors: string[];
      trigger: string;
      action: string[];
    }>;
  };
  response: {
    strategy: string;
    initiatives: Array<{
      initiative: string;
      objective: string;
      timeline: string;
      resources: number;
      success: string[];
    }>;
    contingency: Array<{
      scenario: string;
      probability: number;
      impact: string;
      response: string[];
    }>;
  };
  metrics: {
    marketShare: number;
    innovation: number;
    competitiveAdvantage: number;
    threat: number;
  };
}

/**
 * 競争優位性
 */
export interface CompetitiveAdvantage {
  id: string;
  name: string;
  description: string;
  type: CompetitiveAdvantageType;
  category: 'cost' | 'differentiation' | 'focus' | 'innovation' | 'network' | 'resource';
  sources: Array<{
    source: string;
    strength: number; // 0-10
    sustainability: number; // 0-10
    imitability: 'easy' | 'moderate' | 'difficult' | 'impossible';
    substitutability: 'high' | 'medium' | 'low' | 'none';
    rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  }>;
  value: {
    customerValue: number;
    marketShare: number;
    revenue: number;
    margins: number;
    defensibility: number; // 0-100
  };
  sustainability: {
    factors: Array<{
      factor: string;
      impact: 'positive' | 'neutral' | 'negative';
      strength: number; // 0-10
      trend: 'improving' | 'stable' | 'declining';
    }>;
    threats: Array<{
      threat: string;
      probability: number;
      impact: string;
      timeline: string;
      mitigation: string[];
    }>;
    reinforcement: Array<{
      action: string;
      investment: number;
      timeline: string;
      impact: string;
    }>;
  };
  measurement: {
    kpis: Array<{
      kpi: string;
      current: number;
      target: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
    benchmarks: Array<{
      metric: string;
      ourValue: number;
      industryAverage: number;
      bestInClass: number;
      gap: number;
    }>;
  };
  development: {
    roadmap: Array<{
      initiative: string;
      timeline: string;
      investment: number;
      expectedImpact: string;
      dependencies: string[];
    }>;
    capabilities: Array<{
      capability: string;
      currentLevel: number;
      targetLevel: number;
      gap: number;
      development: string[];
    }>;
  };
}

/**
 * 技術優位性
 */
export interface TechnicalAdvantage {
  id: string;
  name: string;
  technology: string;
  advantage: {
    type: 'performance' | 'cost' | 'quality' | 'scalability' | 'security' | 'usability';
    description: string;
    quantification: {
      metric: string;
      ourValue: number;
      competitorValue: number;
      advantage: number; // percentage or absolute
      confidence: number; // 0-1
    };
  };
  protection: {
    intellectual: string[];
    trade: string[];
    regulatory: string[];
    natural: string[];
  };
  commercialization: {
    products: string[];
    markets: string[];
    revenue: number;
    potential: number;
  };
  risks: Array<{
    risk: string;
    type: 'technological' | 'competitive' | 'market' | 'regulatory';
    probability: number;
    impact: string;
    mitigation: string[];
  }>;
  roadmap: {
    current: string;
    nearTerm: string[];
    longTerm: string[];
    investments: Array<{
      area: string;
      amount: number;
      timeline: string;
      outcome: string;
    }>;
  };
}

/**
 * イノベーションメトリクス
 */
export interface InnovationMetrics {
  overview: {
    rdIntensity: number; // R&D spend as % of revenue
    innovationIndex: number; // 0-100
    timeToMarket: number; // months
    successRate: number; // % of projects that reach market
    revenueFromNewProducts: number; // % of revenue from products <3 years old
  };
  input: {
    rdInvestment: number;
    researchStaff: number;
    externalPartnerships: number;
    ideaSubmissions: number;
  };
  process: {
    projectsInPipeline: number;
    averageCycleTime: number;
    stageLoss: Record<string, number>; // % lost at each stage
    resourceUtilization: number;
  };
  output: {
    patentsGenerated: number;
    prototypesBuilt: number;
    productsLaunched: number;
    publicationsProduced: number;
  };
  impact: {
    marketShareGain: number;
    customerSatisfaction: number;
    employeeEngagement: number;
    brandStrength: number;
  };
  benchmarking: {
    industryPosition: number; // percentile
    peerComparison: Array<{
      peer: string;
      metric: string;
      theirValue: number;
      ourValue: number;
      gap: number;
    }>;
    trends: Array<{
      metric: string;
      trend: 'improving' | 'stable' | 'declining';
      changeRate: number;
    }>;
  };
  forecasting: {
    nextYear: {
      expectedROI: number;
      newProductRevenue: number;
      patentApplications: number;
      marketLaunches: number;
    };
    fiveYear: {
      cumulativeROI: number;
      portfolioTransformation: number; // % of portfolio renewed
      competitivePosition: string;
    };
  };
}

/**
 * 技術ロードマップ
 */
export interface TechnologyRoadmap {
  id: string;
  name: string;
  timeframe: string;
  scope: string;
  layers: {
    market: Array<{
      timeline: string;
      opportunities: string[];
      requirements: string[];
      drivers: string[];
    }>;
    product: Array<{
      timeline: string;
      products: string[];
      features: string[];
      performance: Record<string, number>;
    }>;
    technology: Array<{
      timeline: string;
      technologies: string[];
      maturity: Record<string, number>;
      dependencies: string[];
    }>;
    research: Array<{
      timeline: string;
      areas: string[];
      investments: Record<string, number>;
      partnerships: string[];
    }>;
  };
  gaps: Array<{
    gap: string;
    type: 'market' | 'product' | 'technology' | 'research';
    impact: 'low' | 'medium' | 'high';
    timeline: string;
    solution: string[];
  }>;
  dependencies: Array<{
    dependency: string;
    type: 'internal' | 'external' | 'partner' | 'supplier';
    risk: 'low' | 'medium' | 'high';
    mitigation: string[];
  }>;
  scenarios: Array<{
    scenario: string;
    probability: number;
    impact: string;
    adjustments: string[];
  }>;
  governance: {
    owners: string[];
    reviewCycle: string;
    updateProcess: string[];
    stakeholders: string[];
  };
}

/**
 * 競争優位性ダッシュボード
 */
export interface CompetitiveAdvantageDashboard {
  overview: {
    totalAdvantages: number;
    sustainableAdvantages: number;
    patentPortfolioValue: number;
    innovationIndex: number;
    competitivePosition: number; // 0-100
    lastUpdated: Date;
  };
  portfolio: {
    byType: Record<CompetitiveAdvantageType, number>;
    byCategory: Record<string, number>;
    bySustainability: Record<string, number>;
    byValue: Record<string, number>;
  };
  trends: {
    innovation: {
      direction: 'improving' | 'stable' | 'declining';
      rate: number;
      drivers: string[];
    };
    competition: {
      intensity: 'increasing' | 'stable' | 'decreasing';
      threats: string[];
      opportunities: string[];
    };
    market: {
      growth: number;
      disruption: string[];
      positioning: string;
    };
  };
  alerts: Array<{
    type: 'threat' | 'opportunity' | 'milestone' | 'budget';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    action: string[];
    deadline: Date;
  }>;
  performance: {
    achievements: string[];
    gaps: string[];
    recommendations: string[];
    nextReview: Date;
  };
}