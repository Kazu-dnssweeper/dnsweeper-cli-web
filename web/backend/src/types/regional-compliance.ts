/**
 * DNSweeper 地域別規制対応型定義
 * 中国・ロシア・インド・中東地域の法規制準拠
 */

/**
 * コンプライアンス地域
 */
export type ComplianceRegion = 
  | 'CN'  // 中国
  | 'RU'  // ロシア
  | 'IN'  // インド
  | 'AE'  // UAE
  | 'SA'  // サウジアラビア
  | 'EU'  // EU（GDPR）
  | 'US'; // 米国（CCPA等）

/**
 * 地域別コンプライアンス設定
 */
export interface RegionalCompliance {
  region: ComplianceRegion;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
  dataLocalization: {
    required: boolean;
    dataTypes: string[];
    storageLocation: string;
    exceptions?: string[];
    mirroringRequired?: boolean;
    adequacyDecisions?: string[];
    transferMechanisms?: string[];
  };
  privacyRequirements: {
    consentRequired: boolean;
    explicitConsent?: boolean;
    withdrawalRights?: boolean;
    minorProtection?: boolean;
    minorAgeThreshold?: number;
    dataMinimization?: boolean;
    purposeLimitation?: boolean;
    retentionLimits?: {
      personal: number;    // days
      sensitive: number;   // days
      transactional: number; // days
    };
    dataSubjectRights?: {
      access: boolean;
      rectification: boolean;
      erasure: boolean;
      portability: boolean;
      objection: boolean;
      automatedDecisionMaking?: boolean;
    };
    crossBorderTransfer?: {
      allowed: boolean;
      conditions?: string[];
    };
    privacyNotice?: {
      required: boolean;
      languages: string | string[];
      accessibility?: boolean;
    };
    languageRequirements?: string[];
    childrenProtection?: {
      enabled: boolean;
      ageThreshold: number;
      parentalConsent: boolean;
      ageVerification?: boolean;
    };
  };
  securityRequirements: {
    encryptionRequired: boolean;
    encryptionStandards?: string[];
    penetrationTesting?: boolean;
    certificationRequired?: boolean;
    incidentReporting?: boolean;
    incidentReportingDeadline?: number; // hours
    backupRequired?: boolean;
    nationalStandards?: boolean;
    cloudRestrictions?: boolean;
    dataProtectionOfficer?: boolean;
    privacyByDesign?: boolean;
    impactAssessment?: boolean;
    breachNotification?: {
      authority?: number; // hours
      individuals?: number; // hours
    };
    pseudonymization?: boolean;
    confidentiality?: boolean;
    integrity?: boolean;
    availability?: boolean;
    resilience?: boolean;
    auditRequired?: boolean;
    auditFrequency?: number; // days
    reasonableSecurity?: boolean;
    encryptionRecommended?: boolean;
  };
  operationalRequirements: {
    localEntity?: boolean;
    localRepresentative?: boolean;
    licenseRequired?: boolean;
    licenses?: string[];
    governmentAccess?: boolean;
    registrationRequired?: boolean;
    culturalCompliance?: boolean;
    islamicLawCompliance?: boolean;
    localDataCenter?: boolean;
    womenDataProtection?: boolean;
    representativeRequired?: string[];
    recordsOfProcessing?: boolean;
    accountability?: boolean;
    privacyPolicy?: boolean;
    tollFreeNumber?: boolean;
    onlineRequest?: boolean;
    verificationProcess?: boolean;
    recordKeeping?: number; // months
    significantDataFiduciary?: {
      threshold: string;
      additionalObligations: boolean;
    };
    sandbox?: {
      available: boolean;
      duration: number; // days
    };
    dataRetention?: {
      metadata: number; // days
      content: number; // days
    };
  };
  status: 'active' | 'draft' | 'pending' | 'deprecated';
  effectiveDate: Date;
  lastUpdated: Date;
  penalties?: {
    min: number;
    max: number;
    currency: string;
    description?: string;
  };
  thresholds?: {
    revenue?: number;
    consumers?: number;
    dataShare?: number;
  };
}

/**
 * コンプライアンス要件
 */
export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: 'data-localization' | 'privacy' | 'security' | 'operational' | 'identity' | 'content' | 'registration' | 'data-transfer' | 'data-retention' | 'license';
  mandatory: boolean;
  deadline?: Date;
  penalties?: {
    min: number;
    max: number;
    currency: string;
    description?: string;
  };
  references?: string[];
  dataCategories?: string[];
  sectors?: string[];
  approvalRequired?: boolean;
  conditional?: boolean;
  ageThreshold?: number;
  retentionPeriod?: number;
  certificationRequired?: boolean;
}

/**
 * データローカリゼーション設定
 */
export interface DataLocalization {
  region: ComplianceRegion;
  dataCenter: {
    primary: string;
    secondary?: string[];
    provider: string;
    certifications: string[];
  };
  dataTypes: {
    [key: string]: {
      required: boolean;
      location: string;
    };
  };
  transferRestrictions: {
    crossBorder: 'allowed' | 'conditional' | 'prohibited';
    exceptions?: string[];
    approvalProcess?: string;
    conditions?: string[];
    blockedCountries?: string[];
    criticalData?: string;
    sensitiveData?: string;
  };
  backupStrategy: {
    frequency: string;
    retention: number; // days
    location: string;
    encryption: string;
    mirrorSync?: boolean;
  };
}

/**
 * プライバシー規制
 */
export interface PrivacyRegulation {
  consentRequirements: {
    explicit: boolean;
    granular?: boolean;
    withdrawable?: boolean;
    separateConsents?: string[];
    written?: boolean;
    notarized?: string[];
    retentionPeriod?: string;
  };
  dataSubjectRights: {
    access: { enabled: boolean; responseTime: number };
    rectification: { enabled: boolean; responseTime: number };
    deletion?: { enabled: boolean; responseTime: number; exceptions?: string[] };
    erasure?: { enabled: boolean; responseTime: number };
    portability?: { enabled: boolean };
    objection?: { enabled: boolean };
    restriction?: { enabled: boolean };
  };
  minorProtection?: {
    enabled: boolean;
    ageThreshold: number;
    parentalConsent: boolean;
    specialProtections?: string[];
  };
  marketingRestrictions?: {
    optIn: boolean;
    separateConsent: boolean;
    frequency: string;
    unsubscribe: string;
  };
  specialCategories?: {
    prohibited: boolean;
    requiresExplicitConsent: boolean;
    additionalSafeguards: boolean;
  };
}

/**
 * セキュリティ標準
 */
export interface SecurityStandard {
  name: string;
  description: string;
  level?: number;
  requirements: string[];
  certificationRequired?: boolean;
  certificationBody?: string;
  auditFrequency?: number; // days
}

/**
 * コンプライアンス状態
 */
export interface ComplianceStatus {
  region: ComplianceRegion;
  compliant: boolean;
  violations: ComplianceViolation[];
  warnings: string[];
  recommendations: string[];
  risk: 'low' | 'medium' | 'high' | 'critical';
  lastChecked: Date;
  nextReview: Date;
  certificationsRequired: string[];
  certificationsObtained: string[];
}

/**
 * コンプライアンス違反
 */
export interface ComplianceViolation {
  id: string;
  region: ComplianceRegion;
  requirement: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  deadline?: Date;
  remediation?: string;
  responsibleParty?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'accepted';
}

/**
 * コンプライアンス監査
 */
export interface ComplianceAudit {
  id: string;
  region: ComplianceRegion;
  auditDate: Date;
  auditor: string;
  scope: string[];
  findings: any[];
  recommendations: string[];
  overallCompliance: boolean;
  nextAuditDate: Date;
  certificateValid: boolean;
  certificateExpiry?: Date;
}

/**
 * コンプライアンスレポート
 */
export interface ComplianceReport {
  id: string;
  region: ComplianceRegion;
  reportDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  complianceStatus: ComplianceStatus | undefined;
  dataLocalization: {
    implemented: boolean;
    dataCenter: string;
    dataTypes: string[];
  };
  privacyCompliance: {
    consentMechanism: string;
    dataSubjectRights: string;
    breachNotification: string;
  };
  securityCompliance: {
    encryption: string;
    certifications: string[];
    penetrationTesting: Date;
    incidentResponse: string;
  };
  operationalCompliance: {
    localEntity: boolean;
    localRepresentative: boolean;
    licenses: string[];
    policies: string[];
  };
  violations: ComplianceViolation[];
  remediationPlan: Array<{
    violation: string;
    action: string;
    deadline: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedCost?: number;
  }>;
  executiveSummary: string;
  recommendations: string[];
}

/**
 * データ分類
 */
export interface DataClassification {
  category: 'public' | 'internal' | 'confidential' | 'restricted' | 'critical';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  personalData: boolean;
  specialCategories?: string[];
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  accessRestrictions: string[];
  geographicRestrictions?: ComplianceRegion[];
}

/**
 * 越境データ転送
 */
export interface CrossBorderTransfer {
  id: string;
  sourceRegion: ComplianceRegion;
  destinationRegion: ComplianceRegion;
  dataTypes: string[];
  volume: number; // MB
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  legalBasis: string;
  safeguards: string[];
  approvals: Array<{
    authority: string;
    approvalDate: Date;
    validUntil: Date;
    conditions?: string[];
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

/**
 * 政府アクセス要求
 */
export interface GovernmentAccessRequest {
  id: string;
  region: ComplianceRegion;
  authority: string;
  requestDate: Date;
  legalBasis: string;
  dataRequested: string[];
  scope: {
    users?: string[];
    dateRange?: { start: Date; end: Date };
    dataTypes: string[];
  };
  response: {
    complied: boolean;
    partialCompliance?: boolean;
    dataProvided?: string[];
    responseDate?: Date;
    challenges?: string[];
  };
  status: 'pending' | 'complied' | 'challenged' | 'rejected';
}

/**
 * ライセンス管理
 */
export interface ComplianceLicense {
  id: string;
  region: ComplianceRegion;
  type: string;
  licenseNumber: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate: Date;
  scope: string[];
  conditions: string[];
  renewalRequired: boolean;
  renewalDeadline?: Date;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  documents: Array<{
    name: string;
    url: string;
    uploadDate: Date;
  }>;
}

/**
 * データ保持ポリシー
 */
export interface DataRetentionPolicy {
  region: ComplianceRegion;
  dataType: string;
  retentionPeriod: {
    active: number;      // days
    archive: number;     // days
    deletion: number;    // days after archive
  };
  legalBasis: string;
  exceptions: Array<{
    condition: string;
    additionalPeriod: number;
  }>;
  deletionMethod: 'soft' | 'hard' | 'anonymization';
  backupInclusion: boolean;
  auditTrail: boolean;
}

/**
 * プライバシー影響評価
 */
export interface PrivacyImpactAssessment {
  id: string;
  region: ComplianceRegion;
  project: string;
  assessmentDate: Date;
  assessor: string;
  dataProcessing: {
    purpose: string;
    dataTypes: string[];
    volume: string;
    retention: number;
    sharing: string[];
  };
  risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  consultationRequired: boolean;
  authorityConsulted?: string;
  recommendations: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'conditional';
}

/**
 * インシデント報告
 */
export interface ComplianceIncident {
  id: string;
  region: ComplianceRegion;
  incidentDate: Date;
  detectionDate: Date;
  reportedDate?: Date;
  type: 'breach' | 'violation' | 'unauthorized-access' | 'data-loss' | 'system-failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedData: {
    types: string[];
    recordsCount: number;
    users: string[];
  };
  cause: string;
  response: {
    containment: string;
    eradication?: string;
    recovery?: string;
    lessonsLearned?: string;
  };
  notifications: Array<{
    recipient: 'authority' | 'users' | 'public';
    date: Date;
    method: string;
    content?: string;
  }>;
  status: 'open' | 'contained' | 'resolved' | 'closed';
}

/**
 * コンプライアンストレーニング
 */
export interface ComplianceTraining {
  id: string;
  region: ComplianceRegion[];
  title: string;
  description: string;
  targetAudience: string[];
  topics: string[];
  duration: number; // minutes
  frequency: 'once' | 'annual' | 'biannual' | 'quarterly';
  mandatory: boolean;
  completion: {
    required: number; // percentage
    deadline?: Date;
    reminders: boolean;
  };
  tracking: {
    enrolled: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  materials: Array<{
    type: 'video' | 'document' | 'quiz' | 'interactive';
    title: string;
    url: string;
    duration?: number;
  }>;
  assessment?: {
    required: boolean;
    passingScore: number;
    retakeAllowed: boolean;
    certificateIssued: boolean;
  };
}

/**
 * サードパーティ評価
 */
export interface ThirdPartyAssessment {
  id: string;
  vendor: string;
  assessmentDate: Date;
  regions: ComplianceRegion[];
  scope: string[];
  findings: {
    dataHandling: 'compliant' | 'partial' | 'non-compliant';
    security: 'compliant' | 'partial' | 'non-compliant';
    privacy: 'compliant' | 'partial' | 'non-compliant';
    crossBorderTransfer: 'compliant' | 'partial' | 'non-compliant';
  };
  risks: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
  }>;
  contractualSafeguards: string[];
  approvalStatus: 'approved' | 'conditional' | 'rejected';
  reassessmentDate: Date;
}