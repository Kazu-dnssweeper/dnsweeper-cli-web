/**
 * マルチテナント リソース管理
 * DNSレコード、ゾーン、その他リソースの管理
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type { MultiTenantCore } from './multi-tenant-core.js';
import type { TenantResource, TenantDNSZone } from './multi-tenant-types.js';
import type { IDNSRecord as DNSRecord } from '../types/index.js';

export class MultiTenantResourceManager extends EventEmitter {
  private logger: Logger;
  private tenantCore: MultiTenantCore;
  private resources: Map<string, TenantResource[]> = new Map();
  private dnsZones: Map<string, TenantDNSZone[]> = new Map();
  private resourceLocks: Map<string, Set<string>> = new Map();

  constructor(tenantCore: MultiTenantCore, logger?: Logger) {
    super();
    this.tenantCore = tenantCore;
    this.logger = logger || new Logger({ logLevel: 'info' });
  }

  // ===== リソース管理 =====

  /**
   * リソースの作成
   */
  async createResource(
    resourceData: Omit<TenantResource, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantResource | null> {
    // テナントの有効性確認
    if (!this.tenantCore.isTenantActive(resourceData.tenantId)) {
      this.logger.warn('非アクティブなテナントのリソース作成を拒否', {
        tenantId: resourceData.tenantId,
      });
      return null;
    }

    const resourceId = this.generateResourceId();
    const now = new Date();

    const resource: TenantResource = {
      id: resourceId,
      ...resourceData,
      createdAt: now,
      updatedAt: now,
    };

    // テナント別リソースリストに追加
    const tenantResources = this.resources.get(resourceData.tenantId) || [];
    tenantResources.push(resource);
    this.resources.set(resourceData.tenantId, tenantResources);

    this.logger.info('新しいリソースを作成しました', {
      resourceId,
      tenantId: resourceData.tenantId,
      type: resource.type,
      name: resource.name,
    });

    this.emit('resource-created', { resource });
    return resource;
  }

  /**
   * リソースの取得
   */
  getResource(tenantId: string, resourceId: string): TenantResource | null {
    const tenantResources = this.resources.get(tenantId) || [];
    return tenantResources.find(r => r.id === resourceId) || null;
  }

  /**
   * リソースの更新
   */
  async updateResource(
    tenantId: string,
    resourceId: string,
    updates: Partial<TenantResource>
  ): Promise<TenantResource | null> {
    const tenantResources = this.resources.get(tenantId) || [];
    const resourceIndex = tenantResources.findIndex(r => r.id === resourceId);

    if (resourceIndex === -1) {
      return null;
    }

    // ロックチェック
    if (this.isResourceLocked(resourceId)) {
      this.logger.warn('リソースがロックされています', { resourceId });
      return null;
    }

    const updatedResource: TenantResource = {
      ...tenantResources[resourceIndex],
      ...updates,
      id: resourceId, // IDは変更不可
      tenantId, // テナントIDは変更不可
      updatedAt: new Date(),
    };

    tenantResources[resourceIndex] = updatedResource;
    this.resources.set(tenantId, tenantResources);

    this.logger.info('リソースを更新しました', {
      resourceId,
      tenantId,
      updates: Object.keys(updates),
    });

    this.emit('resource-updated', {
      resourceId,
      tenantId,
      resource: updatedResource,
      updates,
    });
    return updatedResource;
  }

  /**
   * リソースの削除
   */
  async deleteResource(tenantId: string, resourceId: string): Promise<boolean> {
    const tenantResources = this.resources.get(tenantId) || [];
    const resourceIndex = tenantResources.findIndex(r => r.id === resourceId);

    if (resourceIndex === -1) {
      return false;
    }

    // ロックチェック
    if (this.isResourceLocked(resourceId)) {
      this.logger.warn('リソースがロックされています', { resourceId });
      return false;
    }

    const deletedResource = tenantResources.splice(resourceIndex, 1)[0];
    this.resources.set(tenantId, tenantResources);

    // ロック情報もクリア
    this.resourceLocks.delete(resourceId);

    this.logger.info('リソースを削除しました', {
      resourceId,
      tenantId,
      type: deletedResource.type,
      name: deletedResource.name,
    });

    this.emit('resource-deleted', {
      resourceId,
      tenantId,
      resource: deletedResource,
    });
    return true;
  }

  /**
   * テナントの全リソースを取得
   */
  getTenantResources(
    tenantId: string,
    filters?: {
      type?: string;
      status?: string;
      tags?: string[];
    }
  ): TenantResource[] {
    let resources = this.resources.get(tenantId) || [];

    if (filters) {
      resources = resources.filter(resource => {
        if (filters.type && resource.type !== filters.type) {
          return false;
        }
        if (filters.status && resource.status !== filters.status) {
          return false;
        }
        if (filters.tags && filters.tags.length > 0) {
          return filters.tags.some(tag => resource.tags.includes(tag));
        }
        return true;
      });
    }

    return resources;
  }

  // ===== DNSゾーン管理 =====

  /**
   * DNSゾーンの作成
   */
  async createDNSZone(
    zoneData: Omit<TenantDNSZone, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantDNSZone | null> {
    // テナントの有効性確認
    if (!this.tenantCore.isTenantActive(zoneData.tenantId)) {
      this.logger.warn('非アクティブなテナントのDNSゾーン作成を拒否', {
        tenantId: zoneData.tenantId,
      });
      return null;
    }

    // 重複チェック
    const existingZones = this.dnsZones.get(zoneData.tenantId) || [];
    if (existingZones.some(zone => zone.name === zoneData.name)) {
      this.logger.warn('同名のDNSゾーンが既に存在します', {
        tenantId: zoneData.tenantId,
        zoneName: zoneData.name,
      });
      return null;
    }

    const zoneId = this.generateZoneId();
    const now = new Date();

    const zone: TenantDNSZone = {
      id: zoneId,
      ...zoneData,
      createdAt: now,
      updatedAt: now,
    };

    // テナント別ゾーンリストに追加
    const tenantZones = this.dnsZones.get(zoneData.tenantId) || [];
    tenantZones.push(zone);
    this.dnsZones.set(zoneData.tenantId, tenantZones);

    this.logger.info('新しいDNSゾーンを作成しました', {
      zoneId,
      tenantId: zoneData.tenantId,
      zoneName: zone.name,
      type: zone.type,
    });

    this.emit('dns-zone-created', { zone });
    return zone;
  }

  /**
   * DNSゾーンの取得
   */
  getDNSZone(tenantId: string, zoneId: string): TenantDNSZone | null {
    const tenantZones = this.dnsZones.get(tenantId) || [];
    return tenantZones.find(z => z.id === zoneId) || null;
  }

  /**
   * ゾーン名でDNSゾーンを取得
   */
  getDNSZoneByName(tenantId: string, zoneName: string): TenantDNSZone | null {
    const tenantZones = this.dnsZones.get(tenantId) || [];
    return tenantZones.find(z => z.name === zoneName) || null;
  }

  /**
   * DNSゾーンの更新
   */
  async updateDNSZone(
    tenantId: string,
    zoneId: string,
    updates: Partial<TenantDNSZone>
  ): Promise<TenantDNSZone | null> {
    const tenantZones = this.dnsZones.get(tenantId) || [];
    const zoneIndex = tenantZones.findIndex(z => z.id === zoneId);

    if (zoneIndex === -1) {
      return null;
    }

    const updatedZone: TenantDNSZone = {
      ...tenantZones[zoneIndex],
      ...updates,
      id: zoneId, // IDは変更不可
      tenantId, // テナントIDは変更不可
      updatedAt: new Date(),
    };

    tenantZones[zoneIndex] = updatedZone;
    this.dnsZones.set(tenantId, tenantZones);

    this.logger.info('DNSゾーンを更新しました', {
      zoneId,
      tenantId,
      zoneName: updatedZone.name,
      updates: Object.keys(updates),
    });

    this.emit('dns-zone-updated', {
      zoneId,
      tenantId,
      zone: updatedZone,
      updates,
    });
    return updatedZone;
  }

  /**
   * DNSゾーンの削除
   */
  async deleteDNSZone(tenantId: string, zoneId: string): Promise<boolean> {
    const tenantZones = this.dnsZones.get(tenantId) || [];
    const zoneIndex = tenantZones.findIndex(z => z.id === zoneId);

    if (zoneIndex === -1) {
      return false;
    }

    const deletedZone = tenantZones.splice(zoneIndex, 1)[0];
    this.dnsZones.set(tenantId, tenantZones);

    this.logger.info('DNSゾーンを削除しました', {
      zoneId,
      tenantId,
      zoneName: deletedZone.name,
      recordCount: deletedZone.records.length,
    });

    this.emit('dns-zone-deleted', { zoneId, tenantId, zone: deletedZone });
    return true;
  }

  /**
   * テナントの全DNSゾーンを取得
   */
  getTenantDNSZones(
    tenantId: string,
    filters?: {
      type?: string;
      status?: string;
    }
  ): TenantDNSZone[] {
    let zones = this.dnsZones.get(tenantId) || [];

    if (filters) {
      zones = zones.filter(zone => {
        if (filters.type && zone.type !== filters.type) {
          return false;
        }
        if (filters.status && zone.status !== filters.status) {
          return false;
        }
        return true;
      });
    }

    return zones;
  }

  // ===== DNSレコード管理 =====

  /**
   * DNSレコードの追加
   */
  async addDNSRecord(
    tenantId: string,
    zoneId: string,
    record: DNSRecord
  ): Promise<DNSRecord | null> {
    const zone = this.getDNSZone(tenantId, zoneId);
    if (!zone) {
      this.logger.warn('DNSゾーンが見つかりません', { tenantId, zoneId });
      return null;
    }

    // レコード数制限チェック
    const tenant = this.tenantCore.getTenant(tenantId);
    if (tenant && zone.records.length >= tenant.settings.maxDNSRecords) {
      this.logger.warn('DNSレコード数の上限に達しています', {
        tenantId,
        zoneId,
        limit: tenant.settings.maxDNSRecords,
      });
      return null;
    }

    zone.records.push(record);
    await this.updateDNSZone(tenantId, zoneId, { records: zone.records });

    this.logger.info('DNSレコードを追加しました', {
      tenantId,
      zoneId,
      recordType: record.type,
      recordName: record.name,
    });

    this.emit('dns-record-added', { tenantId, zoneId, record });
    return record;
  }

  /**
   * DNSレコードの削除
   */
  async removeDNSRecord(
    tenantId: string,
    zoneId: string,
    recordName: string,
    recordType: string
  ): Promise<boolean> {
    const zone = this.getDNSZone(tenantId, zoneId);
    if (!zone) {
      return false;
    }

    const initialLength = zone.records.length;
    zone.records = zone.records.filter(
      r => !(r.name === recordName && r.type === recordType)
    );

    if (zone.records.length === initialLength) {
      return false;
    }

    await this.updateDNSZone(tenantId, zoneId, { records: zone.records });

    this.logger.info('DNSレコードを削除しました', {
      tenantId,
      zoneId,
      recordName,
      recordType,
    });

    this.emit('dns-record-removed', {
      tenantId,
      zoneId,
      recordName,
      recordType,
    });
    return true;
  }

  /**
   * DNSレコードの検索
   */
  searchDNSRecords(
    tenantId: string,
    query: {
      name?: string;
      type?: string;
      value?: string;
      zoneId?: string;
    }
  ): DNSRecord[] {
    const zones = query.zoneId
      ? [this.getDNSZone(tenantId, query.zoneId)].filter(z => z !== null)
      : this.getTenantDNSZones(tenantId);

    const records: DNSRecord[] = [];

    zones.forEach(zone => {
      if (zone) {
        zone.records.forEach(record => {
          if (query.name && !record.name.includes(query.name)) {
            return;
          }
          if (query.type && record.type !== query.type) {
            return;
          }
          if (query.value && !record.value.includes(query.value)) {
            return;
          }
          records.push(record);
        });
      }
    });

    return records;
  }

  // ===== リソースロック管理 =====

  /**
   * リソースのロック
   */
  lockResource(resourceId: string, lockerId: string): boolean {
    const locks = this.resourceLocks.get(resourceId) || new Set();

    if (locks.size > 0 && !locks.has(lockerId)) {
      // 既に他者がロックしている
      return false;
    }

    locks.add(lockerId);
    this.resourceLocks.set(resourceId, locks);

    this.logger.debug('リソースをロックしました', { resourceId, lockerId });
    return true;
  }

  /**
   * リソースのアンロック
   */
  unlockResource(resourceId: string, lockerId: string): boolean {
    const locks = this.resourceLocks.get(resourceId);
    if (!locks || !locks.has(lockerId)) {
      return false;
    }

    locks.delete(lockerId);
    if (locks.size === 0) {
      this.resourceLocks.delete(resourceId);
    }

    this.logger.debug('リソースをアンロックしました', { resourceId, lockerId });
    return true;
  }

  /**
   * リソースのロック状態確認
   */
  private isResourceLocked(resourceId: string): boolean {
    const locks = this.resourceLocks.get(resourceId);
    return locks !== undefined && locks.size > 0;
  }

  // ===== ヘルパーメソッド =====

  /**
   * リソースID生成
   */
  private generateResourceId(): string {
    return `resource_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * ゾーンID生成
   */
  private generateZoneId(): string {
    return `zone_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 統計情報の取得
   */
  getStatistics(tenantId?: string): {
    totalResources: number;
    resourcesByType: Record<string, number>;
    totalDNSZones: number;
    totalDNSRecords: number;
    activeResources: number;
  } {
    let resources: TenantResource[] = [];
    let zones: TenantDNSZone[] = [];

    if (tenantId) {
      resources = this.resources.get(tenantId) || [];
      zones = this.dnsZones.get(tenantId) || [];
    } else {
      // 全テナント
      this.resources.forEach(tenantResources => {
        resources.push(...tenantResources);
      });
      this.dnsZones.forEach(tenantZones => {
        zones.push(...tenantZones);
      });
    }

    const resourcesByType: Record<string, number> = {};
    resources.forEach(resource => {
      resourcesByType[resource.type] =
        (resourcesByType[resource.type] || 0) + 1;
    });

    const totalDNSRecords = zones.reduce(
      (sum, zone) => sum + zone.records.length,
      0
    );

    return {
      totalResources: resources.length,
      resourcesByType,
      totalDNSZones: zones.length,
      totalDNSRecords,
      activeResources: resources.filter(r => r.status === 'active').length,
    };
  }

  /**
   * システム終了処理
   */
  shutdown(): void {
    this.removeAllListeners();
    this.logger.info('マルチテナントリソース管理システムを終了しました');
  }
}
