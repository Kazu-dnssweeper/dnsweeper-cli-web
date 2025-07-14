/**
 * DNSweeper エンタープライズ認証・Active Directory統合型定義
 * LDAP/SAML認証プロトコル・組織階層・グループポリシー管理対応
 */

import { User, Account, Permission, PermissionResource, PermissionAction } from './auth';

// ===== Active Directory 統合 =====

export interface ActiveDirectoryConfig {
  enabled: boolean;
  domain: string;
  ldapUrl: string;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  userSearchBase: string;
  groupSearchBase: string;
  userSearchFilter: string;
  groupSearchFilter: string;
  userAttributes: LdapUserAttributes;
  groupAttributes: LdapGroupAttributes;
  sslEnabled: boolean;
  certificatePath?: string;
  connectionTimeout: number;
  searchTimeout: number;
}

export interface LdapUserAttributes {
  uid: string;
  cn: string;
  mail: string;
  givenName: string;
  sn: string;
  memberOf: string;
  department: string;
  title: string;
  telephoneNumber: string;
  manager: string;
  employeeId: string;
  accountExpires: string;
}

export interface LdapGroupAttributes {
  cn: string;
  description: string;
  member: string;
  memberOf: string;
  groupType: string;
  distinguishedName: string;
}

// ===== SAML 統合 =====

export interface SamlConfig {
  enabled: boolean;
  idpEntityId: string;
  idpSingleSignOnUrl: string;
  idpSingleLogoutUrl: string;
  idpX509Certificate: string;
  spEntityId: string;
  spAssertionConsumerServiceUrl: string;
  spSingleLogoutServiceUrl: string;
  spX509Certificate: string;
  spPrivateKey: string;
  nameIdFormat: SamlNameIdFormat;
  attributeMapping: SamlAttributeMapping;
  signatureAlgorithm: SamlSignatureAlgorithm;
  digestAlgorithm: SamlDigestAlgorithm;
  encryptAssertions: boolean;
  signRequests: boolean;
  validateSignature: boolean;
  sessionTimeout: number;
}

export type SamlNameIdFormat = 
  | 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  | 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent'
  | 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient';

export interface SamlAttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  title: string;
  groups: string;
  employeeId: string;
  manager: string;
}

export type SamlSignatureAlgorithm = 
  | 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
  | 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
  | 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512';

export type SamlDigestAlgorithm = 
  | 'http://www.w3.org/2000/09/xmldsig#sha1'
  | 'http://www.w3.org/2001/04/xmlenc#sha256'
  | 'http://www.w3.org/2001/04/xmldsig-more#sha384';

// ===== 組織階層・グループ管理 =====

export interface OrganizationUnit {
  id: string;
  name: string;
  description?: string;
  distinguishedName: string;
  parentOuId?: string;
  depth: number;
  children: OrganizationUnit[];
  policies: GroupPolicy[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityGroup {
  id: string;
  name: string;
  description?: string;
  distinguishedName: string;
  groupType: SecurityGroupType;
  scope: SecurityGroupScope;
  ouId: string;
  members: GroupMember[];
  permissions: GroupPermission[];
  policies: GroupPolicy[];
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SecurityGroupType = 'security' | 'distribution' | 'universal';
export type SecurityGroupScope = 'domain_local' | 'global' | 'universal';

export interface GroupMember {
  userId: string;
  userPrincipalName: string;
  displayName: string;
  memberType: GroupMemberType;
  joinedAt: Date;
}

export type GroupMemberType = 'user' | 'group' | 'computer' | 'service_account';

export interface GroupPermission {
  resource: PermissionResource;
  actions: PermissionAction[];
  inherited: boolean;
  inheritedFrom?: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'not_equals' | 'in' | 'not_in';
  value: string | string[];
}

// ===== グループポリシー =====

export interface GroupPolicy {
  id: string;
  name: string;
  description?: string;
  type: GroupPolicyType;
  scope: GroupPolicyScope;
  targetOus: string[];
  targetGroups: string[];
  settings: GroupPolicySettings;
  enforced: boolean;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  lastAppliedAt?: Date;
}

export type GroupPolicyType = 
  | 'security'
  | 'access_control'
  | 'password'
  | 'session'
  | 'application'
  | 'network'
  | 'audit';

export type GroupPolicyScope = 'user' | 'computer' | 'both';

export interface GroupPolicySettings {
  passwordPolicy?: PasswordPolicySettings;
  sessionPolicy?: SessionPolicySettings;
  accessPolicy?: AccessPolicySettings;
  auditPolicy?: AuditPolicySettings;
  applicationPolicy?: ApplicationPolicySettings;
  networkPolicy?: NetworkPolicySettings;
}

export interface PasswordPolicySettings {
  minimumLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  maxAge: number;
  minAge: number;
  historyCount: number;
  lockoutThreshold: number;
  lockoutDuration: number;
  resetLockoutAfter: number;
}

export interface SessionPolicySettings {
  maxSessionDuration: number;
  idleTimeout: number;
  concurrentSessionLimit: number;
  requireMfa: boolean;
  trustedLocations: string[];
  blockedCountries: string[];
  deviceRegistrationRequired: boolean;
  sessionPersistence: boolean;
}

export interface AccessPolicySettings {
  defaultPermissions: Permission[];
  restrictedResources: string[];
  allowedTimeRanges: TimeRange[];
  ipWhitelist: string[];
  ipBlacklist: string[];
  requireApprovalFor: PermissionResource[];
  emergencyAccess: EmergencyAccessSettings;
}

export interface TimeRange {
  dayOfWeek: number[];
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface EmergencyAccessSettings {
  enabled: boolean;
  approverGroups: string[];
  maxDuration: number;
  auditRequired: boolean;
  breakGlassUsers: string[];
}

export interface AuditPolicySettings {
  logLevel: 'minimal' | 'standard' | 'detailed' | 'verbose';
  loggedEvents: AuditEvent[];
  retentionDays: number;
  exportEnabled: boolean;
  siemIntegration: boolean;
  realTimeAlertsEnabled: boolean;
  alertThresholds: AlertThreshold[];
}

export type AuditEvent = 
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'password_change'
  | 'account_locked'
  | 'permission_granted'
  | 'permission_denied'
  | 'resource_access'
  | 'data_export'
  | 'settings_change'
  | 'policy_change';

export interface AlertThreshold {
  event: AuditEvent;
  count: number;
  timeWindow: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ApplicationPolicySettings {
  allowedApplications: string[];
  blockedApplications: string[];
  applicationPermissions: ApplicationPermission[];
  dataLossPrevention: DlpSettings;
  privilegedAccessManagement: PamSettings;
}

export interface ApplicationPermission {
  applicationId: string;
  permissions: string[];
  restrictions: ApplicationRestriction[];
}

export interface ApplicationRestriction {
  type: 'time' | 'location' | 'device' | 'network';
  conditions: Record<string, any>;
}

export interface DlpSettings {
  enabled: boolean;
  blockFileDownloads: boolean;
  blockScreenshots: boolean;
  watermarkEnabled: boolean;
  encryptionRequired: boolean;
  classificationRequired: boolean;
}

export interface PamSettings {
  enabled: boolean;
  requireApproval: boolean;
  approverGroups: string[];
  sessionRecording: boolean;
  passwordVaulting: boolean;
  justInTimeAccess: boolean;
}

export interface NetworkPolicySettings {
  allowedNetworks: string[];
  blockedNetworks: string[];
  vpnRequired: boolean;
  dnsPolicies: DnsPolicyRule[];
  firewallRules: FirewallRule[];
}

export interface DnsPolicyRule {
  name: string;
  domains: string[];
  action: 'allow' | 'block' | 'redirect';
  redirectTarget?: string;
  logEnabled: boolean;
}

export interface FirewallRule {
  name: string;
  protocol: 'tcp' | 'udp' | 'icmp' | 'any';
  sourceIps: string[];
  destinationIps: string[];
  ports: string[];
  action: 'allow' | 'deny';
  priority: number;
}

// ===== SSO・認証フロー =====

export interface SsoConfig {
  enabled: boolean;
  provider: SsoProvider;
  activeDirectory?: ActiveDirectoryConfig;
  saml?: SamlConfig;
  oauth?: OAuthConfig;
  fallbackToLocal: boolean;
  accountLinking: AccountLinkingConfig;
  sessionManagement: SsoSessionConfig;
}

export type SsoProvider = 'active_directory' | 'saml' | 'oauth2' | 'oidc' | 'mixed';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  redirectUri: string;
  responseType: string;
  grantType: string;
}

export interface AccountLinkingConfig {
  enabled: boolean;
  strategy: 'automatic' | 'manual' | 'disabled';
  matchingRules: AccountMatchingRule[];
  conflictResolution: 'merge' | 'prefer_external' | 'prefer_local' | 'manual';
}

export interface AccountMatchingRule {
  field: 'email' | 'employee_id' | 'username';
  required: boolean;
  caseSensitive: boolean;
}

export interface SsoSessionConfig {
  singleLogout: boolean;
  sessionSynchronization: boolean;
  tokenRefreshEnabled: boolean;
  refreshTokenRotation: boolean;
  crossDomainSupport: boolean;
}

// ===== 拡張ユーザー・アカウント型 =====

export interface EnterpriseUser extends User {
  employeeId?: string;
  userPrincipalName?: string;
  distinguishedName?: string;
  department?: string;
  title?: string;
  manager?: string;
  telephoneNumber?: string;
  location?: string;
  costCenter?: string;
  organizationUnit?: OrganizationUnit;
  securityGroups: SecurityGroup[];
  directReports: EnterpriseUser[];
  managerChain: EnterpriseUser[];
  lastPasswordChange?: Date;
  passwordExpiration?: Date;
  accountExpiration?: Date;
  lastAdSync?: Date;
  adSourceSystem?: string;
  certificationStatus?: CertificationStatus;
  complianceFlags: ComplianceFlag[];
}

export interface CertificationStatus {
  certified: boolean;
  certifiedAt?: Date;
  certifiedBy?: string;
  nextCertificationDue?: Date;
  certificationLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface ComplianceFlag {
  type: ComplianceFlagType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionComment?: string;
}

export type ComplianceFlagType = 
  | 'password_expired'
  | 'account_expired'
  | 'certification_overdue'
  | 'excessive_permissions'
  | 'dormant_account'
  | 'policy_violation'
  | 'suspicious_activity'
  | 'data_access_violation';

export interface EnterpriseAccount extends Account {
  domainName?: string;
  activeDirectoryEnabled: boolean;
  samlEnabled: boolean;
  ssoConfig: SsoConfig;
  organizationUnits: OrganizationUnit[];
  securityGroups: SecurityGroup[];
  groupPolicies: GroupPolicy[];
  complianceSettings: ComplianceSettings;
  auditSettings: AuditSettings;
  dataClassification: DataClassificationSettings;
}

export interface ComplianceSettings {
  frameworks: ComplianceFramework[];
  dataRetentionPolicies: DataRetentionPolicy[];
  encryptionSettings: EncryptionSettings;
  accessReviewSettings: AccessReviewSettings;
  riskManagement: RiskManagementSettings;
}

export type ComplianceFramework = 
  | 'sox'
  | 'gdpr'
  | 'hipaa'
  | 'pci_dss'
  | 'iso27001'
  | 'nist'
  | 'cis'
  | 'custom';

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number;
  archivalPeriod: number;
  deletionMethod: 'soft' | 'hard' | 'crypto_shredding';
  legalHoldExemption: boolean;
  geoLocation?: string;
}

export interface EncryptionSettings {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  keyManagement: KeyManagementSettings;
  algorithmSettings: EncryptionAlgorithmSettings;
}

export interface KeyManagementSettings {
  provider: 'internal' | 'aws_kms' | 'azure_key_vault' | 'hashicorp_vault';
  rotationInterval: number;
  escrowEnabled: boolean;
  hsmRequired: boolean;
}

export interface EncryptionAlgorithmSettings {
  symmetric: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  asymmetric: 'rsa-4096' | 'ecc-p384' | 'ed25519';
  hashing: 'sha-256' | 'sha-384' | 'sha-512' | 'blake3';
}

export interface AccessReviewSettings {
  enabled: boolean;
  reviewInterval: number;
  automaticCertification: boolean;
  reviewerGroups: string[];
  escalationRules: EscalationRule[];
  riskBasedReviews: boolean;
}

export interface EscalationRule {
  condition: string;
  escalateToGroups: string[];
  escalationDelay: number;
  automaticRevocation: boolean;
}

export interface RiskManagementSettings {
  riskScoringEnabled: boolean;
  riskThresholds: RiskThreshold[];
  riskMitigation: RiskMitigationRule[];
  continuousMonitoring: boolean;
}

export interface RiskThreshold {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  actions: RiskAction[];
}

export type RiskAction = 
  | 'log'
  | 'alert'
  | 'review'
  | 'revoke'
  | 'mfa_required'
  | 'approval_required';

export interface RiskMitigationRule {
  riskType: string;
  triggers: string[];
  actions: RiskAction[];
  automationEnabled: boolean;
}

export interface AuditSettings {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed' | 'verbose';
  realTimeMonitoring: boolean;
  siemIntegration: SiemIntegrationSettings;
  retentionSettings: AuditRetentionSettings;
  exportSettings: AuditExportSettings;
}

export interface SiemIntegrationSettings {
  enabled: boolean;
  provider: 'splunk' | 'qradar' | 'sentinel' | 'sumo_logic' | 'custom';
  endpoint: string;
  format: 'cef' | 'leef' | 'json' | 'syslog';
  authentication: SiemAuthSettings;
}

export interface SiemAuthSettings {
  method: 'api_key' | 'oauth' | 'certificate' | 'basic';
  credentials: Record<string, string>;
}

export interface AuditRetentionSettings {
  defaultRetention: number;
  criticalEventRetention: number;
  archivalSettings: ArchivalSettings;
  legalHoldSettings: LegalHoldSettings;
}

export interface ArchivalSettings {
  enabled: boolean;
  archivalThreshold: number;
  archivalLocation: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface LegalHoldSettings {
  enabled: boolean;
  indefiniteRetention: boolean;
  notificationEnabled: boolean;
  approverGroups: string[];
}

export interface AuditExportSettings {
  enabled: boolean;
  scheduledExports: ScheduledExport[];
  onDemandExports: boolean;
  supportedFormats: string[];
}

export interface ScheduledExport {
  name: string;
  schedule: string;
  format: string;
  destination: string;
  filters: AuditFilter[];
}

export interface AuditFilter {
  field: string;
  operator: string;
  value: any;
}

export interface DataClassificationSettings {
  enabled: boolean;
  classificationLevels: DataClassificationLevel[];
  labelingRequired: boolean;
  automaticClassification: boolean;
  dlpIntegration: boolean;
}

export interface DataClassificationLevel {
  id: string;
  name: string;
  description: string;
  sensitivity: number;
  handlingInstructions: string[];
  accessRestrictions: AccessRestriction[];
  retentionPolicy: string;
}

export interface AccessRestriction {
  type: 'location' | 'time' | 'device' | 'network' | 'clearance';
  conditions: Record<string, any>;
}

// ===== API リクエスト・レスポンス型 =====

export interface EnterpriseLoginRequest {
  credentials: LoginCredentials;
  ssoProvider?: SsoProvider;
  domain?: string;
}

export type LoginCredentials = 
  | LocalCredentials
  | SamlCredentials
  | OAuthCredentials
  | AdCredentials;

export interface LocalCredentials {
  type: 'local';
  email: string;
  password: string;
}

export interface SamlCredentials {
  type: 'saml';
  samlResponse: string;
  relayState?: string;
}

export interface OAuthCredentials {
  type: 'oauth';
  authorizationCode: string;
  state: string;
}

export interface AdCredentials {
  type: 'active_directory';
  userPrincipalName: string;
  password: string;
  domain: string;
}

export interface EnterpriseLoginResponse {
  user: EnterpriseUser;
  account: EnterpriseAccount;
  session: EnterpriseSession;
  permissions: Permission[];
  groupMemberships: SecurityGroup[];
  appliedPolicies: GroupPolicy[];
}

export interface EnterpriseSession {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  sessionId: string;
  ssoSessionId?: string;
  authenticationMethod: string;
  riskScore: number;
  deviceInfo: DeviceInfo;
  locationInfo: LocationInfo;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  isManaged: boolean;
  isTrusted: boolean;
  lastSeen: Date;
}

export interface LocationInfo {
  ipAddress: string;
  country: string;
  region: string;
  city: string;
  isTrusted: boolean;
  vpnDetected: boolean;
  riskScore: number;
}

// ===== コンテキスト型 =====

export interface EnterpriseAuthContextType {
  user: EnterpriseUser | null;
  account: EnterpriseAccount | null;
  session: EnterpriseSession | null;
  permissions: Permission[];
  groupMemberships: SecurityGroup[];
  appliedPolicies: GroupPolicy[];
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // 認証メソッド
  login: (request: EnterpriseLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // 権限・アクセス制御
  hasPermission: (resource: PermissionResource, action: PermissionAction, conditions?: Record<string, any>) => boolean;
  hasGroupMembership: (groupName: string) => boolean;
  getPolicyValue: (policyType: GroupPolicyType, setting: string) => any;
  
  // セッション管理
  extendSession: () => Promise<void>;
  getSessionRisk: () => number;
  updateDeviceInfo: (deviceInfo: Partial<DeviceInfo>) => void;
  
  // 監査・コンプライアンス
  logAuditEvent: (event: AuditEvent, details: Record<string, any>) => void;
  getComplianceStatus: () => Promise<ComplianceStatus>;
  
  // Active Directory統合
  syncWithAd: () => Promise<void>;
  getAdUserInfo: () => Promise<AdUserInfo>;
  updateAdAttributes: (attributes: Partial<LdapUserAttributes>) => Promise<void>;
}

export interface ComplianceStatus {
  overall: 'compliant' | 'non_compliant' | 'at_risk';
  frameworks: FrameworkComplianceStatus[];
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
  lastAssessment: Date;
}

export interface FrameworkComplianceStatus {
  framework: ComplianceFramework;
  status: 'compliant' | 'non_compliant' | 'partial';
  score: number;
  violations: number;
  lastAudit: Date;
}

export interface ComplianceViolation {
  id: string;
  framework: ComplianceFramework;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  detectedAt: Date;
  dueDate: Date;
  responsible: string;
}

export interface ComplianceRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  impact: string;
  frameworks: ComplianceFramework[];
}

export interface AdUserInfo {
  distinguishedName: string;
  userPrincipalName: string;
  samAccountName: string;
  attributes: LdapUserAttributes;
  groupMemberships: string[];
  lastLogon: Date;
  accountExpires: Date;
  pwdLastSet: Date;
  badPwdCount: number;
  lockoutTime: Date;
}