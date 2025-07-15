/**
 * 地域別DNS管理システム - 型定義
 *
 * 地域DNS設定、パフォーマンス、コンプライアンス関連の型定義
 */

export interface RegionalDNSConfig {
  region: string;
  name: string;
  primaryDNS: string[];
  secondaryDNS: string[];
  localDNS: string[];
  cdnPreferences: string[];
  optimizationTargets: string[];
  securityFeatures: string[];
  performanceTargets: {
    responseTime: number;
    uptime: number;
    throughput: number;
  };
  complianceRequirements: {
    dataLocalization: boolean;
    encryptionRequired: boolean;
    auditLogging: boolean;
    retentionPeriod: number;
  };
  businessHours: {
    timezone: string;
    start: string;
    end: string;
    days: string[];
  };
  supportedLanguages: string[];
}

export interface DNSOptimizationStrategy {
  strategy: string;
  description: string;
  applicableRegions: string[];
  performanceImpact: {
    responseTime: number;
    uptime: number;
    throughput: number;
  };
  implementationComplexity: 'low' | 'medium' | 'high';
  estimatedCost: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
}

export interface ComplianceCheck {
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'partially-compliant';
  details: string;
  actionRequired: string[];
  riskLevel: 'low' | 'medium' | 'high';
  deadline?: Date;
}

export interface RegionalPerformanceMetrics {
  region: string;
  averageResponseTime: number;
  uptime: number;
  throughput: number;
  errorRate: number;
  complianceScore: number;
  lastUpdated: Date;
  trends: {
    responseTime: number[];
    uptime: number[];
    throughput: number[];
  };
}

export interface RegionalDNSManagerOptions {
  defaultRegion?: string;
  autoDetectRegion?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableComplianceChecking?: boolean;
  enableAutomaticOptimization?: boolean;
  optimizationInterval?: number;
  performanceThresholds?: {
    responseTime: number;
    uptime: number;
    throughput: number;
  };
  complianceCheckInterval?: number;
  enableAlerts?: boolean;
  alertThresholds?: {
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
}

export interface DNSOptimizationResult {
  region: string;
  strategy: string;
  performanceImprovement: {
    responseTime: number;
    uptime: number;
    throughput: number;
  };
  implementationSteps: string[];
  estimatedCompletionTime: number;
  riskAssessment: {
    technicalRisk: 'low' | 'medium' | 'high';
    businessRisk: 'low' | 'medium' | 'high';
    mitigationStrategies: string[];
  };
  costEstimate: {
    initialCost: number;
    operationalCost: number;
    currency: string;
  };
}

export interface RegionalComplianceReport {
  region: string;
  overallScore: number;
  checks: ComplianceCheck[];
  actionItems: {
    high: string[];
    medium: string[];
    low: string[];
  };
  recommendations: string[];
  nextReviewDate: Date;
  certificationStatus: {
    iso27001: boolean;
    soc2: boolean;
    gdpr: boolean;
    ccpa: boolean;
  };
}

export interface DNSPerformanceReport {
  region: string;
  metrics: RegionalPerformanceMetrics;
  benchmarkComparison: {
    industry: number;
    competitors: number[];
    bestPractice: number;
  };
  trends: {
    period: string;
    improvement: number;
    degradation: number;
  };
  recommendations: string[];
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface RegionalAlert {
  id: string;
  region: string;
  type: 'performance' | 'compliance' | 'security' | 'operational';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  affectedServices: string[];
  actionRequired: string[];
  estimatedResolutionTime?: number;
  assignedTo?: string;
}

export interface RegionalStatistics {
  totalRegions: number;
  activeRegions: number;
  averagePerformance: {
    responseTime: number;
    uptime: number;
    throughput: number;
  };
  complianceOverview: {
    compliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
  };
  alertSummary: {
    active: number;
    critical: number;
    acknowledged: number;
  };
  optimizationOpportunities: number;
}
