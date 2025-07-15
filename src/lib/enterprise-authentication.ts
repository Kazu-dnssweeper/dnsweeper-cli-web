/**
 * 企業級認証システム
 *
 * ユーザー認証、MFA、セッション管理機能を提供
 */

import { randomUUID, createHash, createHmac } from 'crypto';
import { EventEmitter } from 'events';

import type {
  User,
  SessionData,
  LoginAttempt,
  MfaSettings,
  DeviceFingerprint,
  EnterpriseAccessControlConfig,
} from './enterprise-access-control-types.js';
import type { Logger } from './logger.js';

export class EnterpriseAuthentication extends EventEmitter {
  private users: Map<string, User> = new Map();
  private activeSessions: Map<string, SessionData> = new Map();
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private logger: Logger;
  private config: EnterpriseAccessControlConfig;

  constructor(logger: Logger, config: EnterpriseAccessControlConfig) {
    super();
    this.logger = logger;
    this.config = config;
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
    const user = Array.from(this.users.values()).find(u => u.email === email);

    if (!user) {
      await this.logLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
        'user_not_found'
      );
      return { success: false, message: 'ユーザーが見つかりません' };
    }

    // アカウントロック確認
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      await this.logLoginAttempt(
        user.id,
        ipAddress,
        userAgent,
        false,
        'account_locked'
      );
      return {
        success: false,
        lockoutUntil: user.lockoutUntil,
        message: 'アカウントがロックされています',
      };
    }

    // アカウントステータス確認
    if (user.status !== 'active') {
      await this.logLoginAttempt(
        user.id,
        ipAddress,
        userAgent,
        false,
        'account_inactive'
      );
      return { success: false, message: 'アカウントが無効です' };
    }

    // パスワード検証
    const isValidPassword = await this.validatePassword(password, user);
    if (!isValidPassword) {
      await this.handleFailedLogin(user, ipAddress, userAgent);
      return { success: false, message: 'パスワードが正しくありません' };
    }

    // IP制限確認
    if (user.ipWhitelist.length > 0 && !user.ipWhitelist.includes(ipAddress)) {
      await this.logLoginAttempt(
        user.id,
        ipAddress,
        userAgent,
        false,
        'ip_not_whitelisted'
      );
      return { success: false, message: 'IPアドレスが許可されていません' };
    }

    // デバイスフィンガープリント確認
    if (this.config.enableDeviceFingerprinting && deviceFingerprint) {
      const isTrustedDevice =
        user.deviceFingerprints.includes(deviceFingerprint);
      if (!isTrustedDevice && this.config.mfaRequired) {
        return {
          success: true,
          user,
          requireMfa: true,
          message: 'MFA認証が必要です',
        };
      }
    }

    // MFA確認
    if (user.mfaEnabled || this.config.mfaRequired) {
      return {
        success: true,
        user,
        requireMfa: true,
        message: 'MFA認証が必要です',
      };
    }

    // セッション作成
    const sessionId = await this.createSession(
      user,
      ipAddress,
      userAgent,
      deviceFingerprint
    );

    // 成功ログ
    await this.logLoginAttempt(user.id, ipAddress, userAgent, true);

    // ログイン試行回数リセット
    user.loginAttempts = 0;
    user.lockoutUntil = undefined;
    user.lastLoginAt = new Date();

    this.logger.info('ユーザー認証成功', {
      userId: user.id,
      email: user.email,
      ipAddress,
      sessionId,
    });

    return {
      success: true,
      user,
      sessionId,
      message: '認証に成功しました',
    };
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
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'ユーザーが見つかりません' };
    }

    // MFA コード検証
    const isValidCode = await this.validateMfaCode(user, code);
    if (!isValidCode) {
      await this.logLoginAttempt(
        userId,
        ipAddress,
        userAgent,
        false,
        'invalid_mfa_code'
      );
      return { success: false, message: 'MFAコードが正しくありません' };
    }

    // セッション作成
    const sessionId = await this.createSession(
      user,
      ipAddress,
      userAgent,
      deviceFingerprint,
      true
    );

    // 成功ログ
    await this.logLoginAttempt(userId, ipAddress, userAgent, true);

    // ログイン試行回数リセット
    user.loginAttempts = 0;
    user.lockoutUntil = undefined;
    user.lastLoginAt = new Date();

    this.logger.info('MFA認証成功', {
      userId,
      email: user.email,
      ipAddress,
      sessionId,
    });

    return {
      success: true,
      sessionId,
      message: 'MFA認証に成功しました',
    };
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
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { valid: false, message: 'セッションが見つかりません' };
    }

    // セッション有効期限確認
    const sessionAge = Date.now() - session.createdAt.getTime();
    if (sessionAge > this.config.sessionTimeout) {
      this.activeSessions.delete(sessionId);
      return { valid: false, message: 'セッションが期限切れです' };
    }

    // ユーザー取得
    const user = this.users.get(session.userId);
    if (!user) {
      this.activeSessions.delete(sessionId);
      return { valid: false, message: 'ユーザーが見つかりません' };
    }

    // ユーザーステータス確認
    if (user.status !== 'active') {
      this.activeSessions.delete(sessionId);
      return { valid: false, message: 'ユーザーが無効です' };
    }

    // 最終アクセス時刻更新
    session.lastAccessAt = new Date();

    return {
      valid: true,
      user,
      session,
      message: 'セッションが有効です',
    };
  }

  /**
   * セッション作成
   */
  private async createSession(
    user: User,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
    mfaVerified: boolean = false
  ): Promise<string> {
    const sessionId = randomUUID();
    const now = new Date();

    const session: SessionData = {
      userId: user.id,
      userEmail: user.email,
      tenantId: user.tenantIds[0],
      organizationId: user.organizationId,
      createdAt: now,
      lastAccessAt: now,
      ipAddress,
      userAgent,
      mfaVerified,
      deviceFingerprint,
      permissions: user.permissions,
      riskScore: this.calculateSessionRiskScore(
        user,
        ipAddress,
        userAgent,
        deviceFingerprint
      ),
    };

    this.activeSessions.set(sessionId, session);

    // セッション作成イベント
    this.emit('sessionCreated', {
      sessionId,
      userId: user.id,
      ipAddress,
      userAgent,
      mfaVerified,
    });

    return sessionId;
  }

  /**
   * パスワード検証
   */
  private async validatePassword(
    password: string,
    user: User
  ): Promise<boolean> {
    // 実際の実装では、ハッシュ化されたパスワードとの比較を行う
    // ここでは簡単な例として、プレーンテキストで比較
    return password === 'password123'; // 実際の実装では適切なハッシュ検証
  }

  /**
   * MFAコード検証
   */
  private async validateMfaCode(user: User, code: string): Promise<boolean> {
    // 実際の実装では、TOTP/HOTPアルゴリズムを使用
    // ここでは簡単な例として、固定コードで検証
    return code === '123456'; // 実際の実装では適切なMFA検証
  }

  /**
   * ログイン失敗処理
   */
  private async handleFailedLogin(
    user: User,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    user.loginAttempts++;

    if (user.loginAttempts >= this.config.maxLoginAttempts) {
      user.lockoutUntil = new Date(Date.now() + this.config.lockoutDuration);

      this.logger.warn('アカウントロック実行', {
        userId: user.id,
        email: user.email,
        attempts: user.loginAttempts,
        lockoutUntil: user.lockoutUntil,
        ipAddress,
      });

      this.emit('accountLocked', {
        userId: user.id,
        email: user.email,
        ipAddress,
        lockoutUntil: user.lockoutUntil,
      });
    }

    await this.logLoginAttempt(
      user.id,
      ipAddress,
      userAgent,
      false,
      'invalid_password'
    );
  }

  /**
   * ログイン試行ログ
   */
  private async logLoginAttempt(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const attempt: LoginAttempt = {
      userId,
      ipAddress,
      userAgent,
      success,
      timestamp: new Date(),
      failureReason,
      riskScore: this.calculateLoginRiskScore(userId, ipAddress, userAgent),
    };

    if (!this.loginAttempts.has(userId)) {
      this.loginAttempts.set(userId, []);
    }

    this.loginAttempts.get(userId)!.push(attempt);

    // 古いログイン試行を削除（24時間以上前）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userAttempts = this.loginAttempts.get(userId)!;
    this.loginAttempts.set(
      userId,
      userAttempts.filter(attempt => attempt.timestamp > oneDayAgo)
    );
  }

  /**
   * セッションリスクスコア計算
   */
  private calculateSessionRiskScore(
    user: User,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string
  ): number {
    let score = 0;

    // IP アドレスベースのリスク
    if (!user.ipWhitelist.includes(ipAddress)) {
      score += 30;
    }

    // デバイスフィンガープリントベースのリスク
    if (
      deviceFingerprint &&
      !user.deviceFingerprints.includes(deviceFingerprint)
    ) {
      score += 20;
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
    const highRiskPermissions = ['admin', 'manage', 'delete'];
    const hasHighRiskPermissions = user.permissions.some(p =>
      highRiskPermissions.some(hr => p.includes(hr))
    );
    if (hasHighRiskPermissions) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * ログインリスクスコア計算
   */
  private calculateLoginRiskScore(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): number {
    let score = 0;

    // 最近のログイン試行履歴
    const recentAttempts =
      this.loginAttempts.get(userId)?.filter(
        attempt => attempt.timestamp > new Date(Date.now() - 60 * 60 * 1000) // 1時間以内
      ) || [];

    // 短時間での多数の試行
    if (recentAttempts.length > 3) {
      score += 40;
    }

    // 異なるIPアドレスからの試行
    const uniqueIps = new Set(recentAttempts.map(a => a.ipAddress));
    if (uniqueIps.size > 2) {
      score += 30;
    }

    // 異なるユーザーエージェントからの試行
    const uniqueUserAgents = new Set(recentAttempts.map(a => a.userAgent));
    if (uniqueUserAgents.size > 1) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * セッション削除
   */
  async logout(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);

      this.logger.info('ユーザーログアウト', {
        userId: session.userId,
        sessionId,
      });

      this.emit('sessionDestroyed', {
        sessionId,
        userId: session.userId,
      });
    }
  }

  /**
   * 全セッション削除
   */
  async logoutAll(userId: string): Promise<void> {
    const userSessions = Array.from(this.activeSessions.entries()).filter(
      ([_, session]) => session.userId === userId
    );

    for (const [sessionId, _] of userSessions) {
      this.activeSessions.delete(sessionId);
    }

    this.logger.info('全セッション削除', { userId });
    this.emit('allSessionsDestroyed', { userId });
  }

  /**
   * アクティブセッション取得
   */
  getActiveSessions(userId?: string): SessionData[] {
    if (userId) {
      return Array.from(this.activeSessions.values()).filter(
        session => session.userId === userId
      );
    }
    return Array.from(this.activeSessions.values());
  }

  /**
   * ログイン試行履歴取得
   */
  getLoginAttempts(userId: string, limit?: number): LoginAttempt[] {
    const attempts = this.loginAttempts.get(userId) || [];
    return limit ? attempts.slice(-limit) : attempts;
  }

  /**
   * ユーザー管理メソッド
   */
  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUser(userId: string, updates: Partial<User>): void {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates);
      this.users.set(userId, user);
    }
  }

  deleteUser(userId: string): void {
    this.users.delete(userId);
    this.loginAttempts.delete(userId);
    // 関連するセッションも削除
    this.logoutAll(userId);
  }
}
