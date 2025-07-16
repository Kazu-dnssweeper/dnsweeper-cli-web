/**
 * マルチテナントシステムの型定義
 */

import type { IDNSRecord as DNSRecord } from '../types/index.js';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  settings: {
    maxDNSRecords: number;
    maxQueriesPerMonth: number;
    maxUsers: number;
    apiRateLimit: number;
    allowedFeatures: string[];
    retention: {
      logs: number; // days
      metrics: number; // days
      backups: number; // days
    };
  };
  subscription: {
    planId: string;
    status: 'active' | 'past_due' | 'cancelled';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEnd?: Date;
    usage: {
      dnsRecords: number;
      queriesThisMonth: number;
      activeUsers: number;
      apiCalls: number;
    };
  };
  metadata: {
    industry?: string;
    companySize?: string;
    region?: string;
    contactEmail: string;
    billingContact?: string;
    technicalContact?: string;
  };
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  status: 'active' | 'invited' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  profile: {
    name: string;
    avatar?: string;
    timezone: string;
    language: string;
    preferences: {
      notifications: boolean;
      emailDigest: boolean;
      theme: 'light' | 'dark';
    };
  };
  mfa: {
    enabled: boolean;
    method?: 'totp' | 'sms' | 'email';
    backupCodes?: string[];
  };
}

export interface TenantResource {
  version?: number;
  id: string;
  tenantId: string;
  type: 'dns-zone' | 'dns-record' | 'api-key' | 'webhook' | 'custom-domain';
  name: string;
  configuration: Record<string, unknown>;
  status: 'active' | 'pending' | 'error' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  metadata: {
    version: string;
    size: number;
    lastModified: Date;
    checksum: string;
  };
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  timestamp: Date;
  ip: string;
  userAgent: string;
  metadata: {
    changes?: Record<string, any>;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    context?: Record<string, any>;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'data' | 'system' | 'security' | 'billing';
}

export interface TenantQuota {
  tenantId: string;
  limits: {
    dnsRecords: number;
    queriesPerMonth: number;
    users: number;
    apiCallsPerHour: number;
    storageGB: number;
    bandwidth: number;
  };
  current: {
    dnsRecords: number;
    queriesThisMonth: number;
    activeUsers: number;
    apiCallsThisHour: number;
    storageUsedGB: number;
    bandwidthUsed: number;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      warning: number; // %
      critical: number; // %
    };
    notifications: string[];
  };
  resetDate: Date;
  lastUpdated: Date;
}

export interface TenantBilling {
  tenantId: string;
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    features: string[];
  };
  subscription: {
    id: string;
    status: 'active' | 'past_due' | 'cancelled' | 'unpaid';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
  };
  paymentMethod: {
    type: 'card' | 'bank' | 'paypal';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  invoices: {
    id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    dueDate: Date;
    paidAt?: Date;
    url: string;
  }[];
  usage: {
    period: string;
    charges: {
      item: string;
      quantity: number;
      rate: number;
      amount: number;
    }[];
    total: number;
    currency: string;
  };
}

export interface TenantIsolation {
  tenantId: string;
  network: {
    vpcId: string;
    subnetIds: string[];
    securityGroupIds: string[];
    allowedIPs: string[];
  };
  database: {
    schema: string;
    readOnlyReplicas: string[];
    backupLocation: string;
  };
  storage: {
    bucket: string;
    region: string;
    encryption: {
      enabled: boolean;
      keyId: string;
      algorithm: string;
    };
  };
  compute: {
    dedicated: boolean;
    cpu: number;
    memory: number;
    instanceType: string;
  };
  compliance: {
    certifications: string[];
    dataResidency: string;
    auditSchedule: string;
    retentionPolicy: {
      logs: number;
      backups: number;
      userData: number;
    };
  };
}

export interface TenantDNSZone {
  id: string;
  tenantId: string;
  name: string;
  type: 'primary' | 'secondary';
  status: 'active' | 'pending' | 'error';
  records: DNSRecord[];
  nameservers: string[];
  ttl: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    autoUpdate: boolean;
    lastCheck: Date;
    errorCount: number;
    lastError?: string;
  };
}

export type TenantCreateOptions = Omit<
  Tenant,
  'id' | 'createdAt' | 'updatedAt'
>;
export type TenantUpdateOptions = Partial<
  Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
>;
export type TenantResourceCreateOptions = Omit<
  TenantResource,
  'id' | 'createdAt' | 'updatedAt' | 'tenantId'
>;
export type TenantUserCreateOptions = Omit<
  TenantUser,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface MultiTenantConfig {
  isolation: {
    level: 'shared' | 'dedicated' | 'hybrid';
    enforceStrictSeparation: boolean;
  };
  billing: {
    enabled: boolean;
    provider: 'stripe' | 'paddle' | 'manual';
    defaultCurrency: string;
  };
  limits: {
    maxTenantsPerInstance: number;
    maxUsersPerTenant: number;
    defaultQuotas: TenantQuota['limits'];
  };
  security: {
    mfaRequired: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      maxAge: number;
    };
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
    realTimeAlerts: boolean;
  };
}
