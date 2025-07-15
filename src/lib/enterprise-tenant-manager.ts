/**
 * 企業向けテナント管理
 *
 * マルチテナント環境でのテナント作成、更新、削除、リソース管理
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import type { Logger } from './logger.js';

export interface Tenant {
  id: string;
  name: string;
  organizationId: string;
  domain: string;
  settings: TenantSettings;
  resources: TenantResources;
  permissions: TenantPermissions;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'inactive';
}

export interface TenantSettings {
  dnsResolvers: string[];
  securityPolicies: {
    threatDetection: boolean;
    realTimeMonitoring: boolean;
    aiOptimization: boolean;
    confidenceThreshold: number;
  };
  performanceSettings: {
    monitoringEnabled: boolean;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      throughput: number;
    };
  };
  integrationsEnabled: string[];
  customDomains: string[];
}

export interface TenantResources {
  maxDomains: number;
  maxRecords: number;
  maxQueries: number;
  maxUsers: number;
  storageLimit: number;
  computeLimit: number;
  currentUsage: {
    domains: number;
    records: number;
    queries: number;
    users: number;
    storage: number;
    compute: number;
  };
}

export interface TenantPermissions {
  adminUsers: string[];
  readOnlyUsers: string[];
  customRoles: {
    [roleName: string]: {
      permissions: string[];
      users: string[];
    };
  };
  apiKeys: {
    [keyId: string]: {
      permissions: string[];
      expiresAt: Date;
      createdBy: string;
    };
  };
}

export interface TenantManagerConfig {
  resourceQuotas: boolean;
  auditLogging: boolean;
  defaultResourceLimits: Partial<TenantResources>;
}

export class EnterpriseTenantManager extends EventEmitter {
  private tenants: Map<string, Tenant> = new Map();
  private logger: Logger;
  private config: TenantManagerConfig;

  constructor(logger: Logger, config: Partial<TenantManagerConfig> = {}) {
    super();
    this.logger = logger;
    this.config = {
      resourceQuotas: true,
      auditLogging: true,
      defaultResourceLimits: {
        maxDomains: 100,
        maxRecords: 10000,
        maxQueries: 1000000,
        maxUsers: 50,
        storageLimit: 1073741824, // 1GB
        computeLimit: 1000, // 1000 compute units
      },
      ...config,
    };
  }

  /**
   * テナントの作成
   */
  async createTenant(
    tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Tenant> {
    const tenant: Tenant = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...tenantData,
    };

    // デフォルトリソース制限の適用
    if (this.config.defaultResourceLimits) {
      tenant.resources = {
        ...this.config.defaultResourceLimits,
        ...tenant.resources,
        currentUsage: {
          domains: 0,
          records: 0,
          queries: 0,
          users: 0,
          storage: 0,
          compute: 0,
          ...tenant.resources.currentUsage, // 指定された値を優先
        },
      } as TenantResources;
    }

    // リソース制限の検証
    if (this.config.resourceQuotas) {
      await this.validateResourceQuotas(tenant);
    }

    this.tenants.set(tenant.id, tenant);

    // 監査ログ
    if (this.config.auditLogging) {
      this.logger.info('テナントを作成しました', {
        tenantId: tenant.id,
        organizationId: tenant.organizationId,
        domain: tenant.domain,
      });
    }

    this.emit('tenant-created', tenant);
    return tenant;
  }

  /**
   * テナントの取得
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * テナント一覧の取得
   */
  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * 組織のテナント一覧の取得
   */
  getTenantsByOrganization(organizationId: string): Tenant[] {
    return this.getAllTenants().filter(
      tenant => tenant.organizationId === organizationId
    );
  }

  /**
   * テナントの更新
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>
  ): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナント ${tenantId} が見つかりません`);
    }

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      id: tenant.id,
      createdAt: tenant.createdAt,
      updatedAt: new Date(),
    };

    // リソース制限の検証
    if (this.config.resourceQuotas && updates.resources) {
      await this.validateResourceQuotas(updatedTenant);
    }

    this.tenants.set(tenantId, updatedTenant);

    // 監査ログ
    if (this.config.auditLogging) {
      this.logger.info('テナントを更新しました', {
        tenantId,
        changes: Object.keys(updates),
      });
    }

    this.emit('tenant-updated', updatedTenant);
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

    // 監査ログ
    if (this.config.auditLogging) {
      this.logger.info('テナントを削除しました', {
        tenantId,
        organizationId: tenant.organizationId,
      });
    }

    this.emit('tenant-deleted', { tenantId, tenant });
  }

  /**
   * テナントの一時停止
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<Tenant> {
    return this.updateTenant(tenantId, { status: 'suspended' });
  }

  /**
   * テナントの復活
   */
  async resumeTenant(tenantId: string): Promise<Tenant> {
    return this.updateTenant(tenantId, { status: 'active' });
  }

  /**
   * リソースクォータの検証
   */
  private async validateResourceQuotas(tenant: Tenant): Promise<void> {
    const { resources } = tenant;

    if (resources.currentUsage.domains > resources.maxDomains) {
      throw new Error(
        `ドメイン数がクォータを超過しています: ${resources.currentUsage.domains}/${resources.maxDomains}`
      );
    }

    if (resources.currentUsage.records > resources.maxRecords) {
      throw new Error(
        `レコード数がクォータを超過しています: ${resources.currentUsage.records}/${resources.maxRecords}`
      );
    }

    if (resources.currentUsage.queries > resources.maxQueries) {
      throw new Error(
        `クエリ数がクォータを超過しています: ${resources.currentUsage.queries}/${resources.maxQueries}`
      );
    }

    if (resources.currentUsage.users > resources.maxUsers) {
      throw new Error(
        `ユーザー数がクォータを超過しています: ${resources.currentUsage.users}/${resources.maxUsers}`
      );
    }

    if (resources.currentUsage.storage > resources.storageLimit) {
      throw new Error(
        `ストレージがクォータを超過しています: ${resources.currentUsage.storage}/${resources.storageLimit}`
      );
    }

    if (resources.currentUsage.compute > resources.computeLimit) {
      throw new Error(
        `コンピュートリソースがクォータを超過しています: ${resources.currentUsage.compute}/${resources.computeLimit}`
      );
    }
  }

  /**
   * リソース使用量の更新
   */
  async updateResourceUsage(
    tenantId: string,
    usage: Partial<TenantResources['currentUsage']>
  ): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`テナント ${tenantId} が見つかりません`);
    }

    tenant.resources.currentUsage = {
      ...tenant.resources.currentUsage,
      ...usage,
    };

    // クォータ検証
    if (this.config.resourceQuotas) {
      await this.validateResourceQuotas(tenant);
    }

    tenant.updatedAt = new Date();
    this.tenants.set(tenantId, tenant);

    this.emit('resource-usage-updated', { tenantId, usage });
  }

  /**
   * テナントの統計情報取得
   */
  getTenantStatistics(): {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    resourceUtilization: {
      totalDomains: number;
      totalRecords: number;
      totalQueries: number;
      totalUsers: number;
      totalStorage: number;
      totalCompute: number;
    };
  } {
    const tenants = this.getAllTenants();
    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const suspendedTenants = tenants.filter(
      t => t.status === 'suspended'
    ).length;

    const resourceUtilization = tenants.reduce(
      (acc, tenant) => ({
        totalDomains: acc.totalDomains + tenant.resources.currentUsage.domains,
        totalRecords: acc.totalRecords + tenant.resources.currentUsage.records,
        totalQueries: acc.totalQueries + tenant.resources.currentUsage.queries,
        totalUsers: acc.totalUsers + tenant.resources.currentUsage.users,
        totalStorage: acc.totalStorage + tenant.resources.currentUsage.storage,
        totalCompute: acc.totalCompute + tenant.resources.currentUsage.compute,
      }),
      {
        totalDomains: 0,
        totalRecords: 0,
        totalQueries: 0,
        totalUsers: 0,
        totalStorage: 0,
        totalCompute: 0,
      }
    );

    return {
      totalTenants: tenants.length,
      activeTenants,
      suspendedTenants,
      resourceUtilization,
    };
  }
}
