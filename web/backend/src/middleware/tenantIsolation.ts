/**
 * DNSweeper テナント分離ミドルウェア
 * 
 * アカウント別データ分離・マルチテナント対応
 */

import { Request, Response, NextFunction } from 'express';
import type { Account } from '../types/auth';

// リクエストにテナント情報を追加
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: Account;
      isIsolated?: boolean;
    }
  }
}

/**
 * テナント分離の強制適用
 */
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.account) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TENANT_CONTEXT',
        message: 'テナントコンテキストが必要です'
      }
    });
  }

  // テナント情報をリクエストに設定
  req.tenantId = req.account.id;
  req.tenant = req.account;
  req.isIsolated = true;

  next();
};

/**
 * データクエリにテナント条件を自動追加するヘルパー
 */
export class TenantQueryBuilder {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * DNS レコードクエリにテナント条件追加
   */
  addDnsRecordFilter(query: any): any {
    return {
      ...query,
      accountId: this.tenantId
    };
  }

  /**
   * 変更履歴クエリにテナント条件追加
   */
  addChangeHistoryFilter(query: any): any {
    return {
      ...query,
      accountId: this.tenantId
    };
  }

  /**
   * 汎用的なテナントフィルター追加
   */
  addTenantFilter(query: any, tenantField: string = 'accountId'): any {
    return {
      ...query,
      [tenantField]: this.tenantId
    };
  }

  /**
   * ファイルパスにテナントID追加
   */
  getTenantFilePath(basePath: string, filename: string): string {
    return `${basePath}/${this.tenantId}/${filename}`;
  }

  /**
   * テナント専用のキャッシュキー生成
   */
  getTenantCacheKey(baseKey: string): string {
    return `tenant:${this.tenantId}:${baseKey}`;
  }
}

/**
 * リクエストからテナントクエリビルダーを取得
 */
export const getTenantQueryBuilder = (req: Request): TenantQueryBuilder => {
  if (!req.tenantId) {
    throw new Error('Tenant context not available');
  }
  return new TenantQueryBuilder(req.tenantId);
};

/**
 * テナント別ファイルストレージ管理
 */
export class TenantFileManager {
  private tenantId: string;
  private baseUploadDir: string;

  constructor(tenantId: string, baseUploadDir: string = 'uploads') {
    this.tenantId = tenantId;
    this.baseUploadDir = baseUploadDir;
  }

  /**
   * テナント専用のアップロードディレクトリパス取得
   */
  getUploadDir(): string {
    return `${this.baseUploadDir}/${this.tenantId}`;
  }

  /**
   * テナント専用のファイルパス取得
   */
  getFilePath(filename: string, subdirectory?: string): string {
    const subdir = subdirectory ? `/${subdirectory}` : '';
    return `${this.getUploadDir()}${subdir}/${filename}`;
  }

  /**
   * テナント専用の一時ディレクトリパス取得
   */
  getTempDir(): string {
    return `${this.getUploadDir()}/temp`;
  }

  /**
   * アップロード容量制限チェック
   */
  async checkStorageQuota(additionalBytes: number): Promise<boolean> {
    // TODO: 実際のディスク使用量チェック実装
    // const currentUsage = await this.calculateStorageUsage();
    // const quota = await this.getStorageQuota();
    // return (currentUsage + additionalBytes) <= quota;
    return true; // 一時的に常に true を返す
  }

  /**
   * テナントのストレージ使用量計算
   */
  async calculateStorageUsage(): Promise<number> {
    // TODO: ディスク使用量計算実装
    return 0;
  }
}

/**
 * テナント別設定管理
 */
export class TenantConfigManager {
  private tenantId: string;
  private configs: Map<string, any> = new Map();

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * テナント設定の取得
   */
  get<T>(key: string, defaultValue?: T): T {
    const fullKey = `${this.tenantId}:${key}`;
    return this.configs.get(fullKey) ?? defaultValue;
  }

  /**
   * テナント設定の保存
   */
  set<T>(key: string, value: T): void {
    const fullKey = `${this.tenantId}:${key}`;
    this.configs.set(fullKey, value);
  }

  /**
   * DNS設定の取得
   */
  getDnsSettings(): any {
    return this.get('dns_settings', {
      defaultTtl: 300,
      allowedRecordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT'],
      maxRecordsPerZone: 100
    });
  }

  /**
   * API制限設定の取得
   */
  getApiLimits(): any {
    return this.get('api_limits', {
      requestsPerHour: 1000,
      requestsPerMinute: 60,
      maxPayloadSize: '10mb'
    });
  }

  /**
   * ファイルアップロード設定の取得
   */
  getUploadSettings(): any {
    return this.get('upload_settings', {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.csv', '.txt', '.json'],
      scanForMalware: true
    });
  }
}

/**
 * テナント分離ユーティリティクラス
 */
export class TenantIsolationUtils {
  /**
   * リソースIDにテナントプレフィックスを追加
   */
  static addTenantPrefix(tenantId: string, resourceId: string): string {
    return `${tenantId}:${resourceId}`;
  }

  /**
   * リソースIDからテナントプレフィックスを除去
   */
  static removeTenantPrefix(resourceId: string): { tenantId: string; actualId: string } {
    const parts = resourceId.split(':', 2);
    if (parts.length !== 2) {
      throw new Error('Invalid tenant-prefixed resource ID');
    }
    return {
      tenantId: parts[0],
      actualId: parts[1]
    };
  }

  /**
   * テナント間でのリソースアクセス検証
   */
  static validateTenantAccess(requesterTenantId: string, resourceTenantId: string): boolean {
    return requesterTenantId === resourceTenantId;
  }

  /**
   * クロステナントアクセスのログ記録
   */
  static logCrossTenantAccess(
    requesterTenantId: string,
    targetTenantId: string,
    resource: string,
    action: string,
    allowed: boolean
  ): void {
    console.warn(`Cross-tenant access attempt: ${requesterTenantId} -> ${targetTenantId} (${resource}:${action}) = ${allowed}`);
  }
}

/**
 * テナント分離のためのデータベース抽象化レイヤー
 */
export class TenantAwareDataAccess {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * テナント別のDNSレコード取得
   */
  async getDnsRecords(filter: any = {}): Promise<any[]> {
    const tenantFilter = { ...filter, accountId: this.tenantId };
    // TODO: 実際のデータベースクエリ実装
    return [];
  }

  /**
   * テナント別の変更履歴取得
   */
  async getChangeHistory(filter: any = {}): Promise<any[]> {
    const tenantFilter = { ...filter, accountId: this.tenantId };
    // TODO: 実際のデータベースクエリ実装
    return [];
  }

  /**
   * テナント別の統計データ取得
   */
  async getStatistics(dateRange: { from: Date; to: Date }): Promise<any> {
    // TODO: テナント固有の統計計算実装
    return {
      totalRecords: 0,
      totalChanges: 0,
      uniqueDomains: 0
    };
  }

  /**
   * テナント設定の取得・更新
   */
  async getTenantSettings(): Promise<any> {
    // TODO: テナント設定のデータベース取得実装
    return {};
  }

  async updateTenantSettings(settings: any): Promise<void> {
    // TODO: テナント設定のデータベース更新実装
  }
}

// Express ミドルウェアとしてエクスポート
export const tenantIsolation = {
  enforce: enforceTenantIsolation,
  getQueryBuilder: getTenantQueryBuilder,
  FileManager: TenantFileManager,
  ConfigManager: TenantConfigManager,
  Utils: TenantIsolationUtils,
  DataAccess: TenantAwareDataAccess
};