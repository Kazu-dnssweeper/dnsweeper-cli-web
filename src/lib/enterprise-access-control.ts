/**
 * 企業級アクセス制御・監査システム
 *
 * エンタープライズ環境での高度なアクセス制御と包括的監査機能
 * - 階層型権限管理
 * - 多要素認証 (MFA)
 * - 詳細な監査ログ
 * - コンプライアンス対応
 * - セキュリティポリシー適用
 */

import { randomUUID, createHash, createHmac } from 'crypto';
import { EventEmitter } from 'events';

import { Logger } from './logger.js';

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  tenantIds: string[];
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'suspended' | 'disabled';
  loginAttempts: number;
  lockoutUntil?: Date;
  passwordChangedAt: Date;
  sessionTimeout: number;
  ipWhitelist: string[];
  deviceFingerprints: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  tenantId?: string;
  organizationId?: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: {
    [key: string]: any;
  };
  isSystemPermission: boolean;
}

export interface AuditEvent {
  id: string;
  userId: string;
  userEmail: string;
  tenantId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  riskScore: number;
  metadata: {
    [key: string]: any;
  };
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  tenantId?: string;
  organizationId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'require-mfa';
  priority: number;
  parameters: {
    [key: string]: any;
  };
}

export interface AccessRequest {
  id: string;
  userId: string;
  resource: string;
  action: string;
  tenantId?: string;
  organizationId?: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  timestamp: Date;
  context: {
    [key: string]: any;
  };
}

export interface AccessResponse {
  granted: boolean;
  reason?: string;
  requiredMfa?: boolean;
  warnings: string[];
  policies: string[];
  riskScore: number;
  sessionTimeout?: number;
  additionalChecks?: string[];
}

export interface ComplianceReport {
  id: string;
  type: 'access' | 'audit' | 'security' | 'compliance';
  tenantId?: string;
  organizationId?: string;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalEvents: number;
    uniqueUsers: number;
    failedAttempts: number;
    riskEvents: number;
    policyViolations: number;
  };
  details: any;
}

export interface EnterpriseAccessControlConfig {
  mfaRequired: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number;
  };
  auditRetention: number;
  riskScoreThreshold: number;
  enableDeviceFingerprinting: boolean;
  enableIpWhitelisting: boolean;
  complianceMode: 'none' | 'basic' | 'strict';
}

export class EnterpriseAccessControl extends EventEmitter {
  private users: Map<string, User> = new Map();
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private auditEvents: AuditEvent[] = [];
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private activeSessions: Map<string, any> = new Map();
  private logger: Logger;
  private config: EnterpriseAccessControlConfig;

  constructor(
    logger?: Logger,
    config?: Partial<EnterpriseAccessControlConfig>
  ) {
    super();

    this.logger = logger || new Logger();
    this.config = {
      mfaRequired: false,
      sessionTimeout: 3600000, // 1時間
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15分
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        maxAge: 7776000000, // 90日
      },
      auditRetention: 31536000000, // 1年
      riskScoreThreshold: 70,
      enableDeviceFingerprinting: true,
      enableIpWhitelisting: false,
      complianceMode: 'basic',
      ...config,
    };

    this.initializeSystemRoles();
    this.initializeSystemPermissions();
    this.startAuditCleanup();
  }

  /**
   * システム役割の初期化
   */
  private initializeSystemRoles(): void {
    const systemRoles: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'super-admin',
        description: 'システム全体の最高管理者',
        permissions: ['*'],
        isSystemRole: true,
      },
      {
        name: 'organization-admin',
        description: '組織の管理者',
        permissions: [
          'organization:manage',
          'tenant:manage',
          'user:manage',
          'role:manage',
          'audit:read',
          'security:manage',
        ],
        isSystemRole: true,
      },
      {
        name: 'tenant-admin',
        description: 'テナントの管理者',
        permissions: [
          'tenant:read',
          'user:manage',
          'dns:manage',
          'security:read',
          'audit:read',
        ],
        isSystemRole: true,
      },
      {
        name: 'dns-manager',
        description: 'DNS管理者',
        permissions: [
          'dns:manage',
          'domain:manage',
          'record:manage',
          'analysis:read',
        ],
        isSystemRole: true,
      },
      {
        name: 'security-analyst',
        description: 'セキュリティアナリスト',
        permissions: [
          'security:read',
          'security:analyze',
          'audit:read',
          'threat:read',
        ],
        isSystemRole: true,
      },
      {
        name: 'viewer',
        description: '閲覧者',
        permissions: [
          'dns:read',
          'domain:read',
          'record:read',
          'analysis:read',
        ],
        isSystemRole: true,
      },
    ];

    systemRoles.forEach(roleData => {
      const role: Role = {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...roleData,
      };
      this.roles.set(role.id, role);
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

      // レコード管理
      {
        name: 'record:manage',
        description: 'レコードの管理',
        resource: 'record',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'record:read',
        description: 'レコードの閲覧',
        resource: 'record',
        action: 'read',
        isSystemPermission: true,
      },

      // 分析
      {
        name: 'analysis:read',
        description: '分析結果の閲覧',
        resource: 'analysis',
        action: 'read',
        isSystemPermission: true,
      },

      // セキュリティ
      {
        name: 'security:manage',
        description: 'セキュリティの管理',
        resource: 'security',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'security:read',
        description: 'セキュリティの閲覧',
        resource: 'security',
        action: 'read',
        isSystemPermission: true,
      },
      {
        name: 'security:analyze',
        description: 'セキュリティ分析',
        resource: 'security',
        action: 'analyze',
        isSystemPermission: true,
      },

      // 脅威
      {
        name: 'threat:read',
        description: '脅威情報の閲覧',
        resource: 'threat',
        action: 'read',
        isSystemPermission: true,
      },

      // 監査
      {
        name: 'audit:read',
        description: '監査ログの閲覧',
        resource: 'audit',
        action: 'read',
        isSystemPermission: true,
      },
      {
        name: 'audit:manage',
        description: '監査設定の管理',
        resource: 'audit',
        action: 'manage',
        isSystemPermission: true,
      },

      // オーケストレーション
      {
        name: 'orchestration:manage',
        description: 'オーケストレーションの管理',
        resource: 'orchestration',
        action: 'manage',
        isSystemPermission: true,
      },
      {
        name: 'orchestration:read',
        description: 'オーケストレーションの閲覧',
        resource: 'orchestration',
        action: 'read',
        isSystemPermission: true,
      },

      // エンタープライズ
      {
        name: 'enterprise:access',
        description: 'エンタープライズ機能へのアクセス',
        resource: 'enterprise',
        action: 'access',
        isSystemPermission: true,
      },
    ];

    systemPermissions.forEach(permissionData => {
      const permission: Permission = {
        id: randomUUID(),
        ...permissionData,
      };
      this.permissions.set(permission.id, permission);
    });
  }

  /**
   * アクセス制御の確認
   */
  async checkAccess(request: AccessRequest): Promise<AccessResponse> {
    const user = this.users.get(request.userId);
    if (!user) {
      this.recordAuditEvent({
        ...request,
        id: randomUUID(),
        userEmail: 'unknown',
        action: 'access-denied',
        details: { reason: 'User not found' },
        success: false,
        errorMessage: 'User not found',
        riskScore: 100,
        metadata: {},
      });

      return {
        granted: false,
        reason: 'ユーザーが見つかりません',
        warnings: [],
        policies: [],
        riskScore: 100,
      };
    }

    // ユーザー状態の確認
    if (user.status !== 'active') {
      this.recordAuditEvent({
        ...request,
        id: randomUUID(),
        userEmail: user.email,
        action: 'access-denied',
        details: { reason: 'User inactive', status: user.status },
        success: false,
        errorMessage: 'User is not active',
        riskScore: 90,
        metadata: {},
      });

      return {
        granted: false,
        reason: 'ユーザーアカウントが無効です',
        warnings: [],
        policies: [],
        riskScore: 90,
      };
    }

    // アカウントロックアウトの確認
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      this.recordAuditEvent({
        ...request,
        id: randomUUID(),
        userEmail: user.email,
        action: 'access-denied',
        details: { reason: 'Account locked', lockoutUntil: user.lockoutUntil },
        success: false,
        errorMessage: 'Account is locked',
        riskScore: 80,
        metadata: {},
      });

      return {
        granted: false,
        reason: 'アカウントがロックされています',
        warnings: [],
        policies: [],
        riskScore: 80,
      };
    }

    // テナントアクセス権限の確認
    if (request.tenantId && !user.tenantIds.includes(request.tenantId)) {
      this.recordAuditEvent({
        ...request,
        id: randomUUID(),
        userEmail: user.email,
        action: 'access-denied',
        details: { reason: 'Tenant access denied', tenantId: request.tenantId },
        success: false,
        errorMessage: 'User does not have access to this tenant',
        riskScore: 70,
        metadata: {},
      });

      return {
        granted: false,
        reason: 'テナントへのアクセス権限がありません',
        warnings: [],
        policies: [],
        riskScore: 70,
      };
    }

    // 権限の確認
    const hasPermission = this.checkPermission(
      user,
      request.resource,
      request.action
    );
    if (!hasPermission) {
      this.recordAuditEvent({
        ...request,
        id: randomUUID(),
        userEmail: user.email,
        action: 'access-denied',
        details: {
          reason: 'Insufficient permissions',
          requiredPermission: `${request.resource}:${request.action}`,
        },
        success: false,
        errorMessage: 'Insufficient permissions',
        riskScore: 60,
        metadata: {},
      });

      return {
        granted: false,
        reason: '権限が不足しています',
        warnings: [],
        policies: [],
        riskScore: 60,
      };
    }

    // IP制限の確認
    if (this.config.enableIpWhitelisting && user.ipWhitelist.length > 0) {
      if (!user.ipWhitelist.includes(request.ipAddress)) {
        this.recordAuditEvent({
          ...request,
          id: randomUUID(),
          userEmail: user.email,
          action: 'access-denied',
          details: {
            reason: 'IP not whitelisted',
            ipAddress: request.ipAddress,
          },
          success: false,
          errorMessage: 'IP address not in whitelist',
          riskScore: 85,
          metadata: {},
        });

        return {
          granted: false,
          reason: 'IPアドレスが許可されていません',
          warnings: [],
          policies: [],
          riskScore: 85,
        };
      }
    }

    // リスクスコアの計算
    const riskScore = this.calculateRiskScore(user, request);

    // セキュリティポリシーの適用
    const policyResult = this.applySecurityPolicies(user, request, riskScore);

    // MFA要件の確認
    let requireMfa = false;
    if (this.config.mfaRequired && !user.mfaEnabled) {
      requireMfa = true;
    }

    if (policyResult.action === 'require-mfa') {
      requireMfa = true;
    }

    // アクセス許可の場合
    if (policyResult.action === 'allow') {
      this.recordAuditEvent({
        ...request,
        id: randomUUID(),
        userEmail: user.email,
        action: 'access-granted',
        details: {
          permissions: user.permissions,
          roles: user.roles,
          riskScore,
          policies: policyResult.policies,
          mfaRequired: requireMfa,
        },
        success: true,
        riskScore,
        metadata: {},
      });

      return {
        granted: true,
        requiredMfa: requireMfa,
        warnings: policyResult.warnings,
        policies: policyResult.policies,
        riskScore,
        sessionTimeout: this.config.sessionTimeout,
        additionalChecks: policyResult.additionalChecks,
      };
    }

    // アクセス拒否の場合
    this.recordAuditEvent({
      ...request,
      id: randomUUID(),
      userEmail: user.email,
      action: 'access-denied',
      details: { reason: 'Policy violation', policy: policyResult.policy },
      success: false,
      errorMessage: 'Access denied by security policy',
      riskScore,
      metadata: {},
    });

    return {
      granted: false,
      reason: 'セキュリティポリシーによりアクセスが拒否されました',
      warnings: policyResult.warnings,
      policies: policyResult.policies,
      riskScore,
    };
  }

  /**
   * 権限の確認
   */
  private checkPermission(
    user: User,
    resource: string,
    action: string
  ): boolean {
    // スーパーアドミンは全ての権限を持つ
    if (user.permissions.includes('*')) {
      return true;
    }

    // 直接権限の確認
    const requiredPermission = `${resource}:${action}`;
    if (user.permissions.includes(requiredPermission)) {
      return true;
    }

    // 管理権限の確認
    const managePermission = `${resource}:manage`;
    if (user.permissions.includes(managePermission)) {
      return true;
    }

    return false;
  }

  /**
   * リスクスコアの計算
   */
  private calculateRiskScore(user: User, request: AccessRequest): number {
    let score = 0;

    // ベースリスク
    score += 10;

    // 前回ログインからの時間
    if (user.lastLoginAt) {
      const timeSinceLastLogin = Date.now() - user.lastLoginAt.getTime();
      const daysSinceLastLogin = timeSinceLastLogin / (1000 * 60 * 60 * 24);
      score += Math.min(daysSinceLastLogin * 2, 20);
    }

    // ログイン試行回数
    score += user.loginAttempts * 5;

    // 時間外アクセス（18時〜8時）
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) {
      score += 15;
    }

    // 休日アクセス
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 10;
    }

    // 新しいデバイス
    if (this.config.enableDeviceFingerprinting) {
      const deviceFingerprint = this.generateDeviceFingerprint(
        request.userAgent
      );
      if (!user.deviceFingerprints.includes(deviceFingerprint)) {
        score += 25;
      }
    }

    // 高権限アクション
    const highRiskActions = ['delete', 'manage', 'admin'];
    if (highRiskActions.includes(request.action)) {
      score += 20;
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
      action: 'allow' as const,
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
        if (this.evaluateRule(rule, user, request, riskScore)) {
          result.policies.push(policy.name);

          if (rule.action === 'deny') {
            return {
              action: 'deny',
              reason: rule.name,
              policy: policy.name,
              warnings: result.warnings,
              policies: result.policies,
              additionalChecks: result.additionalChecks,
            };
          }

          if (rule.action === 'require-mfa') {
            result.action = 'require-mfa';
          }

          if (rule.action === 'warn') {
            result.warnings.push(rule.name);
          }
        }
      }
    }

    return result;
  }

  /**
   * ルールの評価
   */
  private evaluateRule(
    rule: SecurityRule,
    user: User,
    request: AccessRequest,
    riskScore: number
  ): boolean {
    // 簡易的な条件評価（実際の実装では、より複雑な条件評価エンジンを使用）
    switch (rule.condition) {
      case 'high-risk':
        return riskScore > this.config.riskScoreThreshold;
      case 'high-privilege':
        return request.action === 'manage' || request.action === 'admin';
      case 'after-hours':
        const hour = new Date().getHours();
        return hour < 8 || hour > 18;
      case 'weekend':
        const dayOfWeek = new Date().getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      default:
        return false;
    }
  }

  /**
   * デバイスフィンガープリントの生成
   */
  private generateDeviceFingerprint(userAgent: string): string {
    return createHash('sha256').update(userAgent).digest('hex');
  }

  /**
   * 監査イベントの記録
   */
  private recordAuditEvent(event: AuditEvent): void {
    this.auditEvents.push(event);

    // 高リスクイベントの即座通知
    if (event.riskScore > this.config.riskScoreThreshold) {
      this.emit('high-risk-event', event);
    }

    // 失敗イベントの通知
    if (!event.success) {
      this.emit('security-event', event);
    }

    this.emit('audit-event', event);
  }

  /**
   * ユーザーの作成
   */
  async createUser(
    userData: Omit<
      User,
      'id' | 'createdAt' | 'updatedAt' | 'loginAttempts' | 'passwordChangedAt'
    >
  ): Promise<User> {
    const user: User = {
      id: randomUUID(),
      loginAttempts: 0,
      passwordChangedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData,
    };

    this.users.set(user.id, user);

    this.logger.info('ユーザーを作成しました', {
      userId: user.id,
      email: user.email,
    });

    this.emit('user-created', user);
    return user;
  }

  /**
   * 役割の作成
   */
  async createRole(
    roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Role> {
    const role: Role = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...roleData,
    };

    this.roles.set(role.id, role);

    this.logger.info('役割を作成しました', {
      roleId: role.id,
      name: role.name,
    });

    this.emit('role-created', role);
    return role;
  }

  /**
   * セキュリティポリシーの作成
   */
  async createSecurityPolicy(
    policyData: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SecurityPolicy> {
    const policy: SecurityPolicy = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...policyData,
    };

    this.securityPolicies.set(policy.id, policy);

    this.logger.info('セキュリティポリシーを作成しました', {
      policyId: policy.id,
      name: policy.name,
    });

    this.emit('policy-created', policy);
    return policy;
  }

  /**
   * 監査ログの検索
   */
  searchAuditEvents(filters: {
    userId?: string;
    tenantId?: string;
    organizationId?: string;
    action?: string;
    dateRange?: { start: Date; end: Date };
    minRiskScore?: number;
    success?: boolean;
  }): AuditEvent[] {
    let events = this.auditEvents;

    if (filters.userId) {
      events = events.filter(e => e.userId === filters.userId);
    }

    if (filters.tenantId) {
      events = events.filter(e => e.tenantId === filters.tenantId);
    }

    if (filters.organizationId) {
      events = events.filter(e => e.organizationId === filters.organizationId);
    }

    if (filters.action) {
      events = events.filter(e => e.action === filters.action);
    }

    if (filters.dateRange) {
      events = events.filter(
        e =>
          e.timestamp >= filters.dateRange!.start &&
          e.timestamp <= filters.dateRange!.end
      );
    }

    if (filters.minRiskScore !== undefined) {
      events = events.filter(e => e.riskScore >= filters.minRiskScore!);
    }

    if (filters.success !== undefined) {
      events = events.filter(e => e.success === filters.success);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * コンプライアンスレポートの生成
   */
  generateComplianceReport(
    type: ComplianceReport['type'],
    options: {
      tenantId?: string;
      organizationId?: string;
      dateRange: { start: Date; end: Date };
    }
  ): ComplianceReport {
    const events = this.searchAuditEvents({
      tenantId: options.tenantId,
      organizationId: options.organizationId,
      dateRange: options.dateRange,
    });

    const metrics = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      failedAttempts: events.filter(e => !e.success).length,
      riskEvents: events.filter(
        e => e.riskScore > this.config.riskScoreThreshold
      ).length,
      policyViolations: events.filter(e => e.action === 'access-denied').length,
    };

    const report: ComplianceReport = {
      id: randomUUID(),
      type,
      tenantId: options.tenantId,
      organizationId: options.organizationId,
      generatedAt: new Date(),
      dateRange: options.dateRange,
      metrics,
      details: {
        events: events.slice(0, 100), // 最新100件
        userActivity: this.generateUserActivityReport(events),
        securitySummary: this.generateSecuritySummary(events),
        riskAnalysis: this.generateRiskAnalysis(events),
      },
    };

    this.logger.info('コンプライアンスレポートを生成しました', {
      reportId: report.id,
      type,
      eventCount: events.length,
    });

    return report;
  }

  /**
   * ユーザー活動レポートの生成
   */
  private generateUserActivityReport(events: AuditEvent[]): any {
    const userActivity = new Map<
      string,
      {
        userId: string;
        email: string;
        totalEvents: number;
        successfulEvents: number;
        failedEvents: number;
        lastActivity: Date;
        riskScore: number;
      }
    >();

    events.forEach(event => {
      if (!userActivity.has(event.userId)) {
        userActivity.set(event.userId, {
          userId: event.userId,
          email: event.userEmail,
          totalEvents: 0,
          successfulEvents: 0,
          failedEvents: 0,
          lastActivity: event.timestamp,
          riskScore: 0,
        });
      }

      const activity = userActivity.get(event.userId)!;
      activity.totalEvents++;

      if (event.success) {
        activity.successfulEvents++;
      } else {
        activity.failedEvents++;
      }

      if (event.timestamp > activity.lastActivity) {
        activity.lastActivity = event.timestamp;
      }

      activity.riskScore = Math.max(activity.riskScore, event.riskScore);
    });

    return Array.from(userActivity.values()).sort(
      (a, b) => b.totalEvents - a.totalEvents
    );
  }

  /**
   * セキュリティサマリーの生成
   */
  private generateSecuritySummary(events: AuditEvent[]): any {
    const actionCounts = new Map<string, number>();
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);

    events.forEach(event => {
      // アクション別集計
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);

      // 時間別集計
      const hour = event.timestamp.getHours();
      hourlyActivity[hour]++;

      // 曜日別集計
      const dayOfWeek = event.timestamp.getDay();
      dailyActivity[dayOfWeek]++;
    });

    return {
      actionCounts: Object.fromEntries(actionCounts),
      hourlyActivity,
      dailyActivity,
      peakHour: hourlyActivity.indexOf(Math.max(...hourlyActivity)),
      peakDay: dailyActivity.indexOf(Math.max(...dailyActivity)),
    };
  }

  /**
   * リスク分析の生成
   */
  private generateRiskAnalysis(events: AuditEvent[]): any {
    const riskDistribution = {
      low: 0, // 0-30
      medium: 0, // 31-60
      high: 0, // 61-80
      critical: 0, // 81-100
    };

    const riskTrends = new Map<string, number[]>();

    events.forEach(event => {
      // リスク分布
      if (event.riskScore <= 30) {
        riskDistribution.low++;
      } else if (event.riskScore <= 60) {
        riskDistribution.medium++;
      } else if (event.riskScore <= 80) {
        riskDistribution.high++;
      } else {
        riskDistribution.critical++;
      }

      // 日別リスクトレンド
      const date = event.timestamp.toISOString().split('T')[0];
      if (!riskTrends.has(date)) {
        riskTrends.set(date, []);
      }
      riskTrends.get(date)!.push(event.riskScore);
    });

    // 日別平均リスクスコア
    const dailyRiskAverage = new Map<string, number>();
    riskTrends.forEach((scores, date) => {
      const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      dailyRiskAverage.set(date, average);
    });

    return {
      riskDistribution,
      averageRiskScore:
        events.length > 0
          ? events.reduce((sum, e) => sum + e.riskScore, 0) / events.length
          : 0,
      dailyRiskAverage: Object.fromEntries(dailyRiskAverage),
      highRiskEvents: events.filter(
        e => e.riskScore > this.config.riskScoreThreshold
      ).length,
    };
  }

  /**
   * 監査ログのクリーンアップ
   */
  private startAuditCleanup(): void {
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.config.auditRetention);
      const beforeCount = this.auditEvents.length;

      this.auditEvents = this.auditEvents.filter(
        event => event.timestamp > cutoffDate
      );

      const removedCount = beforeCount - this.auditEvents.length;
      if (removedCount > 0) {
        this.logger.info('監査ログをクリーンアップしました', {
          removedCount,
          remainingCount: this.auditEvents.length,
        });
      }
    }, 86400000); // 24時間間隔
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    users: number;
    roles: number;
    permissions: number;
    auditEvents: number;
    securityPolicies: number;
    activeSessions: number;
    recentHighRiskEvents: number;
  } {
    const recentHighRiskEvents = this.auditEvents.filter(
      event =>
        event.riskScore > this.config.riskScoreThreshold &&
        event.timestamp > new Date(Date.now() - 86400000) // 24時間以内
    ).length;

    return {
      users: this.users.size,
      roles: this.roles.size,
      permissions: this.permissions.size,
      auditEvents: this.auditEvents.length,
      securityPolicies: this.securityPolicies.size,
      activeSessions: this.activeSessions.size,
      recentHighRiskEvents,
    };
  }

  /**
   * ユーザーの取得
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * 役割の取得
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * 権限の取得
   */
  getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * セキュリティポリシーの取得
   */
  getSecurityPolicy(policyId: string): SecurityPolicy | undefined {
    return this.securityPolicies.get(policyId);
  }

  /**
   * 全ユーザーの取得
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * 全役割の取得
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * 全権限の取得
   */
  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * 全セキュリティポリシーの取得
   */
  getAllSecurityPolicies(): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values());
  }
}
