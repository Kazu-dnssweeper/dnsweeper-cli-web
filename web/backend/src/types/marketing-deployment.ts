/**
 * DNSweeper マーケティング展開 - 型定義
 * 統合マーケティング戦略・デジタルマーケティング・コンテンツ戦略・ブランド構築
 */

/**
 * マーケティング目標
 */
export type MarketingObjective = 
  | 'brand-awareness' 
  | 'lead-generation' 
  | 'customer-acquisition' 
  | 'retention' 
  | 'expansion' 
  | 'thought-leadership';

/**
 * マーケティングチャネルタイプ
 */
export type ChannelType = 'owned' | 'earned' | 'paid' | 'shared' | 'experiential' | 'community';

/**
 * キャンペーンステータス
 */
export type CampaignStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * コンテンツタイプ
 */
export type ContentType = 
  | 'blog-post' 
  | 'whitepaper' 
  | 'case-study' 
  | 'video' 
  | 'webinar' 
  | 'infographic' 
  | 'guide' 
  | 'tutorial';

/**
 * 広告プラットフォーム
 */
export type AdPlatform = 'google-ads' | 'linkedin-ads' | 'twitter-ads' | 'facebook-ads' | 'youtube-ads';

/**
 * ソーシャルメディアプラットフォーム
 */
export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'youtube' | 'github' | 'reddit';

/**
 * マーケティング戦略
 */
export interface MarketingStrategy {
  id: string;
  name: string;
  description: string;
  objective: MarketingObjective;
  targetAudience: {
    primary: string[];
    secondary: string[];
    personas: Array<{
      name: string;
      description: string;
      demographics: {
        age: string;
        location: string;
        experience: string;
      };
      painPoints: string[];
      goals: string[];
      channels: string[];
    }>;
  };
  positioning: {
    statement: string;
    valueProposition: string;
    differentiators: string[];
    competitiveFramework: {
      category: string;
      versus: string;
      reasons: string[];
    };
  };
  channels: Array<{
    channel: string;
    budget: number;
    allocation: number; // 0-1
    expectedContribution: number; // 0-1
    kpis: string[];
  }>;
  budget: {
    total: number;
    allocation: {
      contentCreation: number;
      paidAdvertising: number;
      events: number;
      tools: number;
      personnel: number;
      partnerships: number;
    };
    timeline: string;
  };
  timeline: {
    phase1: {
      name: string;
      duration: string;
      objectives: string[];
      deliverables: string[];
    };
    phase2: {
      name: string;
      duration: string;
      objectives: string[];
      deliverables: string[];
    };
    phase3: {
      name: string;
      duration: string;
      objectives: string[];
      deliverables: string[];
    };
    phase4: {
      name: string;
      duration: string;
      objectives: string[];
      deliverables: string[];
    };
  };
  success: {
    metrics: Array<{
      metric: string;
      target: string;
      measurement: string;
    }>;
    roi: {
      target: number;
      calculation: string;
      timeline: string;
    };
  };
}

/**
 * マーケティングキャンペーン
 */
export interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  strategy: string; // strategy id
  objective: MarketingObjective;
  status: CampaignStatus;
  channels: string[];
  targetAudience: string[];
  budget: {
    planned: number;
    actual: number;
    remaining: number;
  };
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      milestone: string;
      date: Date;
      status: 'pending' | 'completed' | 'overdue';
    }>;
  };
  creative: {
    theme: string;
    messaging: string[];
    assets: Array<{
      type: string;
      name: string;
      status: 'planning' | 'creation' | 'review' | 'approved' | 'live';
    }>;
  };
  targeting: {
    demographics: Record<string, unknown>;
    interests: string[];
    behaviors: string[];
    lookalike: boolean;
    customAudiences: string[];
  };
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number; // click-through rate
    cpc: number; // cost per click
    cpa: number; // cost per acquisition
    roi: number;
  };
  optimization: {
    experiments: Array<{
      test: string;
      variants: string[];
      winner: string;
      improvement: number;
    }>;
    insights: string[];
    recommendations: string[];
  };
}

/**
 * コンテンツ戦略
 */
export interface ContentStrategy {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  targetAudience: {
    primary: string;
    personas: string[];
    painPoints: string[];
  };
  contentPillars: Array<{
    pillar: string;
    description: string;
    contentTypes: string[];
    keywords: string[];
    targetTraffic: number;
  }>;
  contentCalendar: {
    frequency: {
      blogPosts: string;
      whitepapers: string;
      caseStudies: string;
      webinars: string;
      videos: string;
    };
    themes: {
      january: string;
      february: string;
      march: string;
      april: string;
      may: string;
      june: string;
      july: string;
      august: string;
      september: string;
      october: string;
      november: string;
      december: string;
    };
  };
  distribution: {
    owned: string[];
    earned: string[];
    paid: string[];
    shared: string[];
  };
  metrics: {
    reach: Array<{
      metric: string;
      target: number;
      measurement: string;
    }>;
    engagement: Array<{
      metric: string;
      target: number;
      measurement: string;
    }>;
    conversion: Array<{
      metric: string;
      target: number;
      measurement: string;
    }>;
  };
}

/**
 * デジタルマーケティング
 */
export interface DigitalMarketing {
  seo: {
    strategy: string;
    targetKeywords: Array<{
      keyword: string;
      difficulty: 'low' | 'medium' | 'high';
      volume: number;
      intent: 'informational' | 'commercial' | 'transactional';
      currentRank: number;
      targetRank: number;
    }>;
    contentPlan: Array<{
      type: string;
      topic: string;
      targetKeywords: string[];
      expectedTraffic: number;
      timeline: string;
    }>;
    technicalSEO: {
      siteSpeed: { target: string; current: string };
      mobileFriendly: { target: string; current: string };
      coreWebVitals: { target: string; current: string };
      structuredData: { target: string; current: string };
    };
  };
  paidAdvertising: {
    platforms: Array<{
      platform: AdPlatform;
      budget: number;
      allocation: number; // 0-1
      campaigns: Array<{
        name: string;
        type: string;
        budget: number;
        targetCPA: number;
        expectedLeads: number;
        keywords: string[];
      }>;
    }>;
    retargeting: {
      audiences: string[];
      budget: number;
      expectedConversion: number;
    };
    attribution: {
      model: string;
      trackingSetup: string;
      conversionTracking: string;
    };
  };
  socialMedia: {
    platforms: Array<{
      platform: SocialPlatform;
      strategy: string;
      contentMix: {
        thoughtLeadership?: number;
        productUpdates?: number;
        industryNews?: number;
        userGeneratedContent?: number;
        technicalContent?: number;
        communityEngagement?: number;
        tutorials?: number;
        customerStories?: number;
        repositories?: number;
        documentation?: number;
        communitySupport?: number;
        productDemos?: number;
      };
      postingFrequency: string;
      targetFollowers: number;
      expectedEngagement: number;
    }>;
    influencerProgram: {
      tiers: Array<{
        tier: string;
        followers: string;
        compensation: string;
        expected: number;
      }>;
      budget: number;
      expectedReach: number;
    };
  };
  emailMarketing: {
    lists: Array<{
      list: string;
      size: number;
      growthRate: number;
      segments: string[];
    }>;
    campaigns: Array<{
      type: string;
      name: string;
      frequency: string;
      openRate: number;
      clickRate: number;
      conversionRate: number;
    }>;
    automation: string[];
  };
  analytics: {
    platforms: string[];
    dashboards: string[];
    reporting: {
      frequency: string;
      stakeholders: string[];
      metrics: string[];
    };
  };
}

/**
 * ブランド戦略
 */
export interface BrandStrategy {
  brandPosition: {
    mission: string;
    vision: string;
    values: string[];
    personality: string[];
  };
  brandMessaging: {
    tagline: string;
    primaryMessage: string;
    supportingMessages: string[];
    keyWords: string[];
  };
  visualIdentity: {
    logo: {
      primary: string;
      variations: string[];
      usage: string;
    };
    colorPalette: {
      primary: string;
      secondary: string;
      accent: string;
      neutral: string[];
      meaning: string;
    };
    typography: {
      primary: string;
      secondary: string;
      code: string;
      hierarchy: string;
    };
    imagery: {
      style: string;
      subjects: string[];
      tone: string;
      usage: string;
    };
  };
  brandGuidelines: {
    voice: {
      tone: string;
      style: string;
      personality: string;
      examples: string[];
    };
    messaging: {
      doSay: string[];
      dontSay: string[];
    };
    applications: {
      website: string;
      documentation: string;
      support: string;
      marketing: string;
    };
  };
  brandExperience: {
    touchpoints: Array<{
      touchpoint: string;
      experience: string;
      importance: 'critical' | 'high' | 'medium' | 'low';
      ownership: string;
    }>;
    consistency: {
      measurements: string[];
      standards: string[];
      training: string[];
    };
  };
  brandMetrics: {
    awareness: {
      target: string;
      measurement: string;
      timeline: string;
    };
    perception: {
      target: string;
      measurement: string;
      timeline: string;
    };
    consideration: {
      target: string;
      measurement: string;
      timeline: string;
    };
    loyalty: {
      target: string;
      measurement: string;
      timeline: string;
    };
  };
}

/**
 * マーケティングチャネル
 */
export interface MarketingChannel {
  id: string;
  name: string;
  type: ChannelType;
  description: string;
  objectives: string[];
  targetAudience: string[];
  budget: {
    annual: number;
    allocation: Record<string, number>;
  };
  strategy: {
    approach: string;
    contentTypes?: string[];
    distribution?: string[];
    eventTypes?: string[];
    calendar?: Array<{
      event: string;
      type: string;
      budget: number;
      expected: Record<string, number>;
      timeline: string;
    }>;
    initiatives?: string[];
    platforms?: string[];
  };
  metrics: {
    primary: Array<{
      metric: string;
      target: number;
      current: number;
    }>;
    secondary: Array<{
      metric: string;
      target: number;
      current: number;
    }>;
  };
  timeline: {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
  };
}

/**
 * リード生成
 */
export interface LeadGeneration {
  sources: Array<{
    source: string;
    type: 'organic' | 'paid' | 'referral' | 'direct';
    leads: number;
    quality: 'high' | 'medium' | 'low';
    cost: number;
    conversionRate: number;
  }>;
  qualification: {
    criteria: string[];
    process: string[];
    scoreThreshold: number;
    automation: string[];
  };
  nurturing: {
    programs: Array<{
      program: string;
      audience: string;
      content: string[];
      duration: number; // days
      conversionRate: number;
    }>;
    touchpoints: Array<{
      touchpoint: string;
      timing: string;
      channel: string;
      content: string;
    }>;
  };
  conversion: {
    funnel: Array<{
      stage: string;
      visitors: number;
      conversionRate: number;
      dropoffReasons: string[];
    }>;
    optimization: {
      experiments: string[];
      improvements: Array<{
        change: string;
        impact: number;
        implementation: string;
      }>;
    };
  };
}

/**
 * マーケティング分析
 */
export interface MarketingAnalytics {
  overview: {
    totalBudget: number;
    budgetUtilization: number;
    totalLeads: number;
    qualifiedLeads: number;
    costPerLead: number;
    conversionRate: number;
    roi: number;
  };
  channelPerformance: Record<string, {
    budget: number;
    spend: number;
    leads: number;
    conversions: number;
    roi: number;
    efficiency: number;
  }>;
  campaignPerformance: Record<string, {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number;
    cpa: number;
    roi: number;
  }>;
  attribution: {
    model: string;
    firstTouch: Record<string, number>;
    lastTouch: Record<string, number>;
    multiTouch: Record<string, number>;
  };
  customerJourney: {
    awareness: {
      visitors: number;
      sources: Record<string, number>;
    };
    interest: {
      engagements: number;
      content: Record<string, number>;
    };
    consideration: {
      trials: number;
      demos: number;
    };
    purchase: {
      conversions: number;
      value: number;
    };
    retention: {
      renewals: number;
      expansion: number;
    };
  };
  forecasting: {
    nextQuarter: {
      expectedLeads: number;
      expectedRevenue: number;
      confidence: number; // 0-1
    };
    nextYear: {
      expectedLeads: number;
      expectedRevenue: number;
      confidence: number; // 0-1
    };
  };
  lastUpdated: Date;
}

/**
 * マーケティング自動化
 */
export interface MarketingAutomation {
  platform: string;
  workflows: Array<{
    id: string;
    name: string;
    trigger: string;
    actions: Array<{
      action: string;
      timing: string;
      content: string;
      conditions?: string[];
    }>;
    metrics: {
      enrolled: number;
      completed: number;
      conversionRate: number;
    };
  }>;
  segmentation: {
    criteria: Array<{
      criterion: string;
      values: string[];
      size: number;
    }>;
    automation: boolean;
    personalization: string[];
  };
  leadScoring: {
    model: string;
    factors: Array<{
      factor: string;
      weight: number;
      values: Record<string, number>;
    }>;
    thresholds: {
      cold: number;
      warm: number;
      hot: number;
      qualified: number;
    };
  };
  reporting: {
    dashboards: string[];
    alerts: Array<{
      metric: string;
      threshold: number;
      recipients: string[];
    }>;
    optimization: string[];
  };
}

/**
 * 顧客獲得
 */
export interface CustomerAcquisition {
  strategies: Array<{
    strategy: string;
    channels: string[];
    budget: number;
    targetCAC: number;
    expectedVolume: number;
  }>;
  funnel: {
    stages: Array<{
      stage: string;
      volume: number;
      conversionRate: number;
      cost: number;
      duration: number; // days
    }>;
    optimization: Array<{
      stage: string;
      bottleneck: string;
      solution: string;
      expectedImprovement: number;
    }>;
  };
  cohortAnalysis: {
    cohorts: Array<{
      cohort: string;
      acquisitionDate: Date;
      size: number;
      cac: number;
      ltv: number;
      paybackPeriod: number;
    }>;
    trends: Array<{
      metric: string;
      trend: 'improving' | 'stable' | 'declining';
      change: number;
    }>;
  };
  channels: Array<{
    channel: string;
    cac: number;
    volume: number;
    quality: number; // 0-10
    scalability: 'high' | 'medium' | 'low';
    timeToScale: number; // months
  }>;
}

/**
 * ブランド認知度
 */
export interface BrandAwareness {
  metrics: {
    aidedAwareness: number; // percentage
    unaided: number;
    brandRecall: number;
    brandRecognition: number;
    shareOfVoice: number;
  };
  channels: Array<{
    channel: string;
    reach: number;
    frequency: number;
    impressions: number;
    cost: number;
    efficiency: number;
  }>;
  campaigns: Array<{
    campaign: string;
    objective: string;
    reach: number;
    impressions: number;
    engagement: number;
    brandLift: number;
  }>;
  tracking: {
    surveys: Array<{
      survey: string;
      respondents: number;
      frequency: string;
      questions: string[];
    }>;
    monitoring: Array<{
      source: string;
      mentions: number;
      sentiment: number; // -1 to 1
      reach: number;
    }>;
  };
  benchmarks: {
    industry: number;
    competitors: Array<{
      competitor: string;
      awareness: number;
      shareOfVoice: number;
    }>;
    targets: Array<{
      metric: string;
      current: number;
      target: number;
      timeline: string;
    }>;
  };
}

/**
 * マーケティングROI
 */
export interface MarketingROI {
  overall: {
    investment: number;
    revenue: number;
    profit: number;
    roi: number;
    paybackPeriod: number; // months
  };
  byChannel: Array<{
    channel: string;
    investment: number;
    revenue: number;
    roi: number;
    confidence: number; // 0-1
  }>;
  byCampaign: Array<{
    campaign: string;
    investment: number;
    revenue: number;
    roi: number;
    attribution: string;
  }>;
  attribution: {
    model: string;
    accuracy: number;
    lastUpdated: Date;
    assumptions: string[];
  };
  forecasting: {
    scenarios: Array<{
      scenario: string;
      investment: number;
      expectedRevenue: number;
      probability: number;
      timeline: string;
    }>;
    sensitivity: Array<{
      variable: string;
      impact: number; // percentage change in ROI
      range: { min: number; max: number };
    }>;
  };
}

/**
 * 競合マーケティング
 */
export interface CompetitiveMarketing {
  competitors: Array<{
    name: string;
    marketingStrategy: string;
    channels: string[];
    messaging: string[];
    strengths: string[];
    weaknesses: string[];
    budget: number;
    shareOfVoice: number;
  }>;
  analysis: {
    positioningMap: Array<{
      competitor: string;
      x: number; // axis 1
      y: number; // axis 2
      quadrant: string;
    }>;
    messagingAnalysis: Array<{
      theme: string;
      ourPosition: string;
      competitorPositions: Record<string, string>;
      opportunity: string;
    }>;
    channelAnalysis: Array<{
      channel: string;
      ourPresence: number; // 0-10
      competitorPresence: Record<string, number>;
      opportunity: string;
    }>;
  };
  intelligence: {
    sources: string[];
    updates: Array<{
      date: Date;
      competitor: string;
      change: string;
      impact: string;
      response: string;
    }>;
    alerts: Array<{
      trigger: string;
      competitors: string[];
      notification: string[];
    }>;
  };
  response: {
    strategy: string;
    tactics: Array<{
      competitor: string;
      threat: string;
      response: string;
      timeline: string;
    }>;
    differentiation: Array<{
      area: string;
      ourAdvantage: string;
      competitorWeakness: string;
      exploitation: string;
    }>;
  };
}

/**
 * プロダクトマーケティング
 */
export interface ProductMarketing {
  positioning: {
    target: string;
    category: string;
    benefit: string;
    reasonToBelieve: string[];
    competitors: string[];
  };
  messaging: {
    value: string;
    pain: string;
    solution: string;
    proof: string[];
    audience: Array<{
      segment: string;
      message: string;
      channels: string[];
    }>;
  };
  goToMarket: {
    strategy: string;
    phases: Array<{
      phase: string;
      duration: string;
      objectives: string[];
      tactics: string[];
      success: string[];
    }>;
    enablement: Array<{
      audience: string;
      materials: string[];
      training: string[];
      support: string[];
    }>;
  };
  launch: {
    timeline: Array<{
      milestone: string;
      date: Date;
      deliverables: string[];
      owner: string;
    }>;
    channels: Array<{
      channel: string;
      content: string[];
      timing: string;
      budget: number;
    }>;
    success: Array<{
      metric: string;
      target: number;
      measurement: string;
    }>;
  };
}

/**
 * イベントマーケティング
 */
export interface EventMarketing {
  strategy: string;
  events: Array<{
    name: string;
    type: 'conference' | 'trade-show' | 'webinar' | 'workshop' | 'meetup' | 'virtual';
    role: 'sponsor' | 'exhibitor' | 'speaker' | 'attendee' | 'host';
    audience: string[];
    objectives: string[];
    budget: number;
    timeline: {
      planning: string;
      execution: string;
      followUp: string;
    };
    deliverables: string[];
    success: Array<{
      metric: string;
      target: number;
    }>;
  }>;
  virtual: {
    platform: string;
    capabilities: string[];
    audience: number;
    engagement: Array<{
      type: string;
      participation: number;
      effectiveness: number;
    }>;
  };
  measurement: {
    preEvent: string[];
    duringEvent: string[];
    postEvent: string[];
    roi: {
      calculation: string;
      timeline: string;
    };
  };
}

/**
 * ソーシャルメディア戦略
 */
export interface SocialMediaStrategy {
  platforms: Array<{
    platform: SocialPlatform;
    objectives: string[];
    audience: {
      size: number;
      demographics: Record<string, unknown>;
      interests: string[];
      behavior: string[];
    };
    content: {
      types: string[];
      frequency: string;
      themes: string[];
      tone: string;
    };
    engagement: {
      strategy: string;
      communities: string[];
      influencers: string[];
      userGenerated: boolean;
    };
    advertising: {
      budget: number;
      objectives: string[];
      targeting: Record<string, unknown>;
      creative: string[];
    };
    metrics: Array<{
      metric: string;
      target: number;
      current: number;
    }>;
  }>;
  crossPlatform: {
    strategy: string;
    synergies: string[];
    campaigns: Array<{
      campaign: string;
      platforms: string[];
      coordination: string;
    }>;
  };
  community: {
    building: string[];
    management: string[];
    growth: string[];
    engagement: string[];
  };
  crisis: {
    monitoring: string[];
    response: string[];
    escalation: string[];
    recovery: string[];
  };
}