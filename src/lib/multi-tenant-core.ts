/**
 * マルチテナント コア管理
 * テナント・ユーザー管理の基盤機能
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type {
  Tenant,
  TenantUser,
} from './multi-tenant-types.js';

export class MultiTenantCore extends EventEmitter {
  private logger: Logger;
  private tenants: Map<string, Tenant> = new Map();
  private users: Map<string, TenantUser> = new Map();
  private usersByTenant: Map<string, Set<string>> = new Map();

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
  }

  // ===== テナント管理 =====

  /**
   * テナントの作成
   */
  async createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const tenantId = this.generateTenantId();
    const now = new Date();

    const tenant: Tenant = {
      id: tenantId,
      ...tenantData,
      createdAt: now,
      updatedAt: now,
    };

    this.tenants.set(tenantId, tenant);
    this.usersByTenant.set(tenantId, new Set());

    this.logger.info('新しいテナントを作成しました', {
      tenantId,
      name: tenant.name,
      domain: tenant.domain,
    });

    this.emit('tenant-created', { tenant });
    return tenant;
  }

  /**
   * テナントの取得
   */
  getTenant(tenantId: string): Tenant | null {
    return this.tenants.get(tenantId) || null;
  }

  /**
   * テナントの更新
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      id: tenantId, // IDは変更不可
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);

    this.logger.info('テナントを更新しました', {
      tenantId,
      updates: Object.keys(updates),
    });

    this.emit('tenant-updated', { tenantId, tenant: updatedTenant, updates });
    return updatedTenant;
  }

  /**
   * テナントの削除
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    // 関連するユーザーも削除
    const userIds = this.usersByTenant.get(tenantId) || new Set();
    for (const userId of userIds) {
      this.users.delete(userId);
    }

    this.tenants.delete(tenantId);
    this.usersByTenant.delete(tenantId);

    this.logger.info('テナントを削除しました', {
      tenantId,
      name: tenant.name,
      deletedUsers: userIds.size,
    });

    this.emit('tenant-deleted', { tenantId, tenant });
    return true;
  }

  /**
   * 全テナントの取得
   */
  getAllTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * テナントの検索
   */
  searchTenants(query: {
    name?: string;
    domain?: string;
    plan?: string;
    status?: string;
  }): Tenant[] {
    return Array.from(this.tenants.values()).filter(tenant => {
      if (query.name && !tenant.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      if (query.domain && !tenant.domain.toLowerCase().includes(query.domain.toLowerCase())) {
        return false;
      }
      if (query.plan && tenant.plan !== query.plan) {
        return false;
      }
      if (query.status && tenant.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  // ===== ユーザー管理 =====

  /**
   * ユーザーの作成
   */
  async createUser(userData: Omit<TenantUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantUser | null> {
    // テナントの存在確認
    if (!this.tenants.has(userData.tenantId)) {
      this.logger.warn('存在しないテナントにユーザーを作成しようとしました', {
        tenantId: userData.tenantId,
      });
      return null;
    }

    const userId = this.generateUserId();
    const now = new Date();

    const user: TenantUser = {
      id: userId,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(userId, user);
    
    // テナント-ユーザー関連を記録
    const tenantUsers = this.usersByTenant.get(userData.tenantId) || new Set();
    tenantUsers.add(userId);
    this.usersByTenant.set(userData.tenantId, tenantUsers);

    this.logger.info('新しいユーザーを作成しました', {
      userId,
      tenantId: userData.tenantId,
      email: user.email,
      role: user.role,
    });

    this.emit('user-created', { user });
    return user;
  }

  /**
   * ユーザーの取得
   */
  getUser(userId: string): TenantUser | null {
    return this.users.get(userId) || null;
  }

  /**
   * ユーザーの更新
   */
  async updateUser(userId: string, updates: Partial<TenantUser>): Promise<TenantUser | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    const updatedUser: TenantUser = {
      ...user,
      ...updates,
      id: userId, // IDは変更不可
      tenantId: user.tenantId, // テナントIDは変更不可
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);

    this.logger.info('ユーザーを更新しました', {
      userId,
      tenantId: user.tenantId,
      updates: Object.keys(updates),
    });

    this.emit('user-updated', { userId, user: updatedUser, updates });
    return updatedUser;
  }

  /**
   * ユーザーの削除
   */
  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    this.users.delete(userId);

    // テナント-ユーザー関連からも削除
    const tenantUsers = this.usersByTenant.get(user.tenantId);
    if (tenantUsers) {
      tenantUsers.delete(userId);
    }

    this.logger.info('ユーザーを削除しました', {
      userId,
      tenantId: user.tenantId,
      email: user.email,
    });

    this.emit('user-deleted', { userId, user });
    return true;
  }

  /**
   * テナントのユーザー一覧を取得
   */
  getTenantUsers(tenantId: string): TenantUser[] {
    const userIds = this.usersByTenant.get(tenantId) || new Set();
    return Array.from(userIds)
      .map(userId => this.users.get(userId))
      .filter((user): user is TenantUser => user !== undefined);
  }

  /**
   * ユーザーの検索
   */
  searchUsers(query: {
    tenantId?: string;
    email?: string;
    role?: string;
    status?: string;
  }): TenantUser[] {
    return Array.from(this.users.values()).filter(user => {
      if (query.tenantId && user.tenantId !== query.tenantId) {
        return false;
      }
      if (query.email && !user.email.toLowerCase().includes(query.email.toLowerCase())) {
        return false;
      }
      if (query.role && user.role !== query.role) {
        return false;
      }
      if (query.status && user.status !== query.status) {
        return false;
      }
      return true;
    });
  }

  // ===== 権限管理 =====

  /**
   * ユーザーの権限チェック
   */
  hasPermission(userId: string, permission: string): boolean {
    const user = this.users.get(userId);
    if (!user || user.status !== 'active') {
      return false;
    }

    return user.permissions.includes(permission) || this.getRolePermissions(user.role).includes(permission);
  }

  /**
   * ロールの基本権限を取得
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      owner: ['*'], // すべての権限
      admin: [
        'tenant:read',
        'tenant:write',
        'user:read',
        'user:write',
        'resource:read',
        'resource:write',
        'billing:read',
        'audit:read',
      ],
      editor: [
        'tenant:read',
        'user:read',
        'resource:read',
        'resource:write',
      ],
      viewer: [
        'tenant:read',
        'user:read',
        'resource:read',
      ],
    };

    return rolePermissions[role] || [];
  }

  /**
   * テナントの有効性チェック
   */
  isTenantActive(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    return tenant?.status === 'active';
  }

  // ===== ヘルパーメソッド =====

  /**
   * テナントID生成
   */
  private generateTenantId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * ユーザーID生成
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    activeUsers: number;
    tenantsByPlan: Record<string, number>;
    usersByRole: Record<string, number>;
  } {
    const tenants = Array.from(this.tenants.values());
    const users = Array.from(this.users.values());

    const tenantsByPlan: Record<string, number> = {};
    const usersByRole: Record<string, number> = {};

    tenants.forEach(tenant => {
      tenantsByPlan[tenant.plan] = (tenantsByPlan[tenant.plan] || 0) + 1;
    });

    users.forEach(user => {
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
    });

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === 'active').length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      tenantsByPlan,
      usersByRole,
    };
  }

  /**
   * システム終了処理
   */
  shutdown(): void {
    this.removeAllListeners();
    this.logger.info('マルチテナントコアシステムを終了しました');
  }
}