/**
 * マルチテナント DNS管理システム
 *
 * 複数の組織・テナントによる安全なDNS管理を実現
 * - テナント分離とセキュリティ
 * - リソース制限とクォータ管理
 * - 監査ログとコンプライアンス
 * - 階層的権限管理
 */

import { EventEmitter } from 'events';

import { Logger } from '@lib/logger.js';

import type { DNSRecord, DNSRecordType } from '@types/index.js';

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
  createdBy: string;
  tags: string[];
  metadata: {
    version: string;
    lastModified: Date;
    modifiedBy: string;
    changeReason?: string;
  };
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
  result: 'success' | 'failure' | 'partial';
  details: {
    changes?: Record<string, { old: unknown; new: unknown }>;
    error?: string;
    metadata?: Record<string, unknown>;
  };
  risk: 'low' | 'medium' | 'high' | 'critical';
  geolocation?: {
    country: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface TenantQuota {
  tenantId: string;
  limits: {
    dnsRecords: number;
    queriesPerMonth: number;
    users: number;
    apiCallsPerHour: number;
    storageGB: number;
    bandwidthGB: number;
  };
  usage: {
    dnsRecords: number;
    queriesThisMonth: number;
    activeUsers: number;
    apiCallsThisHour: number;
    storageUsedGB: number;
    bandwidthUsedGB: number;
  };
  resetTimes: {
    monthly: Date;
    hourly: Date;
  };
}

export interface TenantBilling {
  tenantId: string;
  subscription: {
    planId: string;
    status: 'active' | 'past_due' | 'cancelled';
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    currency: 'USD' | 'EUR' | 'JPY';
    nextBillingDate: Date;
    trialEnd?: Date;
  };
  paymentMethod: {
    type: 'credit_card' | 'bank_transfer' | 'invoice';
    lastFour?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
  };
  invoices: Array<{
    id: string;
    date: Date;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    downloadUrl?: string;
  }>;
  usage: {
    current: number;
    previous: number;
    limit: number;
    overage: number;
  };
}

export interface TenantIsolation {
  tenantId: string;
  isolation: {
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
    network: {
      vpcId: string;
      subnetIds: string[];
      securityGroupIds: string[];
      allowedIPs: string[];
    };
    compute: {
      dedicated: boolean;
      cpu: number;
      memory: number;
      instanceType: string;
    };
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

export class MultiTenantDNSManager extends EventEmitter {
  private logger: Logger;
  private tenants: Map<string, Tenant> = new Map();
  private users: Map<string, TenantUser> = new Map();
  private resources: Map<string, TenantResource[]> = new Map();
  private auditLogs: Map<string, TenantAuditLog[]> = new Map();
  private quotas: Map<string, TenantQuota> = new Map();
  private billingInfo: Map<string, TenantBilling> = new Map();
  private isolationConfig: Map<string, TenantIsolation> = new Map();
  private activeConnections: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.logger = new Logger({ context: 'MultiTenantDNSManager' });
    this.initializeDefaultTenants();
    this.startQuotaMonitoring();
    this.startBillingUpdates();
  }

  /**
   * デフォルトテナントの初期化
   */
  private initializeDefaultTenants(): void {
    const defaultTenants: Tenant[] = [
      {
        id: 'demo-tenant',
        name: 'Demo Organization',
        domain: 'demo.dnsweeper.com',
        plan: 'free',
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        settings: {
          maxDNSRecords: 100,
          maxQueriesPerMonth: 10000,
          maxUsers: 5,
          apiRateLimit: 100,
          allowedFeatures: ['basic-dns', 'monitoring'],
          retention: {
            logs: 30,
            metrics: 30,
            backups: 7,
          },
        },
        subscription: {
          planId: 'free-plan',
          status: 'active',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-12-31'),
          usage: {
            dnsRecords: 25,
            queriesThisMonth: 1500,
            activeUsers: 3,
            apiCalls: 450,
          },
        },
        metadata: {
          industry: 'technology',
          companySize: 'startup',
          region: 'us-east-1',
          contactEmail: 'admin@demo.dnsweeper.com',
        },
      },
      {
        id: 'enterprise-tenant',
        name: 'Enterprise Corp',
        domain: 'enterprise.dnsweeper.com',
        plan: 'enterprise',
        status: 'active',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date(),
        settings: {
          maxDNSRecords: 10000,
          maxQueriesPerMonth: 1000000,
          maxUsers: 100,
          apiRateLimit: 1000,
          allowedFeatures: [
            'advanced-dns',
            'monitoring',
            'analytics',
            'white-label',
            'api-access',
          ],
          retention: {
            logs: 365,
            metrics: 365,
            backups: 90,
          },
        },
        subscription: {
          planId: 'enterprise-plan',
          status: 'active',
          currentPeriodStart: new Date('2024-03-01'),
          currentPeriodEnd: new Date('2025-03-01'),
          usage: {
            dnsRecords: 2500,
            queriesThisMonth: 85000,
            activeUsers: 25,
            apiCalls: 15000,
          },
        },
        metadata: {
          industry: 'finance',
          companySize: 'enterprise',
          region: 'us-west-2',
          contactEmail: 'it@enterprise.dnsweeper.com',
          billingContact: 'billing@enterprise.dnsweeper.com',
          technicalContact: 'devops@enterprise.dnsweeper.com',
        },
      },
    ];

    defaultTenants.forEach(tenant => {
      this.tenants.set(tenant.id, tenant);
      this.initializeTenantQuota(tenant);
      this.initializeTenantBilling(tenant);
      this.initializeTenantIsolation(tenant);
    });

    this.logger.info(
      `${defaultTenants.length}個のデフォルトテナントを初期化しました`
    );
  }

  /**
   * テナントクォータの初期化
   */
  private initializeTenantQuota(tenant: Tenant): void {
    const quota: TenantQuota = {
      tenantId: tenant.id,
      limits: {
        dnsRecords: tenant.settings.maxDNSRecords,
        queriesPerMonth: tenant.settings.maxQueriesPerMonth,
        users: tenant.settings.maxUsers,
        apiCallsPerHour: tenant.settings.apiRateLimit,
        storageGB:
          tenant.plan === 'enterprise'
            ? 1000
            : tenant.plan === 'professional'
              ? 100
              : 10,
        bandwidthGB:
          tenant.plan === 'enterprise'
            ? 10000
            : tenant.plan === 'professional'
              ? 1000
              : 100,
      },
      usage: {
        dnsRecords: tenant.subscription.usage.dnsRecords,
        queriesThisMonth: tenant.subscription.usage.queriesThisMonth,
        activeUsers: tenant.subscription.usage.activeUsers,
        apiCallsThisHour: 0,
        storageUsedGB: Math.random() * 10,
        bandwidthUsedGB: Math.random() * 100,
      },
      resetTimes: {
        monthly: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ),
        hourly: new Date(Date.now() + 3600000),
      },
    };

    this.quotas.set(tenant.id, quota);
  }

  /**
   * テナント請求情報の初期化
   */
  private initializeTenantBilling(tenant: Tenant): void {
    const billing: TenantBilling = {
      tenantId: tenant.id,
      subscription: {
        planId: tenant.subscription.planId,
        status: tenant.subscription.status,
        billingCycle: 'monthly',
        amount:
          tenant.plan === 'enterprise'
            ? 500
            : tenant.plan === 'professional'
              ? 50
              : 0,
        currency: 'USD',
        nextBillingDate: tenant.subscription.currentPeriodEnd,
        trialEnd: tenant.subscription.trialEnd,
      },
      paymentMethod: {
        type: 'credit_card',
        lastFour: '4242',
        brand: 'Visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
      },
      invoices: [],
      usage: {
        current: tenant.subscription.usage.queriesThisMonth,
        previous: Math.floor(tenant.subscription.usage.queriesThisMonth * 0.8),
        limit: tenant.settings.maxQueriesPerMonth,
        overage: Math.max(
          0,
          tenant.subscription.usage.queriesThisMonth -
            tenant.settings.maxQueriesPerMonth
        ),
      },
    };

    this.billingInfo.set(tenant.id, billing);
  }

  /**
   * テナント分離設定の初期化
   */
  private initializeTenantIsolation(tenant: Tenant): void {
    const isolation: TenantIsolation = {
      tenantId: tenant.id,
      isolation: {
        database: {
          schema: `tenant_${tenant.id}`,
          readOnlyReplicas: [
            `replica-${tenant.id}-1`,
            `replica-${tenant.id}-2`,
          ],
          backupLocation: `s3://dnsweeper-backups/${tenant.id}/`,
        },
        storage: {
          bucket: `dnsweeper-${tenant.id}`,
          region: tenant.metadata.region || 'us-east-1',
          encryption: {
            enabled: tenant.plan === 'enterprise',
            keyId: `key-${tenant.id}`,
            algorithm: 'AES-256',
          },
        },
        network: {
          vpcId: `vpc-${tenant.id}`,
          subnetIds: [`subnet-${tenant.id}-1`, `subnet-${tenant.id}-2`],
          securityGroupIds: [`sg-${tenant.id}`],
          allowedIPs: [],
        },
        compute: {
          dedicated: tenant.plan === 'enterprise',
          cpu:
            tenant.plan === 'enterprise'
              ? 8
              : tenant.plan === 'professional'
                ? 4
                : 2,
          memory:
            tenant.plan === 'enterprise'
              ? 32
              : tenant.plan === 'professional'
                ? 16
                : 8,
          instanceType:
            tenant.plan === 'enterprise' ? 'c5.2xlarge' : 'm5.large',
        },
      },
      compliance: {
        certifications:
          tenant.plan === 'enterprise'
            ? ['SOC2', 'ISO27001', 'GDPR']
            : ['GDPR'],
        dataResidency: tenant.metadata.region || 'us-east-1',
        auditSchedule: tenant.plan === 'enterprise' ? 'quarterly' : 'annually',
        retentionPolicy: {
          logs: tenant.settings.retention.logs,
          backups: tenant.settings.retention.backups,
          userData: tenant.plan === 'enterprise' ? 2555 : 1095, // 7 years for enterprise, 3 years for others
        },
      },
    };

    this.isolationConfig.set(tenant.id, isolation);
  }

  /**
   * 新しいテナントを作成
   */
  async createTenant(
    tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Tenant> {
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tenant: Tenant = {
      id: tenantId,
      ...tenantData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, tenant);
    this.initializeTenantQuota(tenant);
    this.initializeTenantBilling(tenant);
    this.initializeTenantIsolation(tenant);

    this.logger.info(`新しいテナントを作成しました: ${tenantId}`, {
      name: tenant.name,
      plan: tenant.plan,
      domain: tenant.domain,
    });

    this.emit('tenant:created', tenant);

    return tenant;
  }

  /**
   * テナントを取得
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * テナント一覧を取得
   */
  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * テナントを更新
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Tenant>
  ): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナントが見つかりません: ${tenantId}`);
    }

    const updatedTenant = {
      ...tenant,
      ...updates,
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);

    this.logger.info(`テナントを更新しました: ${tenantId}`, updates);
    this.emit('tenant:updated', updatedTenant);

    return updatedTenant;
  }

  /**
   * テナントを削除
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナントが見つかりません: ${tenantId}`);
    }

    // 関連データのクリーンアップ
    this.tenants.delete(tenantId);
    this.quotas.delete(tenantId);
    this.billingInfo.delete(tenantId);
    this.isolationConfig.delete(tenantId);
    this.resources.delete(tenantId);
    this.auditLogs.delete(tenantId);
    this.activeConnections.delete(tenantId);

    this.logger.info(`テナントを削除しました: ${tenantId}`, {
      name: tenant.name,
    });

    this.emit('tenant:deleted', tenant);
  }

  /**
   * テナントユーザーを作成
   */
  async createUser(
    tenantId: string,
    userData: Omit<TenantUser, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantUser> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナントが見つかりません: ${tenantId}`);
    }

    const quota = this.quotas.get(tenantId);
    if (quota && quota.usage.activeUsers >= quota.limits.users) {
      throw new Error('ユーザー数の上限に達しています');
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const user: TenantUser = {
      id: userId,
      tenantId,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(userId, user);

    // クォータの更新
    if (quota) {
      quota.usage.activeUsers++;
    }

    this.logger.info(`新しいユーザーを作成しました: ${userId}`, {
      tenantId,
      email: user.email,
      role: user.role,
    });

    this.emit('user:created', user);

    return user;
  }

  /**
   * テナントのユーザー一覧を取得
   */
  getTenantUsers(tenantId: string): TenantUser[] {
    return Array.from(this.users.values()).filter(
      user => user.tenantId === tenantId
    );
  }

  /**
   * テナントクォータを取得
   */
  getTenantQuota(tenantId: string): TenantQuota | undefined {
    return this.quotas.get(tenantId);
  }

  /**
   * クォータ使用量を更新
   */
  updateQuotaUsage(
    tenantId: string,
    usageType: keyof TenantQuota['usage'],
    increment: number
  ): void {
    const quota = this.quotas.get(tenantId);
    if (!quota) return;

    quota.usage[usageType] = Math.max(0, quota.usage[usageType] + increment);

    // 上限チェック
    const limit = quota.limits[usageType];
    if (quota.usage[usageType] > limit) {
      this.logger.warn(
        `テナント ${tenantId} のクォータ上限を超えました: ${usageType}`,
        {
          usage: quota.usage[usageType],
          limit,
        }
      );

      this.emit('quota:exceeded', {
        tenantId,
        usageType,
        usage: quota.usage[usageType],
        limit,
      });
    }
  }

  /**
   * 監査ログを記録
   */
  logAuditEvent(auditLog: Omit<TenantAuditLog, 'id' | 'timestamp'>): void {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullLog: TenantAuditLog = {
      id: logId,
      timestamp: new Date(),
      ...auditLog,
    };

    const tenantLogs = this.auditLogs.get(auditLog.tenantId) || [];
    tenantLogs.push(fullLog);
    this.auditLogs.set(auditLog.tenantId, tenantLogs);

    // 保持期間外のログを削除
    const tenant = this.tenants.get(auditLog.tenantId);
    if (tenant) {
      const retentionDays = tenant.settings.retention.logs;
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      );

      const filteredLogs = tenantLogs.filter(log => log.timestamp > cutoffDate);
      this.auditLogs.set(auditLog.tenantId, filteredLogs);
    }

    this.logger.info(`監査ログを記録しました: ${logId}`, {
      tenantId: auditLog.tenantId,
      action: auditLog.action,
      result: auditLog.result,
      risk: auditLog.risk,
    });

    this.emit('audit:logged', fullLog);
  }

  /**
   * 監査ログを取得
   */
  getAuditLogs(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      userId?: string;
      risk?: string;
    }
  ): TenantAuditLog[] {
    let logs = this.auditLogs.get(tenantId) || [];

    // フィルタリング
    if (options?.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }
    if (options?.action) {
      logs = logs.filter(log => log.action === options.action);
    }
    if (options?.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }
    if (options?.risk) {
      logs = logs.filter(log => log.risk === options.risk);
    }

    // ソート（新しい順）
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // ページネーション
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * テナントリソースを作成
   */
  async createResource(
    tenantId: string,
    resourceData: Omit<
      TenantResource,
      'id' | 'tenantId' | 'createdAt' | 'updatedAt'
    >
  ): Promise<TenantResource> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナントが見つかりません: ${tenantId}`);
    }

    const resourceId = `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const resource: TenantResource = {
      id: resourceId,
      tenantId,
      ...resourceData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tenantResources = this.resources.get(tenantId) || [];
    tenantResources.push(resource);
    this.resources.set(tenantId, tenantResources);

    this.logger.info(`新しいリソースを作成しました: ${resourceId}`, {
      tenantId,
      type: resource.type,
      name: resource.name,
    });

    this.emit('resource:created', resource);

    return resource;
  }

  /**
   * テナントリソースを取得
   */
  getTenantResources(tenantId: string, type?: string): TenantResource[] {
    const resources = this.resources.get(tenantId) || [];
    return type ? resources.filter(r => r.type === type) : resources;
  }

  /**
   * 請求情報を取得
   */
  getTenantBilling(tenantId: string): TenantBilling | undefined {
    return this.billingInfo.get(tenantId);
  }

  /**
   * 分離設定を取得
   */
  getTenantIsolation(tenantId: string): TenantIsolation | undefined {
    return this.isolationConfig.get(tenantId);
  }

  /**
   * テナント統計を取得
   */
  getTenantStats(tenantId: string): {
    overview: {
      totalUsers: number;
      totalResources: number;
      totalQueries: number;
      totalStorage: number;
    };
    quota: TenantQuota;
    recent: {
      auditLogs: TenantAuditLog[];
      resources: TenantResource[];
    };
  } {
    const users = this.getTenantUsers(tenantId);
    const resources = this.getTenantResources(tenantId);
    const quota = this.getTenantQuota(tenantId);
    const recentAuditLogs = this.getAuditLogs(tenantId, { limit: 10 });

    return {
      overview: {
        totalUsers: users.length,
        totalResources: resources.length,
        totalQueries: quota?.usage.queriesThisMonth || 0,
        totalStorage: quota?.usage.storageUsedGB || 0,
      },
      quota: quota || ({} as TenantQuota),
      recent: {
        auditLogs: recentAuditLogs,
        resources: resources.slice(0, 10),
      },
    };
  }

  /**
   * クォータ監視の開始
   */
  private startQuotaMonitoring(): void {
    setInterval(() => {
      this.quotas.forEach((quota, tenantId) => {
        // 時間単位リセット
        if (Date.now() > quota.resetTimes.hourly.getTime()) {
          quota.usage.apiCallsThisHour = 0;
          quota.resetTimes.hourly = new Date(Date.now() + 3600000);
        }

        // 月単位リセット
        const now = new Date();
        if (now.getMonth() !== quota.resetTimes.monthly.getMonth()) {
          quota.usage.queriesThisMonth = 0;
          quota.resetTimes.monthly = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          );
        }
      });
    }, 60000); // 1分ごと
  }

  /**
   * 請求情報の更新
   */
  private startBillingUpdates(): void {
    setInterval(() => {
      this.billingInfo.forEach((billing, tenantId) => {
        const quota = this.quotas.get(tenantId);
        if (quota) {
          billing.usage.current = quota.usage.queriesThisMonth;
          billing.usage.overage = Math.max(
            0,
            quota.usage.queriesThisMonth - quota.limits.queriesPerMonth
          );
        }
      });
    }, 3600000); // 1時間ごと
  }

  /**
   * アクティブ接続の追跡
   */
  trackConnection(tenantId: string, userId: string): void {
    const connections = this.activeConnections.get(tenantId) || new Set();
    connections.add(userId);
    this.activeConnections.set(tenantId, connections);
  }

  /**
   * 接続の削除
   */
  removeConnection(tenantId: string, userId: string): void {
    const connections = this.activeConnections.get(tenantId);
    if (connections) {
      connections.delete(userId);
      if (connections.size === 0) {
        this.activeConnections.delete(tenantId);
      }
    }
  }

  /**
   * アクティブ接続数を取得
   */
  getActiveConnections(tenantId: string): number {
    return this.activeConnections.get(tenantId)?.size || 0;
  }

  /**
   * システム全体の統計を取得
   */
  getSystemStats(): {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalResources: number;
    totalQueries: number;
    planDistribution: Record<string, number>;
    regionDistribution: Record<string, number>;
  } {
    const tenants = Array.from(this.tenants.values());
    const users = Array.from(this.users.values());
    const allResources = Array.from(this.resources.values()).flat();

    const totalQueries = Array.from(this.quotas.values()).reduce(
      (sum, quota) => sum + quota.usage.queriesThisMonth,
      0
    );

    const planDistribution = tenants.reduce(
      (acc, tenant) => {
        acc[tenant.plan] = (acc[tenant.plan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const regionDistribution = tenants.reduce(
      (acc, tenant) => {
        const region = tenant.metadata.region || 'unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === 'active').length,
      totalUsers: users.length,
      totalResources: allResources.length,
      totalQueries,
      planDistribution,
      regionDistribution,
    };
  }

  /**
   * システムのシャットダウン
   */
  async shutdown(): Promise<void> {
    this.logger.info('マルチテナントDNSマネージャーをシャットダウンしています');

    // アクティブな接続をクリア
    this.activeConnections.clear();

    this.logger.info(
      'マルチテナントDNSマネージャーのシャットダウンが完了しました'
    );
  }
}

export default MultiTenantDNSManager;
