/**
 * テナントリソース管理モジュール
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type {
  Tenant,
  TenantResource,
  TenantResourceCreateOptions,
} from './multi-tenant-types.js';

export class TenantResourceManager extends EventEmitter {
  private logger: Logger;
  private resources: Map<string, TenantResource[]> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * テナントリソースを作成
   */
  async createResource(
    options: TenantResourceCreateOptions,
    tenant: Tenant
  ): Promise<TenantResource> {
    // リソース数制限のチェック（必要に応じて実装）
    const existingResources = this.getResourcesByTenant(options.tenantId);
    const resourcesByType = existingResources.filter(r => r.type === options.type);

    // DNS レコード数制限のチェック
    if (options.type === 'dns-record' && resourcesByType.length >= tenant.settings.maxDNSRecords) {
      throw new Error('DNS レコード数の上限に達しています');
    }

    const resourceId = randomUUID();

    const resource: TenantResource = {
      id: resourceId,
      tenantId: options.tenantId,
      type: options.type,
      name: options.name,
      configuration: options.configuration,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      lastModified: new Date(),
      modifiedBy: 'system', // 実際の実装では認証されたユーザーID
    };

    const tenantResources = this.resources.get(options.tenantId) || [];
    tenantResources.push(resource);
    this.resources.set(options.tenantId, tenantResources);

    this.logger.info('新しいリソースを作成しました', {
      resourceId,
      tenantId: options.tenantId,
      type: options.type,
      name: options.name,
    });

    this.emit('resource:created', resource);
    return resource;
  }

  /**
   * リソースの更新
   */
  async updateResource(
    resourceId: string,
    updates: Partial<Omit<TenantResource, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<TenantResource> {
    const resource = this.getResource(resourceId);
    if (!resource) {
      throw new Error(`リソースが見つかりません: ${resourceId}`);
    }

    const updatedResource: TenantResource = {
      ...resource,
      ...updates,
      updatedAt: new Date(),
      lastModified: new Date(),
      version: this.incrementVersion(resource.version),
    };

    // リソース一覧を更新
    const tenantResources = this.resources.get(resource.tenantId) || [];
    const index = tenantResources.findIndex(r => r.id === resourceId);
    if (index !== -1) {
      tenantResources[index] = updatedResource;
      this.resources.set(resource.tenantId, tenantResources);
    }

    this.logger.info('リソースを更新しました', {
      resourceId,
      tenantId: resource.tenantId,
      changes: Object.keys(updates),
    });

    this.emit('resource:updated', updatedResource);
    return updatedResource;
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * リソースの削除
   */
  async deleteResource(resourceId: string): Promise<void> {
    const resource = this.getResource(resourceId);
    if (!resource) {
      throw new Error(`リソースが見つかりません: ${resourceId}`);
    }

    const tenantResources = this.resources.get(resource.tenantId) || [];
    const filteredResources = tenantResources.filter(r => r.id !== resourceId);
    this.resources.set(resource.tenantId, filteredResources);

    this.logger.info('リソースを削除しました', {
      resourceId,
      tenantId: resource.tenantId,
      type: resource.type,
      name: resource.name,
    });

    this.emit('resource:deleted', { resourceId, resource });
  }

  /**
   * リソースの取得
   */
  getResource(resourceId: string): TenantResource | undefined {
    for (const resources of this.resources.values()) {
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        return resource;
      }
    }
    return undefined;
  }

  /**
   * テナントのリソース一覧を取得
   */
  getResourcesByTenant(tenantId: string): TenantResource[] {
    return this.resources.get(tenantId) || [];
  }

  /**
   * タイプ別リソース一覧を取得
   */
  getResourcesByType(tenantId: string, type: TenantResource['type']): TenantResource[] {
    const tenantResources = this.getResourcesByTenant(tenantId);
    return tenantResources.filter(r => r.type === type);
  }

  /**
   * アクティブなリソース一覧を取得
   */
  getActiveResources(tenantId: string): TenantResource[] {
    const tenantResources = this.getResourcesByTenant(tenantId);
    return tenantResources.filter(r => r.status === 'active');
  }

  /**
   * リソースの有効化/無効化
   */
  async toggleResourceStatus(
    resourceId: string,
    status: TenantResource['status']
  ): Promise<TenantResource> {
    return this.updateResource(resourceId, { status });
  }

  /**
   * リソース設定の更新
   */
  async updateResourceConfiguration(
    resourceId: string,
    configuration: Record<string, unknown>,
    modifiedBy: string,
    changeReason?: string
  ): Promise<TenantResource> {
    const resource = this.getResource(resourceId);
    if (!resource) {
      throw new Error(`リソースが見つかりません: ${resourceId}`);
    }

    return this.updateResource(resourceId, {
      configuration,
      modifiedBy,
      changeReason,
    });
  }

  /**
   * DNS レコードの作成（特殊ケース）
   */
  async createDNSRecord(
    tenantId: string,
    recordData: {
      name: string;
      type: string;
      value: string;
      ttl?: number;
      priority?: number;
    }
  ): Promise<TenantResource> {
    return this.createResource({
      tenantId,
      type: 'dns-record',
      name: recordData.name,
      configuration: {
        recordType: recordData.type,
        value: recordData.value,
        ttl: recordData.ttl || 300,
        priority: recordData.priority,
      },
    }, {} as Tenant); // 簡略化のため、実際の実装では適切なテナント情報を渡す
  }

  /**
   * DNS ゾーンの作成
   */
  async createDNSZone(
    tenantId: string,
    zoneData: {
      domain: string;
      nameservers: string[];
      contact?: string;
    }
  ): Promise<TenantResource> {
    return this.createResource({
      tenantId,
      type: 'dns-zone',
      name: zoneData.domain,
      configuration: {
        domain: zoneData.domain,
        nameservers: zoneData.nameservers,
        contact: zoneData.contact,
        soaRecord: {
          serial: Date.now(),
          refresh: 3600,
          retry: 1800,
          expire: 604800,
          minimum: 300,
        },
      },
    }, {} as Tenant);
  }

  /**
   * API キーの作成
   */
  async createAPIKey(
    tenantId: string,
    keyData: {
      name: string;
      permissions: string[];
      expiresAt?: Date;
    }
  ): Promise<TenantResource> {
    const apiKey = this.generateAPIKey();

    return this.createResource({
      tenantId,
      type: 'api-key',
      name: keyData.name,
      configuration: {
        key: apiKey,
        permissions: keyData.permissions,
        expiresAt: keyData.expiresAt,
        createdAt: new Date(),
        lastUsed: null,
        requestCount: 0,
      },
    }, {} as Tenant);
  }

  private generateAPIKey(): string {
    const prefix = 'dnsw_';
    const randomPart = randomUUID().replace(/-/g, '');
    return `${prefix}${randomPart}`;
  }

  /**
   * リソース統計の取得
   */
  getResourceStatistics(tenantId?: string): {
    totalResources: number;
    resourcesByType: Record<TenantResource['type'], number>;
    resourcesByStatus: Record<TenantResource['status'], number>;
    averageResourceAge: number;
  } {
    const resources = tenantId 
      ? this.getResourcesByTenant(tenantId)
      : Array.from(this.resources.values()).flat();

    const resourcesByType = {
      'dns-zone': 0,
      'dns-record': 0,
      'api-key': 0,
      'webhook': 0,
      'custom-domain': 0,
    };

    const resourcesByStatus = {
      active: 0,
      pending: 0,
      error: 0,
      disabled: 0,
    };

    let totalAge = 0;

    for (const resource of resources) {
      resourcesByType[resource.type]++;
      resourcesByStatus[resource.status]++;
      
      const age = Date.now() - resource.createdAt.getTime();
      totalAge += age;
    }

    const averageResourceAge = resources.length > 0 
      ? totalAge / resources.length / (1000 * 60 * 60 * 24) // days
      : 0;

    return {
      totalResources: resources.length,
      resourcesByType,
      resourcesByStatus,
      averageResourceAge,
    };
  }

  /**
   * リソースの一括削除（テナント削除時）
   */
  async deleteAllTenantResources(tenantId: string): Promise<void> {
    const resources = this.getResourcesByTenant(tenantId);
    
    for (const resource of resources) {
      this.emit('resource:deleted', { resourceId: resource.id, resource });
    }

    this.resources.delete(tenantId);

    this.logger.info('テナントのすべてのリソースを削除しました', {
      tenantId,
      resourceCount: resources.length,
    });

    this.emit('tenant:resources-deleted', { tenantId, resourceCount: resources.length });
  }

  /**
   * リソースアクセスの検証
   */
  validateResourceAccess(resourceId: string, userId: string): boolean {
    const resource = this.getResource(resourceId);
    if (!resource) {
      return false;
    }

    // 実際の実装では、ユーザーの権限とテナントのアクセス制御を確認
    // ここでは簡略化
    return true;
  }

  /**
   * リソース検索
   */
  searchResources(
    tenantId: string,
    query: {
      type?: TenantResource['type'];
      status?: TenantResource['status'];
      name?: string;
      createdAfter?: Date;
      createdBefore?: Date;
    }
  ): TenantResource[] {
    let resources = this.getResourcesByTenant(tenantId);

    if (query.type) {
      resources = resources.filter(r => r.type === query.type);
    }

    if (query.status) {
      resources = resources.filter(r => r.status === query.status);
    }

    if (query.name) {
      const searchTerm = query.name.toLowerCase();
      resources = resources.filter(r => 
        r.name.toLowerCase().includes(searchTerm)
      );
    }

    if (query.createdAfter) {
      resources = resources.filter(r => r.createdAt >= query.createdAfter!);
    }

    if (query.createdBefore) {
      resources = resources.filter(r => r.createdAt <= query.createdBefore!);
    }

    return resources;
  }
}