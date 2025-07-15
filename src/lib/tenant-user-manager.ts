/**
 * テナントユーザー管理モジュール
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type {
  Tenant,
  TenantUser,
  TenantQuota,
  TenantUserCreateOptions,
} from './multi-tenant-types.js';

export class TenantUserManager extends EventEmitter {
  private logger: Logger;
  private users: Map<string, TenantUser> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * ユーザーの作成
   */
  async createUser(
    options: TenantUserCreateOptions,
    tenant: Tenant,
    quota?: TenantQuota
  ): Promise<TenantUser> {
    // クォータチェック
    if (quota && quota.current.users >= quota.limits.users) {
      throw new Error('ユーザー数の上限に達しています');
    }

    // 既存ユーザーのチェック
    const existingUser = this.getUserByEmail(options.tenantId, options.email);
    if (existingUser) {
      throw new Error(`ユーザーは既に存在します: ${options.email}`);
    }

    const userId = randomUUID();

    const user: TenantUser = {
      id: userId,
      tenantId: options.tenantId,
      email: options.email,
      role: options.role,
      permissions: options.permissions || this.getDefaultPermissions(options.role),
      status: 'invited',
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: options.profile,
      mfa: {
        enabled: false,
      },
    };

    this.users.set(userId, user);

    this.logger.info('新しいユーザーを作成しました', {
      userId,
      tenantId: options.tenantId,
      email: user.email,
      role: user.role,
    });

    this.emit('user:created', user);
    return user;
  }

  private getDefaultPermissions(role: TenantUser['role']): string[] {
    switch (role) {
      case 'owner':
        return [
          'tenant:read',
          'tenant:write',
          'tenant:delete',
          'user:read',
          'user:write',
          'user:delete',
          'dns:read',
          'dns:write',
          'dns:delete',
          'billing:read',
          'billing:write',
          'audit:read',
        ];
      case 'admin':
        return [
          'tenant:read',
          'tenant:write',
          'user:read',
          'user:write',
          'dns:read',
          'dns:write',
          'dns:delete',
          'billing:read',
          'audit:read',
        ];
      case 'editor':
        return [
          'tenant:read',
          'user:read',
          'dns:read',
          'dns:write',
          'billing:read',
        ];
      case 'viewer':
        return [
          'tenant:read',
          'user:read',
          'dns:read',
          'billing:read',
        ];
      default:
        return ['tenant:read', 'dns:read'];
    }
  }

  /**
   * ユーザーの更新
   */
  async updateUser(
    userId: string,
    updates: Partial<Omit<TenantUser, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<TenantUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    const updatedUser: TenantUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);

    this.logger.info('ユーザーを更新しました', {
      userId,
      tenantId: user.tenantId,
      changes: Object.keys(updates),
    });

    this.emit('user:updated', updatedUser);
    return updatedUser;
  }

  /**
   * ユーザーの削除
   */
  async deleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    // オーナーの削除をチェック
    if (user.role === 'owner') {
      const tenantUsers = this.getUsersByTenant(user.tenantId);
      const owners = tenantUsers.filter(u => u.role === 'owner');
      if (owners.length === 1) {
        throw new Error('テナントには少なくとも1人のオーナーが必要です');
      }
    }

    this.users.delete(userId);

    this.logger.info('ユーザーを削除しました', {
      userId,
      tenantId: user.tenantId,
      email: user.email,
    });

    this.emit('user:deleted', { userId, user });
  }

  /**
   * ユーザーの取得
   */
  getUser(userId: string): TenantUser | undefined {
    return this.users.get(userId);
  }

  /**
   * メールアドレスでユーザーを取得
   */
  getUserByEmail(tenantId: string, email: string): TenantUser | undefined {
    return Array.from(this.users.values()).find(
      user => user.tenantId === tenantId && user.email === email
    );
  }

  /**
   * テナントのユーザー一覧を取得
   */
  getUsersByTenant(tenantId: string): TenantUser[] {
    return Array.from(this.users.values()).filter(
      user => user.tenantId === tenantId
    );
  }

  /**
   * アクティブなユーザー数を取得
   */
  getActiveUserCount(tenantId: string): number {
    return this.getUsersByTenant(tenantId).filter(
      user => user.status === 'active'
    ).length;
  }

  /**
   * ユーザーの権限チェック
   */
  hasPermission(userId: string, permission: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    return user.permissions.includes(permission) || user.role === 'owner';
  }

  /**
   * ユーザーをテナントに追加
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: TenantUser['role'] = 'viewer'
  ): Promise<TenantUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    if (user.tenantId === tenantId) {
      throw new Error('ユーザーは既にこのテナントに属しています');
    }

    // テナントを変更するため、直接更新
    const updatedUser: TenantUser = {
      ...user,
      tenantId,
      role,
      permissions: this.getDefaultPermissions(role),
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);

    this.logger.info('ユーザーをテナントに追加しました', {
      userId,
      tenantId,
      role,
    });

    this.emit('user:added-to-tenant', { userId, tenantId, role });
    return updatedUser;
  }

  /**
   * ユーザーをテナントから削除
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    if (user.tenantId !== tenantId) {
      throw new Error('ユーザーはこのテナントに属していません');
    }

    await this.deleteUser(userId);

    this.logger.info('ユーザーをテナントから削除しました', {
      userId,
      tenantId,
    });

    this.emit('user:removed-from-tenant', { userId, tenantId });
  }

  /**
   * ユーザーのロール変更
   */
  async changeUserRole(
    userId: string,
    newRole: TenantUser['role']
  ): Promise<TenantUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    // オーナーの変更をチェック
    if (user.role === 'owner' && newRole !== 'owner') {
      const tenantUsers = this.getUsersByTenant(user.tenantId);
      const owners = tenantUsers.filter(u => u.role === 'owner');
      if (owners.length === 1) {
        throw new Error('テナントには少なくとも1人のオーナーが必要です');
      }
    }

    const updatedUser = await this.updateUser(userId, {
      role: newRole,
      permissions: this.getDefaultPermissions(newRole),
    });

    this.logger.info('ユーザーのロールを変更しました', {
      userId,
      tenantId: user.tenantId,
      oldRole: user.role,
      newRole,
    });

    this.emit('user:role-changed', { userId, oldRole: user.role, newRole });
    return updatedUser;
  }

  /**
   * ユーザーのMFA設定
   */
  async enableMFA(
    userId: string,
    method: TenantUser['mfa']['method'],
    backupCodes?: string[]
  ): Promise<TenantUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    const updatedUser = await this.updateUser(userId, {
      mfa: {
        enabled: true,
        method,
        backupCodes,
      },
    });

    this.logger.info('ユーザーのMFAを有効化しました', {
      userId,
      tenantId: user.tenantId,
      method,
    });

    this.emit('user:mfa-enabled', { userId, method });
    return updatedUser;
  }

  /**
   * ユーザーのMFA無効化
   */
  async disableMFA(userId: string): Promise<TenantUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    const updatedUser = await this.updateUser(userId, {
      mfa: {
        enabled: false,
      },
    });

    this.logger.info('ユーザーのMFAを無効化しました', {
      userId,
      tenantId: user.tenantId,
    });

    this.emit('user:mfa-disabled', { userId });
    return updatedUser;
  }

  /**
   * ユーザーの最終ログイン時刻を更新
   */
  async updateLastLogin(userId: string): Promise<TenantUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`ユーザーが見つかりません: ${userId}`);
    }

    return this.updateUser(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * 全ユーザーの取得
   */
  getAllUsers(): TenantUser[] {
    return Array.from(this.users.values());
  }

  /**
   * ユーザー統計の取得
   */
  getUserStatistics(tenantId?: string): {
    totalUsers: number;
    activeUsers: number;
    invitedUsers: number;
    suspendedUsers: number;
    usersByRole: Record<TenantUser['role'], number>;
    mfaEnabledUsers: number;
  } {
    const users = tenantId 
      ? this.getUsersByTenant(tenantId)
      : this.getAllUsers();

    const usersByRole = {
      owner: 0,
      admin: 0,
      editor: 0,
      viewer: 0,
    };

    let activeUsers = 0;
    let invitedUsers = 0;
    let suspendedUsers = 0;
    let mfaEnabledUsers = 0;

    for (const user of users) {
      usersByRole[user.role]++;
      
      switch (user.status) {
        case 'active':
          activeUsers++;
          break;
        case 'invited':
          invitedUsers++;
          break;
        case 'suspended':
          suspendedUsers++;
          break;
      }

      if (user.mfa.enabled) {
        mfaEnabledUsers++;
      }
    }

    return {
      totalUsers: users.length,
      activeUsers,
      invitedUsers,
      suspendedUsers,
      usersByRole,
      mfaEnabledUsers,
    };
  }
}