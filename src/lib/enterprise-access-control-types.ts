/**
 * 企業級アクセス制御システム - 型定義
 */

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  tenantIds: string[];
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'disabled';
  loginAttempts: number;
  lockoutUntil?: Date;
  passwordChangedAt: Date;
  sessionTimeout: number;
  ipWhitelist: string[];
  deviceFingerprints: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  tenantId?: string;
  organizationId?: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: {
    [key: string]: unknown;
  };
  isSystemPermission: boolean;
}

export interface AuditEvent {
  id: string;
  userId: string;
  userEmail: string;
  tenantId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  riskScore: number;
  metadata: {
    [key: string]: unknown;
  };
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  tenantId?: string;
  organizationId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'require-mfa';
  priority: number;
  parameters: {
    [key: string]: unknown;
  };
}

export interface AccessRequest {
  id: string;
  userId: string;
  resource: string;
  action: string;
  tenantId?: string;
  organizationId?: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  timestamp: Date;
  context: {
    [key: string]: unknown;
  };
}

export interface AccessResponse {
  granted: boolean;
  reason?: string;
  requiredMfa?: boolean;
  warnings: string[];
  policies: string[];
  riskScore: number;
  sessionTimeout?: number;
  additionalChecks?: string[];
}

export interface ComplianceReport {
  id: string;
  type: 'access' | 'audit' | 'security' | 'compliance';
  tenantId?: string;
  organizationId?: string;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalEvents: number;
    uniqueUsers: number;
    failedAttempts: number;
    riskEvents: number;
    policyViolations: number;
  };
  details: Record<string, unknown>;
}

export interface EnterpriseAccessControlConfig {
  mfaRequired: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number;
  };
  auditRetention: number;
  riskScoreThreshold: number;
  enableDeviceFingerprinting: boolean;
  enableIpWhitelisting: boolean;
  complianceMode: 'none' | 'basic' | 'strict';
}

export interface SessionData {
  userId: string;
  userEmail: string;
  tenantId?: string;
  organizationId?: string;
  createdAt: Date;
  lastAccessAt: Date;
  ipAddress: string;
  userAgent: string;
  mfaVerified: boolean;
  deviceFingerprint?: string;
  permissions: string[];
  riskScore: number;
}

export interface LoginAttempt {
  userId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
  riskScore: number;
}

export interface MfaSettings {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  lastUsed?: Date;
  methods: ('totp' | 'sms' | 'email')[];
}

export interface DeviceFingerprint {
  id: string;
  userId: string;
  fingerprint: string;
  trusted: boolean;
  createdAt: Date;
  lastUsed: Date;
  name?: string;
  userAgent: string;
  ipAddress: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'access' | 'permission' | 'policy' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  tenantId?: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}
