/**
 * テナント管理モジュール
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type {
  Tenant,
  TenantQuota,
  TenantBilling,
  TenantIsolation,
  TenantCreateOptions,
  TenantUpdateOptions,
} from './multi-tenant-types.js';

export class TenantManager extends EventEmitter {
  private logger: Logger;
  private tenants: Map<string, Tenant> = new Map();
  private quotas: Map<string, TenantQuota> = new Map();
  private billingInfo: Map<string, TenantBilling> = new Map();
  private isolationConfig: Map<string, TenantIsolation> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.initializeDefaultTenants();
  }

  /**
   * デフォルトテナントの初期化
   */
  private initializeDefaultTenants(): void {
    // Demo tenant
    const demoTenant: Tenant = {
      id: 'demo-tenant',
      name: 'Demo Organization',
      domain: 'demo.example.com',
      plan: 'basic',
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
          metrics: 90,
          backups: 7,
        },
      },
      subscription: {
        planId: 'basic-monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usage: {
          dnsRecords: 25,
          queriesThisMonth: 1500,
          activeUsers: 2,
          apiCalls: 450,
        },
      },
      metadata: {
        industry: 'Technology',
        companySize: 'Small',
        region: 'US',
        contactEmail: 'admin@demo.example.com',
        technicalContact: 'tech@demo.example.com',
      },
    };

    this.tenants.set(demoTenant.id, demoTenant);
    this.initializeTenantQuota(demoTenant);
    this.initializeTenantBilling(demoTenant);
    this.initializeTenantIsolation(demoTenant);

    // Enterprise tenant
    const enterpriseTenant: Tenant = {
      id: 'enterprise-001',
      name: 'Enterprise Corp',
      domain: 'enterprise-corp.com',
      plan: 'enterprise',
      status: 'active',
      createdAt: new Date('2024-01-15'),
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
          'automation',
          'api-access',
          'white-label',
        ],
        retention: {
          logs: 365,
          metrics: 365,
          backups: 30,
        },
      },
      subscription: {
        planId: 'enterprise-annual',
        status: 'active',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-12-31'),
        usage: {
          dnsRecords: 2500,
          queriesThisMonth: 125000,
          activeUsers: 25,
          apiCalls: 15000,
        },
      },
      metadata: {
        industry: 'Finance',
        companySize: 'Large',
        region: 'US',
        contactEmail: 'billing@enterprise-corp.com',
        billingContact: 'accounts@enterprise-corp.com',
        technicalContact: 'devops@enterprise-corp.com',
      },
    };

    this.tenants.set(enterpriseTenant.id, enterpriseTenant);
    this.initializeTenantQuota(enterpriseTenant);
    this.initializeTenantBilling(enterpriseTenant);
    this.initializeTenantIsolation(enterpriseTenant);

    this.logger.info('デフォルトテナントを初期化しました', {
      tenantCount: this.tenants.size,
    });
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
        apiCallsPerMinute: tenant.settings.apiRateLimit,
        storage: this.getStorageLimit(tenant.plan),
      },
      current: {
        dnsRecords: tenant.subscription.usage.dnsRecords,
        queriesThisMonth: tenant.subscription.usage.queriesThisMonth,
        users: tenant.subscription.usage.activeUsers,
        apiCallsThisMinute: 0,
        storage: Math.floor(Math.random() * 1000000), // bytes
      },
      alerts: {
        enabled: true,
        thresholds: {
          warning: 80,
          critical: 95,
        },
        contacts: [tenant.metadata.contactEmail],
      },
      resetDates: {
        queries: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ),
        apiCalls: new Date(Date.now() + 60000), // 1 minute
      },
    };

    this.quotas.set(tenant.id, quota);
  }

  private getStorageLimit(plan: Tenant['plan']): number {
    switch (plan) {
      case 'free':
        return 100 * 1024 * 1024; // 100MB
      case 'basic':
        return 1024 * 1024 * 1024; // 1GB
      case 'professional':
        return 10 * 1024 * 1024 * 1024; // 10GB
      case 'enterprise':
        return 100 * 1024 * 1024 * 1024; // 100GB
      default:
        return 100 * 1024 * 1024; // 100MB
    }
  }

  /**
   * テナント請求情報の初期化
   */
  private initializeTenantBilling(tenant: Tenant): void {
    const pricing = this.getPlanPricing(tenant.plan);

    const billing: TenantBilling = {
      tenantId: tenant.id,
      subscription: {
        id: `sub_${randomUUID()}`,
        status: tenant.subscription.status,
        plan: {
          id: tenant.subscription.planId,
          name: `${tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} Plan`,
          price: pricing.price,
          currency: 'USD',
          interval: pricing.interval,
        },
      },
      usage: {
        period: {
          start: tenant.subscription.currentPeriodStart,
          end: tenant.subscription.currentPeriodEnd,
        },
        metrics: {
          dnsRecords: tenant.subscription.usage.dnsRecords,
          queries: tenant.subscription.usage.queriesThisMonth,
          apiCalls: tenant.subscription.usage.apiCalls,
          storage: Math.floor(Math.random() * 1000000),
          support: 0,
        },
        overages: {},
      },
      billing: {
        address: {
          company: tenant.name,
          line1: '123 Business Ave',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94105',
          country: 'US',
        },
        paymentMethod: {
          type: 'card',
          last4: '4242',
          expiry: '12/25',
        },
      },
      invoices: [],
    };

    this.billingInfo.set(tenant.id, billing);
  }

  private getPlanPricing(plan: Tenant['plan']): {
    price: number;
    interval: 'month';
  } {
    switch (plan) {
      case 'free':
        return { price: 0, interval: 'month' as const };
      case 'basic':
        return { price: 29, interval: 'month' as const };
      case 'professional':
        return { price: 99, interval: 'month' as const };
      case 'enterprise':
        return { price: 499, interval: 'month' as const };
      default:
        return { price: 0, interval: 'month' as const };
    }
  }

  /**
   * テナント分離設定の初期化
   */
  private initializeTenantIsolation(tenant: Tenant): void {
    const isolation: TenantIsolation = {
      tenantId: tenant.id,
      network: {
        allowedIpRanges:
          tenant.plan === 'enterprise' ? ['10.0.0.0/8'] : undefined,
      },
      dns: {
        nameservers: ['ns1.dnsweeper.com', 'ns2.dnsweeper.com'],
        recursionAllowed: tenant.plan !== 'free',
        zonesIsolated: tenant.plan === 'enterprise',
      },
      storage: {
        encryption: {
          enabled:
            tenant.plan === 'professional' || tenant.plan === 'enterprise',
          algorithm: 'AES-256',
          keyRotation: tenant.plan === 'enterprise',
        },
        backup: {
          enabled: tenant.plan !== 'free',
          retention: tenant.settings.retention.backups,
          schedule: tenant.plan === 'enterprise' ? '0 2 * * *' : '0 2 * * 0',
        },
      },
      monitoring: {
        enabled: true,
        logRetention: tenant.settings.retention.logs,
        alerting: tenant.plan !== 'free',
        metricsExport: tenant.plan === 'enterprise',
      },
    };

    this.isolationConfig.set(tenant.id, isolation);
  }

  /**
   * テナントの作成
   */
  async createTenant(options: TenantCreateOptions): Promise<Tenant> {
    const tenant: Tenant = {
      id: randomUUID(),
      name: options.name,
      domain: options.domain,
      plan: options.plan,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        maxDNSRecords: this.getPlanLimits(options.plan).maxDNSRecords,
        maxQueriesPerMonth: this.getPlanLimits(options.plan).maxQueriesPerMonth,
        maxUsers: this.getPlanLimits(options.plan).maxUsers,
        apiRateLimit: this.getPlanLimits(options.plan).apiRateLimit,
        allowedFeatures: this.getPlanFeatures(options.plan),
        retention: {
          logs: 30,
          metrics: 90,
          backups: 7,
        },
      },
      subscription: {
        planId: `${options.plan}-monthly`,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usage: {
          dnsRecords: 0,
          queriesThisMonth: 0,
          activeUsers: 0,
          apiCalls: 0,
        },
      },
      metadata: {
        contactEmail: options.contactEmail,
        ...options.metadata,
      },
    };

    // カスタム制限を適用
    if (options.customLimits) {
      Object.assign(tenant.settings, {
        maxDNSRecords:
          options.customLimits.dnsRecords ?? tenant.settings.maxDNSRecords,
        maxQueriesPerMonth:
          options.customLimits.queriesPerMonth ??
          tenant.settings.maxQueriesPerMonth,
        maxUsers: options.customLimits.users ?? tenant.settings.maxUsers,
        apiRateLimit:
          options.customLimits.apiCallsPerMinute ??
          tenant.settings.apiRateLimit,
      });
    }

    this.tenants.set(tenant.id, tenant);
    this.initializeTenantQuota(tenant);
    this.initializeTenantBilling(tenant);
    this.initializeTenantIsolation(tenant);

    this.logger.info('新しいテナントを作成しました', {
      tenantId: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
    });

    this.emit('tenant:created', tenant);
    return tenant;
  }

  private getPlanLimits(plan: Tenant['plan']): {
    maxDNSRecords: number;
    maxQueriesPerMonth: number;
    maxUsers: number;
    apiRateLimit: number;
  } {
    switch (plan) {
      case 'free':
        return {
          maxDNSRecords: 10,
          maxQueriesPerMonth: 1000,
          maxUsers: 1,
          apiRateLimit: 10,
        };
      case 'basic':
        return {
          maxDNSRecords: 100,
          maxQueriesPerMonth: 10000,
          maxUsers: 5,
          apiRateLimit: 100,
        };
      case 'professional':
        return {
          maxDNSRecords: 1000,
          maxQueriesPerMonth: 100000,
          maxUsers: 25,
          apiRateLimit: 500,
        };
      case 'enterprise':
        return {
          maxDNSRecords: 10000,
          maxQueriesPerMonth: 1000000,
          maxUsers: 100,
          apiRateLimit: 1000,
        };
      default:
        return {
          maxDNSRecords: 10,
          maxQueriesPerMonth: 1000,
          maxUsers: 1,
          apiRateLimit: 10,
        };
    }
  }

  private getPlanFeatures(plan: Tenant['plan']): string[] {
    switch (plan) {
      case 'free':
        return ['basic-dns'];
      case 'basic':
        return ['basic-dns', 'monitoring'];
      case 'professional':
        return ['basic-dns', 'monitoring', 'analytics', 'automation'];
      case 'enterprise':
        return [
          'basic-dns',
          'monitoring',
          'analytics',
          'automation',
          'api-access',
          'white-label',
          'priority-support',
        ];
      default:
        return ['basic-dns'];
    }
  }

  /**
   * テナントの更新
   */
  async updateTenant(
    tenantId: string,
    options: TenantUpdateOptions
  ): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナント ${tenantId} が見つかりません`);
    }

    const updatedTenant: Tenant = {
      ...tenant,
      updatedAt: new Date(),
    };

    // 明示的に各フィールドを更新
    if (options.name) updatedTenant.name = options.name;
    if (options.plan) updatedTenant.plan = options.plan;
    if (options.status) updatedTenant.status = options.status;

    // 設定の更新
    if (options.settings) {
      updatedTenant.settings = {
        ...tenant.settings,
        ...options.settings,
      };
    }

    // メタデータの更新
    if (options.metadata) {
      updatedTenant.metadata = {
        ...tenant.metadata,
        ...options.metadata,
      };
    }

    this.tenants.set(tenantId, updatedTenant);

    // プランが変更された場合、制限とコストを更新
    if (options.plan && options.plan !== tenant.plan) {
      this.initializeTenantQuota(updatedTenant);
      this.initializeTenantBilling(updatedTenant);
      this.initializeTenantIsolation(updatedTenant);
    }

    this.logger.info('テナントを更新しました', {
      tenantId,
      changes: Object.keys(options),
    });

    this.emit('tenant:updated', updatedTenant);
    return updatedTenant;
  }

  /**
   * テナントの削除
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナント ${tenantId} が見つかりません`);
    }

    this.tenants.delete(tenantId);
    this.quotas.delete(tenantId);
    this.billingInfo.delete(tenantId);
    this.isolationConfig.delete(tenantId);

    this.logger.info('テナントを削除しました', {
      tenantId,
      name: tenant.name,
    });

    this.emit('tenant:deleted', { tenantId, tenant });
  }

  /**
   * テナントの取得
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * 全テナントの取得
   */
  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * テナントクォータの取得
   */
  getTenantQuota(tenantId: string): TenantQuota | undefined {
    return this.quotas.get(tenantId);
  }

  /**
   * テナント請求情報の取得
   */
  getTenantBilling(tenantId: string): TenantBilling | undefined {
    return this.billingInfo.get(tenantId);
  }

  /**
   * テナント分離設定の取得
   */
  getTenantIsolation(tenantId: string): TenantIsolation | undefined {
    return this.isolationConfig.get(tenantId);
  }
}
