/**
 * 企業級アクセス制御・監査システム - メインクラス
 *
 * 分離された認証、認可、監査機能を統合
 */

import { EventEmitter } from 'events';

import { EnterpriseAudit } from './enterprise-audit.js';
import { EnterpriseAuthentication } from './enterprise-authentication.js';
import { EnterpriseAuthorization } from './enterprise-authorization.js';
import { Logger } from './logger.js';

import type {
  User,
  Role,
  Permission,
  AccessRequest,
  AccessResponse,
  AuditEvent,
  ComplianceReport,
  SecurityPolicy,
  SessionData,
  EnterpriseAccessControlConfig,
} from './enterprise-access-control-types.js';

export class EnterpriseAccessControl extends EventEmitter {
  private authentication: EnterpriseAuthentication;
  private authorization: EnterpriseAuthorization;
  private audit: EnterpriseAudit;
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

    // 子コンポーネントの初期化
    this.authentication = new EnterpriseAuthentication(
      this.logger,
      this.config
    );
    this.authorization = new EnterpriseAuthorization(this.logger, this.config);
    this.audit = new EnterpriseAudit(this.logger, this.config);

    // イベント転送の設定
    this.setupEventForwarding();

    this.logger.info('企業級アクセス制御システム初期化完了', {
      config: this.config,
    });
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // 認証イベントの転送
    this.authentication.on('sessionCreated', data => {
      this.emit('sessionCreated', data);
      this.logAuditEvent({
        userId: data.userId,
        userEmail: '', // 実際の実装では取得
        action: 'session:create',
        resource: 'session',
        resourceId: data.sessionId,
        details: { ipAddress: data.ipAddress, userAgent: data.userAgent },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        success: true,
        riskScore: 10,
        metadata: { eventType: 'sessionCreated' },
      });
    });

    this.authentication.on('accountLocked', data => {
      this.emit('accountLocked', data);
      this.logAuditEvent({
        userId: data.userId,
        userEmail: data.email,
        action: 'account:lock',
        resource: 'user',
        resourceId: data.userId,
        details: { lockoutUntil: data.lockoutUntil },
        ipAddress: data.ipAddress,
        userAgent: '',
        sessionId: '',
        success: false,
        riskScore: 80,
        metadata: { eventType: 'accountLocked' },
      });
    });

    // 監査イベントの転送
    this.audit.on('auditEvent', event => {
      this.emit('auditEvent', event);
    });

    this.audit.on('highRiskEvent', event => {
      this.emit('highRiskEvent', event);
      this.logger.warn('高リスクイベント検出', {
        eventId: event.id,
        userId: event.userId,
        action: event.action,
        riskScore: event.riskScore,
      });
    });
  }

  /**
   * ユーザー認証
   */
  async authenticateUser(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string
  ): Promise<{
    success: boolean;
    user?: User;
    sessionId?: string;
    requireMfa?: boolean;
    lockoutUntil?: Date;
    message?: string;
  }> {
    const result = await this.authentication.authenticateUser(
      email,
      password,
      ipAddress,
      userAgent,
      deviceFingerprint
    );

    // 監査ログ
    await this.logAuditEvent({
      userId: result.user?.id || email,
      userEmail: email,
      action: 'auth:login',
      resource: 'authentication',
      details: {
        success: result.success,
        requireMfa: result.requireMfa,
        lockoutUntil: result.lockoutUntil,
      },
      ipAddress,
      userAgent,
      sessionId: result.sessionId || '',
      success: result.success,
      riskScore: result.success ? 10 : 60,
      metadata: { eventType: 'userAuthentication' },
    });

    return result;
  }

  /**
   * MFA認証
   */
  async verifyMfa(
    userId: string,
    code: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string
  ): Promise<{
    success: boolean;
    sessionId?: string;
    message?: string;
  }> {
    const result = await this.authentication.verifyMfa(
      userId,
      code,
      ipAddress,
      userAgent,
      deviceFingerprint
    );

    // 監査ログ
    await this.logAuditEvent({
      userId,
      userEmail: '', // 実際の実装では取得
      action: 'auth:mfa',
      resource: 'authentication',
      details: { success: result.success },
      ipAddress,
      userAgent,
      sessionId: result.sessionId || '',
      success: result.success,
      riskScore: result.success ? 5 : 70,
      metadata: { eventType: 'mfaVerification' },
    });

    return result;
  }

  /**
   * セッション検証
   */
  async validateSession(sessionId: string): Promise<{
    valid: boolean;
    user?: User;
    session?: SessionData;
    message?: string;
  }> {
    return await this.authentication.validateSession(sessionId);
  }

  /**
   * アクセス制御チェック
   */
  async checkAccess(
    user: User,
    request: AccessRequest
  ): Promise<AccessResponse> {
    const response = await this.authorization.checkAccess(user, request);

    // 監査ログ
    await this.logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      tenantId: request.tenantId,
      organizationId: request.organizationId,
      action: request.action,
      resource: request.resource,
      details: {
        granted: response.granted,
        reason: response.reason,
        policies: response.policies,
      },
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      sessionId: request.sessionId,
      success: response.granted,
      riskScore: response.riskScore,
      metadata: { eventType: 'accessControl' },
    });

    return response;
  }

  /**
   * 権限チェック
   */
  hasPermission(user: User, resource: string, action: string): boolean {
    return this.authorization.hasPermission(user, resource, action);
  }

  /**
   * 監査イベントの記録
   */
  async logAuditEvent(
    event: Omit<AuditEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    await this.audit.logAuditEvent(event);
  }

  /**
   * 監査イベントの検索
   */
  searchAuditEvents(
    filters: Parameters<typeof this.audit.searchAuditEvents>[0]
  ): AuditEvent[] {
    return this.audit.searchAuditEvents(filters);
  }

  /**
   * コンプライアンスレポートの生成
   */
  async generateComplianceReport(
    type: 'access' | 'audit' | 'security' | 'compliance',
    options: Parameters<typeof this.audit.generateComplianceReport>[1]
  ): Promise<ComplianceReport> {
    return await this.audit.generateComplianceReport(type, options);
  }

  /**
   * ユーザー管理
   */
  addUser(user: User): void {
    this.authentication.addUser(user);

    this.logger.info('ユーザー追加', {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
    });
  }

  getUser(userId: string): User | undefined {
    return this.authentication.getUser(userId);
  }

  updateUser(userId: string, updates: Partial<User>): void {
    this.authentication.updateUser(userId, updates);

    this.logger.info('ユーザー更新', {
      userId,
      updates,
    });
  }

  deleteUser(userId: string): void {
    this.authentication.deleteUser(userId);

    this.logger.info('ユーザー削除', { userId });
  }

  /**
   * 役割管理
   */
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    return this.authorization.createRole(role);
  }

  getRole(roleId: string): Role | undefined {
    return this.authorization.getRole(roleId);
  }

  updateRole(roleId: string, updates: Partial<Role>): Role | undefined {
    return this.authorization.updateRole(roleId, updates);
  }

  deleteRole(roleId: string): boolean {
    return this.authorization.deleteRole(roleId);
  }

  listRoles(): Role[] {
    return this.authorization.listRoles();
  }

  /**
   * 権限管理
   */
  createPermission(permission: Omit<Permission, 'id'>): Permission {
    return this.authorization.createPermission(permission);
  }

  getPermission(permissionId: string): Permission | undefined {
    return this.authorization.getPermission(permissionId);
  }

  listPermissions(): Permission[] {
    return this.authorization.listPermissions();
  }

  /**
   * セキュリティポリシー管理
   */
  createSecurityPolicy(
    policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): SecurityPolicy {
    return this.authorization.createSecurityPolicy(policy);
  }

  getSecurityPolicy(policyId: string): SecurityPolicy | undefined {
    return this.authorization.getSecurityPolicy(policyId);
  }

  updateSecurityPolicy(
    policyId: string,
    updates: Partial<SecurityPolicy>
  ): SecurityPolicy | undefined {
    return this.authorization.updateSecurityPolicy(policyId, updates);
  }

  deleteSecurityPolicy(policyId: string): boolean {
    return this.authorization.deleteSecurityPolicy(policyId);
  }

  listSecurityPolicies(): SecurityPolicy[] {
    return this.authorization.listSecurityPolicies();
  }

  /**
   * セッション管理
   */
  async logout(sessionId: string): Promise<void> {
    await this.authentication.logout(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authentication.logoutAll(userId);
  }

  getActiveSessions(userId?: string): SessionData[] {
    return this.authentication.getActiveSessions(userId);
  }

  /**
   * システム統計
   */
  getSystemStatistics(): {
    users: number;
    roles: number;
    permissions: number;
    activeSessions: number;
    auditEvents: number;
    policies: number;
  } {
    return {
      users: 0, // 実装では実際の数を返す
      roles: this.listRoles().length,
      permissions: this.listPermissions().length,
      activeSessions: this.getActiveSessions().length,
      auditEvents: this.audit.getAuditEventCount(),
      policies: this.listSecurityPolicies().length,
    };
  }

  /**
   * 設定の更新
   */
  updateConfig(updates: Partial<EnterpriseAccessControlConfig>): void {
    Object.assign(this.config, updates);

    this.logger.info('設定更新', { updates });
  }

  /**
   * 設定の取得
   */
  getConfig(): EnterpriseAccessControlConfig {
    return { ...this.config };
  }
}

// 後方互換性のためのエクスポート
export default EnterpriseAccessControl;

// 型定義の再エクスポート
export type {
  User,
  Role,
  Permission,
  AccessRequest,
  AccessResponse,
  AuditEvent,
  ComplianceReport,
  SecurityPolicy,
  SessionData,
  EnterpriseAccessControlConfig,
} from './enterprise-access-control-types.js';
