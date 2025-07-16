/**
 * マルチテナント DNS管理システム - リファクタリング版
 *
 * 分離された機能モジュールを統合する軽量なコーディネータークラス
 */

import { EventEmitter } from 'events';

import { Logger } from '@lib/logger.js';

import { MultiTenantAuditManager } from './multi-tenant-audit-manager.js';
import { MultiTenantBillingManager } from './multi-tenant-billing-manager.js';
import { MultiTenantCore } from './multi-tenant-core.js';
import { MultiTenantResourceManager } from './multi-tenant-resource-manager.js';

import type {
  Tenant,
  TenantUser,
  TenantResource,
  TenantAuditLog,
  TenantQuota,
  TenantBilling,
  TenantDNSZone,
  TenantIsolation,
  MultiTenantConfig,
} from './multi-tenant-types.js';
import type { IDNSRecord as DNSRecord } from '../types/index.js';

export class MultiTenantDNSManager extends EventEmitter {
  private logger: Logger;
  private config: MultiTenantConfig;

  // 機能モジュール
  private core: MultiTenantCore;
  private resourceManager: MultiTenantResourceManager;
  private auditManager: MultiTenantAuditManager;
  private billingManager: MultiTenantBillingManager;

  // 分離設定（従来通り）
  private isolationConfig: Map<string, TenantIsolation> = new Map();
  private activeConnections: Map<string, Set<string>> = new Map();

  constructor(config?: Partial<MultiTenantConfig>) {
    super();
    this.logger = new Logger({ logLevel: 'info' });

    // デフォルト設定
    this.config = {
      isolation: {
        level: 'shared',
        enforceStrictSeparation: true,
      },
      billing: {
        enabled: true,
        provider: 'stripe',
        defaultCurrency: 'USD',
      },
      limits: {
        maxTenantsPerInstance: 1000,
        maxUsersPerTenant: 100,
        defaultQuotas: {
          dnsRecords: 1000,
          queriesPerMonth: 100000,
          users: 10,
          apiCallsPerHour: 1000,
          storageGB: 10,
          bandwidth: 100,
        },
      },
      security: {
        mfaRequired: false,
        sessionTimeout: 3600000,
        passwordPolicy: {
          minLength: 12,
          requireSpecialChars: true,
          maxAge: 90,
        },
      },
      audit: {
        enabled: true,
        retentionDays: 90,
        realTimeAlerts: true,
      },
      ...config,
    };

    // 機能モジュールの初期化
    this.core = new MultiTenantCore(this.logger);
    this.resourceManager = new MultiTenantResourceManager(
      this.core,
      this.logger
    );
    this.auditManager = new MultiTenantAuditManager(this.core, this.logger);
    this.billingManager = new MultiTenantBillingManager(this.core, this.logger);

    // イベント転送の設定
    this.setupEventForwarding();

    // 初期化
    this.initializeDefaultTenants();
    this.startQuotaMonitoring();

    this.logger.info('マルチテナントDNS管理システム初期化完了', {
      config: this.config,
    });
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // コアイベント
    this.core.on('tenant-created', data => {
      this.emit('tenant-created', data);
      // 課金とクォータの初期化
      this.billingManager.initializeTenantQuota(data.tenant.id);
      if (this.config.billing.enabled) {
        this.billingManager.initializeTenantBilling(data.tenant.id);
      }
    });

    this.core.on('tenant-deleted', data => {
      this.emit('tenant-deleted', data);
      // 関連データのクリーンアップ
      this.isolationConfig.delete(data.tenantId);
      this.activeConnections.delete(data.tenantId);
    });

    // リソースイベント
    this.resourceManager.on('resource-created', data => {
      this.emit('resource-created', data);
      this.recordAuditLog({
        tenantId: data.resource.tenantId,
        action: 'resource.create',
        resource: {
          type: data.resource.type,
          id: data.resource.id,
          name: data.resource.name,
        },
        severity: 'info',
        category: 'data',
        metadata: {},
        ip: '',
        userAgent: '',
      });
    });

    // 監査イベント
    this.auditManager.on('security-alert', data => {
      this.emit('security-alert', data);
    });

    // 課金イベント
    this.billingManager.on('quota-exceeded', data => {
      this.emit('quota-exceeded', data);
      this.recordAuditLog({
        tenantId: data.tenantId,
        action: 'quota.exceeded',
        resource: {
          type: 'quota',
          id: data.usageType,
        },
        severity: 'warning',
        category: 'billing',
        ip: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          context: {
            limit: data.limit,
            current: data.current,
            requested: data.requested,
          },
        },
      });
    });
  }

  // ===== テナント管理（コアに委譲） =====

  async createTenant(
    tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Tenant> {
    const totalTenants = this.core.getAllTenants().length;
    if (totalTenants >= this.config.limits.maxTenantsPerInstance) {
      throw new Error(
        `テナント数の上限に達しています: ${this.config.limits.maxTenantsPerInstance}`
      );
    }

    return this.core.createTenant(tenantData);
  }

  getTenant(tenantId: string): Tenant | null {
    return this.core.getTenant(tenantId);
  }

  async updateTenant(
    tenantId: string,
    updates: Partial<Tenant>
  ): Promise<Tenant | null> {
    return this.core.updateTenant(tenantId, updates);
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    return this.core.deleteTenant(tenantId);
  }

  getAllTenants(): Tenant[] {
    return this.core.getAllTenants();
  }

  searchTenants(query: any): Tenant[] {
    return this.core.searchTenants(query);
  }

  // ===== ユーザー管理（コアに委譲） =====

  async createUser(
    userData: Omit<TenantUser, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantUser | null> {
    const tenantUsers = this.core.getTenantUsers(userData.tenantId);
    if (tenantUsers.length >= this.config.limits.maxUsersPerTenant) {
      throw new Error(
        `ユーザー数の上限に達しています: ${this.config.limits.maxUsersPerTenant}`
      );
    }

    return this.core.createUser(userData);
  }

  getUser(userId: string): TenantUser | null {
    return this.core.getUser(userId);
  }

  async updateUser(
    userId: string,
    updates: Partial<TenantUser>
  ): Promise<TenantUser | null> {
    return this.core.updateUser(userId, updates);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.core.deleteUser(userId);
  }

  getTenantUsers(tenantId: string): TenantUser[] {
    return this.core.getTenantUsers(tenantId);
  }

  // ===== リソース管理（リソースマネージャーに委譲） =====

  async createResource(
    resourceData: Omit<TenantResource, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantResource | null> {
    // クォータチェック
    if (
      !(await this.checkAndUpdateQuota(resourceData.tenantId, 'dnsRecords', 1))
    ) {
      return null;
    }

    return this.resourceManager.createResource(resourceData);
  }

  getResource(tenantId: string, resourceId: string): TenantResource | null {
    return this.resourceManager.getResource(tenantId, resourceId);
  }

  async updateResource(
    tenantId: string,
    resourceId: string,
    updates: Partial<TenantResource>
  ): Promise<TenantResource | null> {
    return this.resourceManager.updateResource(tenantId, resourceId, updates);
  }

  async deleteResource(tenantId: string, resourceId: string): Promise<boolean> {
    const result = await this.resourceManager.deleteResource(
      tenantId,
      resourceId
    );
    if (result) {
      // クォータ更新
      await this.checkAndUpdateQuota(tenantId, 'dnsRecords', -1);
    }
    return result;
  }

  getTenantResources(tenantId: string, filters?: any): TenantResource[] {
    return this.resourceManager.getTenantResources(tenantId, filters);
  }

  // ===== DNSゾーン管理（リソースマネージャーに委譲） =====

  async createDNSZone(
    zoneData: Omit<TenantDNSZone, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantDNSZone | null> {
    return this.resourceManager.createDNSZone(zoneData);
  }

  getDNSZone(tenantId: string, zoneId: string): TenantDNSZone | null {
    return this.resourceManager.getDNSZone(tenantId, zoneId);
  }

  getDNSZoneByName(tenantId: string, zoneName: string): TenantDNSZone | null {
    return this.resourceManager.getDNSZoneByName(tenantId, zoneName);
  }

  async updateDNSZone(
    tenantId: string,
    zoneId: string,
    updates: Partial<TenantDNSZone>
  ): Promise<TenantDNSZone | null> {
    return this.resourceManager.updateDNSZone(tenantId, zoneId, updates);
  }

  async deleteDNSZone(tenantId: string, zoneId: string): Promise<boolean> {
    return this.resourceManager.deleteDNSZone(tenantId, zoneId);
  }

  getTenantDNSZones(tenantId: string, filters?: any): TenantDNSZone[] {
    return this.resourceManager.getTenantDNSZones(tenantId, filters);
  }

  async addDNSRecord(
    tenantId: string,
    zoneId: string,
    record: DNSRecord
  ): Promise<DNSRecord | null> {
    return this.resourceManager.addDNSRecord(tenantId, zoneId, record);
  }

  async removeDNSRecord(
    tenantId: string,
    zoneId: string,
    recordName: string,
    recordType: string
  ): Promise<boolean> {
    return this.resourceManager.removeDNSRecord(
      tenantId,
      zoneId,
      recordName,
      recordType
    );
  }

  searchDNSRecords(tenantId: string, query: any): DNSRecord[] {
    return this.resourceManager.searchDNSRecords(tenantId, query);
  }

  // ===== 監査ログ管理（監査マネージャーに委譲） =====

  async recordAuditLog(
    logData: Omit<TenantAuditLog, 'id' | 'timestamp'>
  ): Promise<TenantAuditLog> {
    // デフォルト値の設定
    const enrichedLogData = {
      ...logData,
      ip: logData.ip || '0.0.0.0',
      userAgent: logData.userAgent || 'system',
    };

    return this.auditManager.recordAuditLog(enrichedLogData);
  }

  getAuditLogs(tenantId: string, filters?: any): TenantAuditLog[] {
    return this.auditManager.getAuditLogs(tenantId, filters);
  }

  searchAuditLogs(query: any): TenantAuditLog[] {
    return this.auditManager.searchAuditLogs(query);
  }

  generateAuditReport(tenantId: string, period: any): any {
    return this.auditManager.generateAuditReport(tenantId, period);
  }

  // ===== クォータ・課金管理（課金マネージャーに委譲） =====

  getQuota(tenantId: string): TenantQuota | null {
    return this.billingManager.getQuota(tenantId);
  }

  async checkAndUpdateQuota(
    tenantId: string,
    usageType: keyof TenantQuota['current'],
    amount: number
  ): Promise<boolean> {
    return this.billingManager.updateUsage(tenantId, usageType, amount);
  }

  getBilling(tenantId: string): TenantBilling | null {
    return this.billingManager.getBilling(tenantId);
  }

  async generateInvoice(tenantId: string): Promise<any> {
    return this.billingManager.generateInvoice(tenantId);
  }

  async processPayment(tenantId: string, invoiceId: string): Promise<boolean> {
    return this.billingManager.processPayment(tenantId, invoiceId);
  }

  async changePlan(tenantId: string, newPlanId: string): Promise<boolean> {
    return this.billingManager.changePlan(tenantId, newPlanId);
  }

  // ===== テナント分離管理 =====

  setTenantIsolation(tenantId: string, isolation: TenantIsolation): void {
    this.isolationConfig.set(tenantId, isolation);

    this.recordAuditLog({
      tenantId,
      action: 'isolation.update',
      resource: {
        type: 'isolation',
        id: tenantId,
      },
      severity: 'info',
      category: 'system',
      ip: '0.0.0.0',
      userAgent: 'system',
      metadata: { context: { isolation } },
    });
  }

  getTenantIsolation(tenantId: string): TenantIsolation | null {
    return this.isolationConfig.get(tenantId) || null;
  }

  // ===== 接続管理 =====

  registerConnection(tenantId: string, connectionId: string): void {
    const connections = this.activeConnections.get(tenantId) || new Set();
    connections.add(connectionId);
    this.activeConnections.set(tenantId, connections);
  }

  unregisterConnection(tenantId: string, connectionId: string): void {
    const connections = this.activeConnections.get(tenantId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.activeConnections.delete(tenantId);
      }
    }
  }

  getActiveConnections(tenantId: string): number {
    const connections = this.activeConnections.get(tenantId);
    return connections ? connections.size : 0;
  }

  // ===== ヘルパーメソッド =====

  /**
   * デフォルトテナントの初期化
   */
  private initializeDefaultTenants(): void {
    // デモ用テナントの作成は環境変数で制御
    if (process.env.INITIALIZE_DEMO_TENANTS === 'true') {
      this.createDemoTenants();
    }
  }

  /**
   * デモテナントの作成
   */
  private async createDemoTenants(): Promise<void> {
    try {
      await this.createTenant({
        name: 'Demo Organization',
        domain: 'demo.dnsweeper.com',
        plan: 'free',
        status: 'active',
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
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          usage: {
            dnsRecords: 0,
            queriesThisMonth: 0,
            activeUsers: 0,
            apiCalls: 0,
          },
        },
        metadata: {
          industry: 'technology',
          companySize: 'startup',
          region: 'us-east-1',
          contactEmail: 'admin@demo.dnsweeper.com',
        },
      });

      this.logger.info('デモテナントを作成しました');
    } catch (error) {
      this.logger.error(`デモテナント作成エラー: ${error}`);
    }
  }

  /**
   * クォータ監視の開始
   */
  private startQuotaMonitoring(): void {
    // 課金マネージャーがクォータ監視を自動的に行う
    this.logger.info('クォータ監視を開始しました');
  }

  /**
   * システム統計の取得
   */
  getSystemStatistics(): {
    tenants: any;
    resources: any;
    audit: any;
    billing: any;
  } {
    return {
      tenants: this.core.getStatistics(),
      resources: this.resourceManager.getStatistics(),
      audit: this.auditManager.getStatistics(),
      billing: this.billingManager.getStatistics(),
    };
  }

  /**
   * システム終了処理
   */
  async shutdown(): Promise<void> {
    this.core.shutdown();
    this.resourceManager.shutdown();
    this.auditManager.shutdown();
    this.billingManager.shutdown();

    this.removeAllListeners();
    this.logger.info('マルチテナントDNS管理システムを終了しました');
  }
}

// エクスポート
export * from './multi-tenant-types.js';
