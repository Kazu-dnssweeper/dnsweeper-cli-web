/**
 * DNSweeper マルチアカウント認証サービス
 * 
 * JWT認証、セッション管理、権限チェック機能を提供
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  User, Account, Session, AccountMember, Permission, MemberRole,
  LoginRequest, LoginResponse, RegisterRequest, SwitchAccountRequest, SwitchAccountResponse,
  AuthError, AuthErrorCode, AuditLog, ApiKey
} from '../types/auth';

export class AuthService extends EventEmitter {
  private users: Map<string, User> = new Map();
  private accounts: Map<string, Account> = new Map();
  private sessions: Map<string, Session> = new Map();
  private accountMembers: Map<string, AccountMember[]> = new Map();
  private auditLogs: AuditLog[] = [];
  private apiKeys: Map<string, ApiKey> = new Map();

  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dnsweeper-dev-secret-2025';
  private readonly JWT_EXPIRES_IN = '24h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';
  private readonly SALT_ROUNDS = 12;

  constructor() {
    super();
    this.initializeDefaultData();
  }

  /**
   * デモ用初期データの作成
   */
  private initializeDefaultData() {
    // デフォルトアカウント作成
    const defaultAccount: Account = {
      id: 'account_demo',
      name: 'Demo Company',
      slug: 'demo-company',
      description: 'DNSweeper デモンストレーションアカウント',
      plan: 'professional',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      billingEmail: 'billing@demo-company.example',
      settings: {
        defaultTtl: 300,
        allowedRecordTypes: [
          { type: 'A', enabled: true },
          { type: 'AAAA', enabled: true },
          { type: 'CNAME', enabled: true },
          { type: 'MX', enabled: true },
          { type: 'TXT', enabled: true }
        ],
        maxZones: 100,
        enforceSSO: false,
        ipWhitelist: [],
        apiAccessEnabled: true,
        integrations: {}
      },
      quotas: {
        maxDnsRecords: 10000,
        maxApiRequestsPerHour: 5000,
        maxFileUploads: 50,
        maxChangeHistoryRetentionDays: 90,
        maxUsers: 20
      },
      usage: {
        currentDnsRecords: 0,
        apiRequestsLastHour: 0,
        storageUsedBytes: 0,
        lastCalculatedAt: new Date()
      }
    };

    // デフォルトユーザー作成
    const defaultUser: User = {
      id: 'user_demo',
      email: 'admin@demo-company.example',
      firstName: 'Demo',
      lastName: 'Administrator',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      preferences: {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        theme: 'light',
        emailNotifications: true,
        dashboardLayout: 'expanded'
      }
    };

    this.accounts.set(defaultAccount.id, defaultAccount);
    this.users.set(defaultUser.id, defaultUser);

    // デフォルトメンバーシップ作成
    const defaultMembership: AccountMember = {
      id: 'member_demo',
      accountId: defaultAccount.id,
      userId: defaultUser.id,
      role: 'owner',
      permissions: this.getDefaultPermissionsForRole('owner'),
      invitedAt: new Date(),
      joinedAt: new Date(),
      invitedBy: defaultUser.id,
      status: 'active'
    };

    this.accountMembers.set(defaultAccount.id, [defaultMembership]);
  }

  /**
   * ユーザーログイン
   */
  async login(request: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const user = this.findUserByEmail(request.email);
    if (!user || !user.isActive) {
      throw this.createAuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // パスワード検証（実装では実際のハッシュ検証を行う）
    // const isValidPassword = await bcrypt.compare(request.password, user.passwordHash);
    const isValidPassword = true; // デモ用

    if (!isValidPassword) {
      throw this.createAuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // アカウント確認
    let account: Account;
    if (request.accountSlug) {
      account = this.findAccountBySlug(request.accountSlug);
      if (!account) {
        throw this.createAuthError('ACCOUNT_NOT_FOUND', 'Account not found');
      }
    } else {
      // ユーザーの最初のアカウントを使用
      const userAccounts = this.getUserAccounts(user.id);
      if (userAccounts.length === 0) {
        throw this.createAuthError('ACCOUNT_NOT_FOUND', 'No accessible accounts found');
      }
      account = userAccounts[0];
    }

    if (account.status !== 'active') {
      throw this.createAuthError('ACCOUNT_SUSPENDED', 'Account is not active');
    }

    // メンバーシップ確認
    const membership = this.getAccountMembership(account.id, user.id);
    if (!membership || membership.status !== 'active') {
      throw this.createAuthError('INSUFFICIENT_PERMISSIONS', 'No access to this account');
    }

    // セッション作成
    const session = await this.createSession(user.id, account.id, ipAddress, userAgent);

    // 最終ログイン時刻更新
    user.lastLoginAt = new Date();
    this.users.set(user.id, user);

    // 監査ログ記録
    this.logAuditEvent(account.id, user.id, 'user_login', 'session', session.id, {
      accountSlug: account.slug,
      ipAddress,
      userAgent
    }, ipAddress, userAgent);

    this.emit('userLoggedIn', { user, account, session });

    return {
      user,
      account,
      session: {
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      },
      permissions: membership.permissions
    };
  }

  /**
   * セッション作成
   */
  private async createSession(userId: string, accountId: string, ipAddress?: string, userAgent?: string): Promise<Session> {
    const sessionId = this.generateId('session');
    const token = this.generateJwtToken(userId, accountId, sessionId);
    const refreshToken = this.generateRefreshToken();

    const session: Session = {
      id: sessionId,
      userId,
      accountId,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * JWT トークン生成
   */
  private generateJwtToken(userId: string, accountId: string, sessionId: string): string {
    return jwt.sign(
      {
        userId,
        accountId,
        sessionId,
        type: 'access'
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * リフレッシュトークン生成
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * トークン検証
   */
  async verifyToken(token: string): Promise<{ userId: string; accountId: string; sessionId: string }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'access') {
        throw this.createAuthError('SESSION_EXPIRED', 'Invalid token type');
      }

      const session = this.sessions.get(decoded.sessionId);
      if (!session || session.expiresAt < new Date()) {
        throw this.createAuthError('SESSION_EXPIRED', 'Session expired');
      }

      // セッションの最終アクティブ時刻更新
      session.lastActiveAt = new Date();
      this.sessions.set(session.id, session);

      return {
        userId: decoded.userId,
        accountId: decoded.accountId,
        sessionId: decoded.sessionId
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw this.createAuthError('SESSION_EXPIRED', 'Invalid token');
      }
      throw error;
    }
  }

  /**
   * アカウント切り替え
   */
  async switchAccount(userId: string, request: SwitchAccountRequest): Promise<SwitchAccountResponse> {
    const user = this.users.get(userId);
    if (!user) {
      throw this.createAuthError('USER_NOT_FOUND', 'User not found');
    }

    const account = this.accounts.get(request.accountId);
    if (!account) {
      throw this.createAuthError('ACCOUNT_NOT_FOUND', 'Account not found');
    }

    const membership = this.getAccountMembership(account.id, userId);
    if (!membership || membership.status !== 'active') {
      throw this.createAuthError('INSUFFICIENT_PERMISSIONS', 'No access to this account');
    }

    // 新しいセッショントークン生成
    const sessionId = this.generateId('session');
    const token = this.generateJwtToken(userId, account.id, sessionId);

    this.emit('accountSwitched', { user, account });

    return {
      account,
      permissions: membership.permissions,
      session: {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    };
  }

  /**
   * 権限チェック
   */
  checkPermission(
    userId: string,
    accountId: string,
    resource: string,
    action: string
  ): boolean {
    const membership = this.getAccountMembership(accountId, userId);
    if (!membership || membership.status !== 'active') {
      return false;
    }

    // オーナーはすべての権限を持つ
    if (membership.role === 'owner') {
      return true;
    }

    // 権限チェック
    return membership.permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action as any)
    );
  }

  /**
   * ユーザーのアカウント一覧取得
   */
  getUserAccounts(userId: string): Account[] {
    const accounts: Account[] = [];
    
    for (const [accountId, members] of this.accountMembers.entries()) {
      const membership = members.find(m => m.userId === userId && m.status === 'active');
      if (membership) {
        const account = this.accounts.get(accountId);
        if (account) {
          accounts.push(account);
        }
      }
    }

    return accounts;
  }

  /**
   * ロール別デフォルト権限取得
   */
  private getDefaultPermissionsForRole(role: MemberRole): Permission[] {
    const basePermissions = {
      owner: [
        { resource: 'dns_records', actions: ['read', 'create', 'update', 'delete'] },
        { resource: 'account_settings', actions: ['read', 'update', 'manage'] },
        { resource: 'members', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { resource: 'billing', actions: ['read', 'manage'] },
        { resource: 'integrations', actions: ['read', 'create', 'update', 'delete', 'manage'] },
        { resource: 'exports', actions: ['read', 'create'] },
        { resource: 'history', actions: ['read'] }
      ],
      admin: [
        { resource: 'dns_records', actions: ['read', 'create', 'update', 'delete'] },
        { resource: 'account_settings', actions: ['read', 'update'] },
        { resource: 'members', actions: ['read', 'create', 'update'] },
        { resource: 'integrations', actions: ['read', 'create', 'update', 'delete'] },
        { resource: 'exports', actions: ['read', 'create'] },
        { resource: 'history', actions: ['read'] }
      ],
      editor: [
        { resource: 'dns_records', actions: ['read', 'create', 'update', 'delete'] },
        { resource: 'exports', actions: ['read', 'create'] },
        { resource: 'history', actions: ['read'] }
      ],
      viewer: [
        { resource: 'dns_records', actions: ['read'] },
        { resource: 'exports', actions: ['read'] },
        { resource: 'history', actions: ['read'] }
      ]
    };

    return basePermissions[role] as Permission[];
  }

  /**
   * 監査ログ記録
   */
  private logAuditEvent(
    accountId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId: string | undefined,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    const auditLog: AuditLog = {
      id: this.generateId('audit'),
      accountId,
      userId,
      action: action as any,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date()
    };

    this.auditLogs.push(auditLog);

    // 古いログの削除（メモリ使用量制限）
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }
  }

  // ヘルパーメソッド
  private findUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  private findAccountBySlug(slug: string): Account | undefined {
    return Array.from(this.accounts.values()).find(account => account.slug === slug);
  }

  private getAccountMembership(accountId: string, userId: string): AccountMember | undefined {
    const members = this.accountMembers.get(accountId) || [];
    return members.find(member => member.userId === userId);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createAuthError(code: AuthErrorCode, message: string): AuthError {
    const error = new Error(message) as AuthError;
    error.code = code;
    return error;
  }

  // 公開メソッド
  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  getAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  getAuditLogs(accountId: string, limit = 100): AuditLog[] {
    return this.auditLogs
      .filter(log => log.accountId === accountId)
      .slice(-limit)
      .reverse();
  }

  /**
   * セッションクリーンアップ（期限切れセッション削除）
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// グローバルインスタンス
export const authService = new AuthService();

// 定期的なセッションクリーンアップ
setInterval(() => {
  authService.cleanupExpiredSessions();
}, 60 * 60 * 1000); // 1時間ごと