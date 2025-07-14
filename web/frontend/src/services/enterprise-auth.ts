/**
 * DNSweeper エンタープライズ認証サービス
 * Active Directory統合・LDAP/SAML認証プロトコル実装
 */

import {
  EnterpriseUser,
  EnterpriseAccount,
  EnterpriseSession,
  EnterpriseLoginRequest,
  EnterpriseLoginResponse,
  ActiveDirectoryConfig,
  SamlConfig,
  SecurityGroup,
  GroupPolicy,
  Permission,
  ComplianceStatus,
  AdUserInfo,
  AuditEvent,
  SsoProvider,
  OrganizationUnit,
  DeviceInfo,
  LocationInfo
} from '../types/enterprise-auth';

/**
 * Active Directory 統合クライアント
 */
export class ActiveDirectoryClient {
  private config: ActiveDirectoryConfig;
  
  constructor(config: ActiveDirectoryConfig) {
    this.config = config;
  }

  /**
   * AD認証の実行
   */
  async authenticate(userPrincipalName: string, password: string): Promise<AdUserInfo> {
    const response = await fetch('/api/enterprise/auth/ad/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPrincipalName,
        password,
        domain: this.config.domain,
        ldapUrl: this.config.ldapUrl
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AD認証失敗: ${error.message}`);
    }

    return response.json();
  }

  /**
   * ユーザー情報の取得
   */
  async getUserInfo(userPrincipalName: string): Promise<AdUserInfo> {
    const response = await fetch(`/api/enterprise/auth/ad/users/${encodeURIComponent(userPrincipalName)}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('ADユーザー情報取得失敗');
    }

    return response.json();
  }

  /**
   * グループメンバーシップの取得
   */
  async getGroupMemberships(userPrincipalName: string): Promise<SecurityGroup[]> {
    const response = await fetch(`/api/enterprise/auth/ad/users/${encodeURIComponent(userPrincipalName)}/groups`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('ADグループ情報取得失敗');
    }

    return response.json();
  }

  /**
   * 組織単位の取得
   */
  async getOrganizationUnits(): Promise<OrganizationUnit[]> {
    const response = await fetch('/api/enterprise/auth/ad/organization-units', {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('AD組織単位取得失敗');
    }

    return response.json();
  }

  /**
   * ADとの同期実行
   */
  async syncUserData(userPrincipalName: string): Promise<void> {
    const response = await fetch('/api/enterprise/auth/ad/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        userPrincipalName,
        fullSync: false
      })
    });

    if (!response.ok) {
      throw new Error('AD同期失敗');
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

/**
 * SAML統合クライアント
 */
export class SamlClient {
  private config: SamlConfig;

  constructor(config: SamlConfig) {
    this.config = config;
  }

  /**
   * SAML認証リクエストの生成
   */
  generateAuthRequest(): string {
    const authRequest = {
      idpUrl: this.config.idpSingleSignOnUrl,
      spEntityId: this.config.spEntityId,
      acsUrl: this.config.spAssertionConsumerServiceUrl,
      nameIdFormat: this.config.nameIdFormat,
      timestamp: new Date().toISOString()
    };

    // SAML認証リクエストURL生成
    const params = new URLSearchParams({
      SAMLRequest: btoa(JSON.stringify(authRequest)),
      RelayState: window.location.pathname
    });

    return `${this.config.idpSingleSignOnUrl}?${params.toString()}`;
  }

  /**
   * SAML認証レスポンスの処理
   */
  async processSamlResponse(samlResponse: string, relayState?: string): Promise<EnterpriseUser> {
    const response = await fetch('/api/enterprise/auth/saml/acs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        samlResponse,
        relayState
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SAML認証失敗: ${error.message}`);
    }

    return response.json();
  }

  /**
   * SAML シングルログアウト
   */
  async initiateLogout(): Promise<string> {
    const response = await fetch('/api/enterprise/auth/saml/slo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('SAMLログアウト失敗');
    }

    const data = await response.json();
    return data.logoutUrl;
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

/**
 * エンタープライズ認証サービス
 */
export class EnterpriseAuthService {
  private adClient?: ActiveDirectoryClient;
  private samlClient?: SamlClient;
  private deviceInfo: DeviceInfo;

  constructor() {
    this.deviceInfo = this.generateDeviceInfo();
  }

  /**
   * Active Directory設定の初期化
   */
  initializeAd(config: ActiveDirectoryConfig): void {
    this.adClient = new ActiveDirectoryClient(config);
  }

  /**
   * SAML設定の初期化
   */
  initializeSaml(config: SamlConfig): void {
    this.samlClient = new SamlClient(config);
  }

  /**
   * エンタープライズログイン
   */
  async login(request: EnterpriseLoginRequest): Promise<EnterpriseLoginResponse> {
    const locationInfo = await this.generateLocationInfo();
    
    const response = await fetch('/api/enterprise/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        deviceInfo: this.deviceInfo,
        locationInfo
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`認証失敗: ${error.message}`);
    }

    const loginResponse: EnterpriseLoginResponse = await response.json();
    
    // セッション情報を保存
    this.storeSession(loginResponse.session);
    
    // 監査ログ記録
    await this.logAuditEvent('login', {
      userId: loginResponse.user.id,
      authMethod: request.ssoProvider || 'local',
      deviceInfo: this.deviceInfo,
      locationInfo
    });

    return loginResponse;
  }

  /**
   * ログアウト
   */
  async logout(ssoLogout: boolean = true): Promise<void> {
    const session = this.getStoredSession();
    
    if (ssoLogout && session?.ssoSessionId) {
      // SSOログアウト処理
      if (this.samlClient) {
        const logoutUrl = await this.samlClient.initiateLogout();
        window.location.href = logoutUrl;
        return;
      }
    }

    // 通常のログアウト
    const response = await fetch('/api/enterprise/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.token}`
      }
    });

    if (!response.ok) {
      console.warn('ログアウト処理でエラーが発生しました');
    }

    // セッション情報をクリア
    this.clearSession();
    
    // 監査ログ記録
    await this.logAuditEvent('logout', {
      sessionId: session?.sessionId
    });
  }

  /**
   * アカウント切り替え
   */
  async switchAccount(accountId: string): Promise<EnterpriseAccount> {
    const session = this.getStoredSession();
    
    const response = await fetch('/api/enterprise/auth/switch-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.token}`
      },
      body: JSON.stringify({ accountId })
    });

    if (!response.ok) {
      throw new Error('アカウント切り替え失敗');
    }

    const data = await response.json();
    
    // セッションを更新
    this.updateSession({
      token: data.session.token,
      expiresAt: new Date(data.session.expiresAt)
    });

    return data.account;
  }

  /**
   * トークンリフレッシュ
   */
  async refreshToken(): Promise<void> {
    const session = this.getStoredSession();
    
    if (!session?.refreshToken) {
      throw new Error('リフレッシュトークンが見つかりません');
    }

    const response = await fetch('/api/enterprise/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: session.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('トークンリフレッシュ失敗');
    }

    const data = await response.json();
    
    this.updateSession({
      token: data.token,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt)
    });
  }

  /**
   * 権限チェック
   */
  async hasPermission(
    resource: string, 
    action: string, 
    conditions?: Record<string, any>
  ): Promise<boolean> {
    const session = this.getStoredSession();
    
    const response = await fetch('/api/enterprise/auth/check-permission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.token}`
      },
      body: JSON.stringify({
        resource,
        action,
        conditions
      })
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.permitted;
  }

  /**
   * グループメンバーシップチェック
   */
  async hasGroupMembership(groupName: string): Promise<boolean> {
    const session = this.getStoredSession();
    
    const response = await fetch(`/api/enterprise/auth/groups/${encodeURIComponent(groupName)}/membership`, {
      headers: {
        'Authorization': `Bearer ${session?.token}`
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isMember;
  }

  /**
   * コンプライアンス状況の取得
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    const session = this.getStoredSession();
    
    const response = await fetch('/api/enterprise/compliance/status', {
      headers: {
        'Authorization': `Bearer ${session?.token}`
      }
    });

    if (!response.ok) {
      throw new Error('コンプライアンス状況取得失敗');
    }

    return response.json();
  }

  /**
   * Active Directory同期
   */
  async syncWithAd(): Promise<void> {
    if (!this.adClient) {
      throw new Error('Active Directoryが設定されていません');
    }

    const session = this.getStoredSession();
    const user = await this.getCurrentUser();
    
    if (user?.userPrincipalName) {
      await this.adClient.syncUserData(user.userPrincipalName);
    }
  }

  /**
   * 監査イベントログ
   */
  async logAuditEvent(event: AuditEvent, details: Record<string, any>): Promise<void> {
    const session = this.getStoredSession();
    
    try {
      await fetch('/api/enterprise/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token || ''}`
        },
        body: JSON.stringify({
          event,
          details,
          timestamp: new Date().toISOString(),
          deviceInfo: this.deviceInfo,
          sessionId: session?.sessionId
        })
      });
    } catch (error) {
      console.error('監査ログ記録失敗:', error);
    }
  }

  /**
   * セッションリスク計算
   */
  calculateSessionRisk(): number {
    const session = this.getStoredSession();
    
    if (!session) return 100; // 未認証は最高リスク

    let riskScore = 0;

    // 時間ベースのリスク
    const sessionAge = Date.now() - new Date(session.expiresAt).getTime();
    if (sessionAge > 8 * 60 * 60 * 1000) { // 8時間以上
      riskScore += 30;
    }

    // デバイスベースのリスク
    if (!this.deviceInfo.isTrusted) {
      riskScore += 25;
    }
    if (!this.deviceInfo.isManaged) {
      riskScore += 20;
    }

    // 既存のリスクスコアを考慮
    riskScore += session.riskScore || 0;

    return Math.min(riskScore, 100);
  }

  /**
   * 現在のユーザー情報取得
   */
  private async getCurrentUser(): Promise<EnterpriseUser | null> {
    const session = this.getStoredSession();
    
    if (!session?.token) return null;

    try {
      const response = await fetch('/api/enterprise/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });

      if (!response.ok) return null;

      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * セッション情報の保存
   */
  private storeSession(session: EnterpriseSession): void {
    localStorage.setItem('enterpriseSession', JSON.stringify(session));
    localStorage.setItem('authToken', session.token);
  }

  /**
   * セッション情報の取得
   */
  private getStoredSession(): EnterpriseSession | null {
    const sessionData = localStorage.getItem('enterpriseSession');
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      
      // セッション有効期限チェック
      if (new Date(session.expiresAt) <= new Date()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * セッション情報の更新
   */
  private updateSession(updates: Partial<EnterpriseSession>): void {
    const session = this.getStoredSession();
    if (session) {
      const updatedSession = { ...session, ...updates };
      this.storeSession(updatedSession);
    }
  }

  /**
   * セッション情報のクリア
   */
  private clearSession(): void {
    localStorage.removeItem('enterpriseSession');
    localStorage.removeItem('authToken');
  }

  /**
   * デバイス情報の生成
   */
  private generateDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    return {
      deviceId: this.getOrCreateDeviceId(),
      deviceType: this.detectDeviceType(),
      os: this.detectOS(userAgent),
      browser: this.detectBrowser(userAgent),
      isManaged: false, // 企業管理デバイスかどうかは別途判定
      isTrusted: false, // 信頼デバイスかどうかは別途判定
      lastSeen: new Date()
    };
  }

  /**
   * 位置情報の生成
   */
  private async generateLocationInfo(): Promise<LocationInfo> {
    try {
      const response = await fetch('/api/enterprise/auth/location-info');
      
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('位置情報取得失敗:', error);
    }

    // フォールバック
    return {
      ipAddress: '',
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      isTrusted: false,
      vpnDetected: false,
      riskScore: 50 // 中程度のリスク
    };
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', deviceId);
    }

    return deviceId;
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    if (/desktop/.test(userAgent)) return 'desktop';
    
    return 'unknown';
  }

  private detectOS(userAgent: string): string {
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/macintosh/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipad/i.test(userAgent)) return 'iOS';
    
    return 'Unknown';
  }

  private detectBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    
    return 'Unknown';
  }
}

/**
 * グローバルエンタープライズ認証サービスインスタンス
 */
export const enterpriseAuthService = new EnterpriseAuthService();