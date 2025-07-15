/**
 * 企業級認可システム
 *
 * 役割、権限、アクセス制御機能を提供
 */

import { EventEmitter } from 'events';

import type {
  User,
  Role,
  Permission,
  AccessRequest,
  AccessResponse,
  SecurityPolicy,
  SecurityRule,
  EnterpriseAccessControlConfig,
} from './enterprise-access-control-types.js';
import type { Logger } from './logger.js';

export class EnterpriseAuthorization extends EventEmitter {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private logger: Logger;
  private config: EnterpriseAccessControlConfig;

  constructor(logger: Logger, config: EnterpriseAccessControlConfig) {
    super();
    this.logger = logger;
    this.config = config;
    this.initializeSystemRoles();
    this.initializeSystemPermissions();
  }

  /**
   * アクセス制御チェック
   */
  async checkAccess(
    user: User,
    request: AccessRequest
  ): Promise<AccessResponse> {
    const startTime = Date.now();

    try {
      // 基本的な権限チェック
      const hasBasicPermission = this.hasPermission(
        user,
        request.resource,
        request.action
      );

      if (!hasBasicPermission) {
        return {
          granted: false,
          reason: '権限が不足しています',
          warnings: [],
          policies: [],
          riskScore: 0,
        };
      }

      // リスクスコア計算
      const riskScore = this.calculateRiskScore(user, request);

      // セキュリティポリシーの適用
      const policyResult = this.applySecurityPolicies(user, request, riskScore);

      // 最終的なアクセス決定
      const granted =
        policyResult.action === 'allow' || policyResult.action === 'warn';

      const response: AccessResponse = {
        granted,
        reason: policyResult.reason,
        requiredMfa: policyResult.action === 'require-mfa',
        warnings: policyResult.warnings,
        policies: policyResult.policies,
        riskScore,
        additionalChecks: policyResult.additionalChecks,
      };

      // 監査ログ
      this.logger.info('アクセス制御チェック完了', {
        userId: user.id,
        resource: request.resource,
        action: request.action,
        granted,
        riskScore,
        duration: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      this.logger.error('アクセス制御エラー', error as Error, {
        userId: user.id,
        resource: request.resource,
        action: request.action,
      });

      return {
        granted: false,
        reason: 'アクセス制御処理中にエラーが発生しました',
        warnings: [],
        policies: [],
        riskScore: 100, // エラー時は最高リスクスコア
      };
    }
  }

  /**
   * 権限チェック
   */
  hasPermission(user: User, resource: string, action: string): boolean {
    const requiredPermission = `${resource}:${action}`;

    // 直接的な権限チェック
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // 管理者権限チェック
    if (
      user.permissions.includes('admin:*') ||
      user.permissions.includes('*:*')
    ) {
      return true;
    }

    // ワイルドカード権限チェック
    if (user.permissions.includes(`${resource}:*`)) {
      return true;
    }

    // 役割ベースの権限チェック
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        if (
          role.permissions.includes(requiredPermission) ||
          role.permissions.includes(`${resource}:*`) ||
          role.permissions.includes('*:*')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * リスクスコア計算
   */
  private calculateRiskScore(user: User, request: AccessRequest): number {
    let score = 0;

    // 時間ベースのリスク
    const hour = new Date().getHours();
    if (hour < 7 || hour > 22) {
      score += 10;
    }

    // IP アドレスベースのリスク
    if (
      user.ipWhitelist.length > 0 &&
      !user.ipWhitelist.includes(request.ipAddress)
    ) {
      score += 30;
    }

    // 最終ログイン時刻ベースのリスク
    if (user.lastLoginAt) {
      const daysSinceLastLogin =
        (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastLogin > 30) {
        score += 15;
      }
    }

    // 権限レベルベースのリスク
    const highRiskActions = ['delete', 'manage', 'admin'];
    if (highRiskActions.includes(request.action)) {
      score += 20;
    }

    // 高権限リソースベースのリスク
    const highRiskResources = ['user', 'role', 'organization', 'tenant'];
    if (highRiskResources.includes(request.resource)) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * セキュリティポリシーの適用
   */
  private applySecurityPolicies(
    user: User,
    request: AccessRequest,
    riskScore: number
  ): {
    action: 'allow' | 'deny' | 'warn' | 'require-mfa';
    reason?: string;
    policy?: string;
    warnings: string[];
    policies: string[];
    additionalChecks: string[];
  } {
    const result = {
      action: 'allow' as 'allow' | 'deny' | 'warn' | 'require-mfa',
      reason: undefined as string | undefined,
      policy: undefined as string | undefined,
      warnings: [] as string[],
      policies: [] as string[],
      additionalChecks: [] as string[],
    };

    // 適用可能なポリシーを取得
    const applicablePolicies = Array.from(
      this.securityPolicies.values()
    ).filter(policy => {
      if (!policy.isActive) return false;
      if (policy.tenantId && !user.tenantIds.includes(policy.tenantId))
        return false;
      if (
        policy.organizationId &&
        user.organizationId !== policy.organizationId
      )
        return false;
      return true;
    });

    // ポリシーの適用
    for (const policy of applicablePolicies) {
      for (const rule of policy.rules.sort((a, b) => a.priority - b.priority)) {
        if (this.evaluateRuleCondition(rule, user, request, riskScore)) {
          result.policies.push(policy.name);

          if (rule.action === 'deny') {
            result.action = 'deny';
            result.reason = `セキュリティポリシー「${policy.name}」により拒否されました`;
            result.policy = policy.name;
            return result;
          }

          if (rule.action === 'require-mfa') {
            result.action = 'require-mfa';
            result.reason = `セキュリティポリシー「${policy.name}」によりMFA認証が必要です`;
            result.policy = policy.name;
            result.additionalChecks.push('mfa');
          }

          if (rule.action === 'warn') {
            result.warnings.push(
              `セキュリティポリシー「${policy.name}」による警告: ${rule.name}`
            );
          }
        }
      }
    }

    // 高リスクスコアの場合の追加チェック
    if (riskScore > this.config.riskScoreThreshold) {
      result.action = 'require-mfa';
      result.reason = `高リスクスコア (${riskScore}) のためMFA認証が必要です`;
      result.additionalChecks.push('mfa');
    }

    return result;
  }

  /**
   * ルール条件の評価
   */
  private evaluateRuleCondition(
    rule: SecurityRule,
    user: User,
    request: AccessRequest,
    riskScore: number
  ): boolean {
    try {
      // 簡単な条件評価（実際の実装では専用のルールエンジンを使用）
      const context = {
        user,
        request,
        riskScore,
        time: new Date(),
        dayOfWeek: new Date().getDay(),
        hour: new Date().getHours(),
      };

      // 条件文字列の評価（実際の実装では安全な評価エンジンを使用）
      return this.evaluateConditionString(rule.condition, context);
    } catch (error) {
      this.logger.warn('ルール条件評価エラー', {
        ruleId: rule.id,
        condition: rule.condition,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 条件文字列の評価
   */
  private evaluateConditionString(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    // 簡単な条件評価の実装例
    // 実際の実装では、より安全で柔軟な評価エンジンを使用

    if (condition === 'always') return true;
    if (condition === 'never') return false;

    if (condition.includes('riskScore >')) {
      const threshold = parseInt(condition.split('riskScore >')[1].trim());
      return (
        typeof context.riskScore === 'number' && context.riskScore > threshold
      );
    }

    if (condition.includes('hour between')) {
      const match = condition.match(/hour between (\d+) and (\d+)/);
      if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        const currentHour =
          typeof context.hour === 'number'
            ? context.hour
            : new Date().getHours();
        return currentHour >= start && currentHour <= end;
      }
    }

    if (condition.includes('action ==')) {
      const action = condition
        .split('action ==')[1]
        .trim()
        .replace(/['"]/g, '');
      const request = context.request as { action?: string };
      return request?.action === action;
    }

    if (condition.includes('resource ==')) {
      const resource = condition
        .split('resource ==')[1]
        .trim()
        .replace(/['"]/g, '');
      const request = context.request as { resource?: string };
      return request?.resource === resource;
    }

    return false;
  }

  /**
   * システム役割の初期化
   */
  private initializeSystemRoles(): void {
    const systemRoles: Omit<Role, 'id'>[] = [
      {
        name: 'super-admin',
        description: 'システム全体の管理者',
        permissions: ['*:*'],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'organization-admin',
        description: '組織管理者',
        permissions: [
          'organization:*',
          'tenant:*',
          'user:*',
          'role:*',
          'dns:*',
          'domain:*',
        ],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'tenant-admin',
        description: 'テナント管理者',
        permissions: [
          'tenant:read',
          'user:manage',
          'role:manage',
          'dns:manage',
          'domain:manage',
        ],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'dns-admin',
        description: 'DNS管理者',
        permissions: ['dns:*', 'domain:*'],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'user',
        description: '一般ユーザー',
        permissions: ['dns:read', 'domain:read'],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    systemRoles.forEach(role => {
      const id = `role-${role.name}`;
      this.roles.set(id, { ...role, id });
    });
  }

  /**
   * システム権限の初期化
   */
  private initializeSystemPermissions(): void {
    const systemPermissions: Omit<Permission, 'id'>[] = [
      // 組織管理
      {
        name: 'organization:manage',
        description: '組織の管理',
        resource: 'organization',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'organization:read',
        description: '組織の閲覧',
        resource: 'organization',
        action: 'read',
        isSystemPermission: true,
      },
      // テナント管理
      {
        name: 'tenant:manage',
        description: 'テナントの管理',
        resource: 'tenant',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'tenant:read',
        description: 'テナントの閲覧',
        resource: 'tenant',
        action: 'read',
        isSystemPermission: true,
      },
      // ユーザー管理
      {
        name: 'user:manage',
        description: 'ユーザーの管理',
        resource: 'user',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'user:read',
        description: 'ユーザーの閲覧',
        resource: 'user',
        action: 'read',
        isSystemPermission: true,
      },
      // 役割管理
      {
        name: 'role:manage',
        description: '役割の管理',
        resource: 'role',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'role:read',
        description: '役割の閲覧',
        resource: 'role',
        action: 'read',
        isSystemPermission: true,
      },
      // DNS管理
      {
        name: 'dns:manage',
        description: 'DNSの管理',
        resource: 'dns',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'dns:read',
        description: 'DNSの閲覧',
        resource: 'dns',
        action: 'read',
        isSystemPermission: true,
      },
      // ドメイン管理
      {
        name: 'domain:manage',
        description: 'ドメインの管理',
        resource: 'domain',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'domain:read',
        description: 'ドメインの閲覧',
        resource: 'domain',
        action: 'read',
        isSystemPermission: true,
      },
    ];

    systemPermissions.forEach(permission => {
      const id = `permission-${permission.resource}-${permission.action}`;
      this.permissions.set(id, { ...permission, id });
    });
  }

  /**
   * 役割管理メソッド
   */
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    const id = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRole: Role = {
      ...role,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.roles.set(id, newRole);

    this.logger.info('役割作成', {
      roleId: id,
      name: role.name,
      permissions: role.permissions,
    });

    return newRole;
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  updateRole(roleId: string, updates: Partial<Role>): Role | undefined {
    const role = this.roles.get(roleId);
    if (role) {
      const updatedRole = { ...role, ...updates, updatedAt: new Date() };
      this.roles.set(roleId, updatedRole);

      this.logger.info('役割更新', {
        roleId,
        updates,
      });

      return updatedRole;
    }
    return undefined;
  }

  deleteRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (role && !role.isSystemRole) {
      this.roles.delete(roleId);

      this.logger.info('役割削除', {
        roleId,
        name: role.name,
      });

      return true;
    }
    return false;
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * 権限管理メソッド
   */
  createPermission(permission: Omit<Permission, 'id'>): Permission {
    const id = `permission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPermission: Permission = { ...permission, id };

    this.permissions.set(id, newPermission);

    this.logger.info('権限作成', {
      permissionId: id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
    });

    return newPermission;
  }

  getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  listPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * セキュリティポリシー管理メソッド
   */
  createSecurityPolicy(
    policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): SecurityPolicy {
    const id = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPolicy: SecurityPolicy = {
      ...policy,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.securityPolicies.set(id, newPolicy);

    this.logger.info('セキュリティポリシー作成', {
      policyId: id,
      name: policy.name,
      rulesCount: policy.rules.length,
    });

    return newPolicy;
  }

  getSecurityPolicy(policyId: string): SecurityPolicy | undefined {
    return this.securityPolicies.get(policyId);
  }

  updateSecurityPolicy(
    policyId: string,
    updates: Partial<SecurityPolicy>
  ): SecurityPolicy | undefined {
    const policy = this.securityPolicies.get(policyId);
    if (policy) {
      const updatedPolicy = { ...policy, ...updates, updatedAt: new Date() };
      this.securityPolicies.set(policyId, updatedPolicy);

      this.logger.info('セキュリティポリシー更新', {
        policyId,
        updates,
      });

      return updatedPolicy;
    }
    return undefined;
  }

  deleteSecurityPolicy(policyId: string): boolean {
    const deleted = this.securityPolicies.delete(policyId);
    if (deleted) {
      this.logger.info('セキュリティポリシー削除', { policyId });
    }
    return deleted;
  }

  listSecurityPolicies(): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values());
  }
}
