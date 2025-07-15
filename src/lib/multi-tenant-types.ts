/**
 * マルチテナント DNS管理システムの型定義
 */

import type { Logger } from './logger.js';
import type { IDNSRecord as DNSRecord, DNSRecordType } from '../types/index.js';

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
  id: string;
  tenantId: string;
  type: 'dns-zone' | 'dns-record' | 'api-key' | 'webhook' | 'custom-domain';
  name: string;
  configuration: Record<string, unknown>;
  status: 'active' | 'pending' | 'error' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  version: string;
  lastModified: Date;
  modifiedBy: string;
  changeReason?: string;
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: {
    type: string;
    id: string;
    name: string;
  };
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export interface TenantQuota {
  tenantId: string;
  limits: {
    dnsRecords: number;
    queriesPerMonth: number;
    users: number;
    apiCallsPerMinute: number;
    storage: number; // bytes
  };
  current: {
    dnsRecords: number;
    queriesThisMonth: number;
    users: number;
    apiCallsThisMinute: number;
    storage: number;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      warning: number; // percentage
      critical: number; // percentage
    };
    contacts: string[];
  };
  resetDates: {
    queries: Date;
    apiCalls: Date;
  };
}

export interface TenantBilling {
  tenantId: string;
  subscription: {
    id: string;
    status: 'active' | 'past_due' | 'cancelled' | 'unpaid';
    plan: {
      id: string;
      name: string;
      price: number;
      currency: string;
      interval: 'month' | 'year';
    };
  };
  usage: {
    period: {
      start: Date;
      end: Date;
    };
    metrics: {
      dnsRecords: number;
      queries: number;
      apiCalls: number;
      storage: number;
      support: number;
    };
    overages: {
      queries?: number;
      apiCalls?: number;
      storage?: number;
    };
  };
  billing: {
    address: {
      company?: string;
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postal_code: string;
      country: string;
    };
    taxId?: string;
    paymentMethod: {
      type: 'card' | 'bank' | 'paypal';
      last4?: string;
      expiry?: string;
    };
  };
  invoices: {
    id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    dueDate: Date;
    paidAt?: Date;
  }[];
}

export interface TenantIsolation {
  tenantId: string;
  network: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
    allowedIpRanges?: string[];
  };
  dns: {
    nameservers: string[];
    forwarders?: string[];
    recursionAllowed: boolean;
    zonesIsolated: boolean;
  };
  storage: {
    encryption: {
      enabled: boolean;
      algorithm?: string;
      keyRotation?: boolean;
    };
    backup: {
      enabled: boolean;
      retention: number;
      schedule: string;
    };
  };
  monitoring: {
    enabled: boolean;
    logRetention: number;
    alerting: boolean;
    metricsExport?: boolean;
  };
}

export interface MultiTenantDNSManagerOptions {
  logger: Logger;
  isolationMode: 'strict' | 'standard' | 'basic';
  quotaEnforcement: boolean;
  billingEnabled: boolean;
  auditLogging: boolean;
  defaultLimits: Partial<TenantQuota['limits']>;
}

export interface TenantCreateOptions {
  name: string;
  domain: string;
  plan: Tenant['plan'];
  contactEmail: string;
  metadata?: Partial<Tenant['metadata']>;
  customLimits?: Partial<TenantQuota['limits']>;
}

export interface TenantUpdateOptions {
  name?: string;
  plan?: Tenant['plan'];
  status?: Tenant['status'];
  settings?: Partial<Tenant['settings']>;
  metadata?: Partial<Tenant['metadata']>;
}

export interface TenantUserCreateOptions {
  tenantId: string;
  email: string;
  role: TenantUser['role'];
  profile: TenantUser['profile'];
  permissions?: string[];
}

export interface TenantResourceCreateOptions {
  tenantId: string;
  type: TenantResource['type'];
  name: string;
  configuration: Record<string, unknown>;
}

// 型ガード関数
export function isTenant(obj: unknown): obj is Tenant {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'domain' in obj &&
    'plan' in obj
  );
}

export function isTenantUser(obj: unknown): obj is TenantUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'tenantId' in obj &&
    'email' in obj &&
    'role' in obj
  );
}

export function isTenantResource(obj: unknown): obj is TenantResource {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'tenantId' in obj &&
    'type' in obj &&
    'name' in obj
  );
}
