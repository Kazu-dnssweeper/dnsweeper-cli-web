/**
 * 地域別コンプライアンス管理システム - 型定義
 */

export interface ComplianceFramework {
  id: string;
  name: string;
  region: string;
  jurisdiction: string;
  version: string;
  effectiveDate: Date;
  lastUpdated: Date;
  status: 'active' | 'deprecated' | 'pending';
  requirements: ComplianceRequirement[];
  penalties: CompliancePenalty[];
  exemptions: ComplianceExemption[];
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  category:
    | 'data-protection'
    | 'data-localization'
    | 'audit-logging'
    | 'encryption'
    | 'consent'
    | 'notification'
    | 'access-rights';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  implementationDeadline?: Date;
  isCompliant: boolean;
  compliancePercentage: number;
  evidenceRequired: string[];
  implementationSteps: string[];
  technicalControls: TechnicalControl[];
  businessControls: BusinessControl[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface TechnicalControl {
  id: string;
  type:
    | 'encryption'
    | 'access-control'
    | 'logging'
    | 'monitoring'
    | 'backup'
    | 'network-security';
  name: string;
  description: string;
  implementation: string;
  isImplemented: boolean;
  effectiveness: number; // 0-100%
  lastVerified: Date;
  nextVerification: Date;
}

export interface BusinessControl {
  id: string;
  type:
    | 'policy'
    | 'training'
    | 'process'
    | 'contract'
    | 'assessment'
    | 'incident-response';
  name: string;
  description: string;
  implementation: string;
  isImplemented: boolean;
  effectiveness: number; // 0-100%
  lastReview: Date;
  nextReview: Date;
}

export interface CompliancePenalty {
  type: 'monetary' | 'operational' | 'reputational';
  description: string;
  amount?: number;
  currency?: string;
  maxAmount?: number;
  conditions: string[];
}

export interface ComplianceExemption {
  id: string;
  title: string;
  description: string;
  conditions: string[];
  validUntil?: Date;
  applicableRequirements: string[];
}

export interface ComplianceAssessment {
  id: string;
  frameworkId: string;
  assessmentDate: Date;
  assessor: string;
  overallScore: number; // 0-100%
  requirementScores: Map<string, number>;
  gaps: ComplianceGap[];
  recommendations: ComplianceRecommendation[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  nextAssessmentDate: Date;
  status: 'completed' | 'in-progress' | 'planned';
}

export interface ComplianceGap {
  id: string;
  requirementId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  currentState: string;
  requiredState: string;
  recommendations: string[];
  estimatedEffort: number; // 時間（時）
  estimatedCost: number;
  deadline?: Date;
  assignedTo?: string;
  status: 'identified' | 'in-remediation' | 'resolved' | 'accepted-risk';
}

export interface ComplianceRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'technical' | 'process' | 'policy' | 'training';
  title: string;
  description: string;
  implementation: string;
  estimatedEffort: number;
  estimatedCost: number;
  expectedBenefit: string;
  riskReduction: number; // 0-100%
}

export interface ComplianceAction {
  id: string;
  gapId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  progress: number; // 0-100%
  estimatedHours: number;
  actualHours?: number;
  blockers: string[];
  dependencies: string[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface ComplianceReport {
  id: string;
  type: 'assessment' | 'gap-analysis' | 'remediation' | 'certification';
  frameworkId: string;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  overallCompliance: number; // 0-100%
  complianceByCategory: Map<string, number>;
  criticalGaps: number;
  totalGaps: number;
  resolvedGaps: number;
  overduActions: number;
  totalActions: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  recommendations: ComplianceRecommendation[];
  executiveSummary: string;
  detailedFindings: string;
  actionPlan: string;
  certification?: ComplianceCertification;
}

export interface ComplianceCertification {
  id: string;
  frameworkId: string;
  certificateNumber: string;
  issuedBy: string;
  issuedAt: Date;
  validUntil: Date;
  scope: string;
  conditions: string[];
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  assessmentReportId: string;
}

export interface RegionalComplianceManagerOptions {
  enableAutomaticAssessment?: boolean;
  assessmentInterval?: number;
  enableAlerts?: boolean;
  alertThresholds?: {
    complianceScore: number;
    criticalGaps: number;
    overdueActions: number;
  };
  enableReporting?: boolean;
  reportingInterval?: number;
  enableDataProcessingLog?: boolean;
  enableIncidentTracking?: boolean;
  enableCertificationManagement?: boolean;
  auditLogPath?: string;
  dataPath?: string;
}

export interface ComplianceAuditLog {
  id: string;
  timestamp: Date;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  details: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'error';
  errorMessage?: string;
}

export interface DataProcessingRecord {
  id: string;
  timestamp: Date;
  processingPurpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  retentionPeriod: number; // days
  legalBasis: string;
  safeguards: string[];
  isInternationalTransfer: boolean;
  transferCountries?: string[];
  transferSafeguards?: string[];
  dataProcessorId?: string;
  consentId?: string;
  isActive: boolean;
}

export interface ComplianceIncident {
  id: string;
  type:
    | 'data-breach'
    | 'compliance-violation'
    | 'system-failure'
    | 'process-failure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  reportedAt: Date;
  reportedBy: string;
  detectedAt?: Date;
  description: string;
  affectedSystems: string[];
  affectedData: string[];
  estimatedImpact: string;
  rootCause?: string;
  immediateActions: string[];
  remediationPlan: string;
  preventiveActions: string[];
  notificationRequired: boolean;
  notificationDeadline?: Date;
  notificationStatus?: 'pending' | 'notified' | 'overdue';
  regulatorNotified?: boolean;
  affectedIndividualsNotified?: boolean;
  lastUpdated: Date;
  resolvedAt?: Date;
  lessons: string[];
}
