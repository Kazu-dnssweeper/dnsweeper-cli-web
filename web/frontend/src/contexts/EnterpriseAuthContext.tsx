/**
 * DNSweeper エンタープライズ認証コンテキスト
 * Active Directory統合・LDAP/SAML認証・組織階層管理対応
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  EnterpriseUser,
  EnterpriseAccount,
  EnterpriseSession,
  EnterpriseAuthContextType,
  EnterpriseLoginRequest,
  SecurityGroup,
  GroupPolicy,
  Permission,
  PermissionResource,
  PermissionAction,
  ComplianceStatus,
  AdUserInfo,
  AuditEvent,
  GroupPolicyType,
  DeviceInfo
} from '../types/enterprise-auth';
import { enterpriseAuthService } from '../services/enterprise-auth';

interface EnterpriseAuthProviderProps {
  children: ReactNode;
}

const EnterpriseAuthContext = createContext<EnterpriseAuthContextType | undefined>(undefined);

/**
 * エンタープライズ認証プロバイダー
 */
export const EnterpriseAuthProvider: React.FC<EnterpriseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<EnterpriseUser | null>(null);
  const [account, setAccount] = useState<EnterpriseAccount | null>(null);
  const [session, setSession] = useState<EnterpriseSession | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupMemberships, setGroupMemberships] = useState<SecurityGroup[]>([]);
  const [appliedPolicies, setAppliedPolicies] = useState<GroupPolicy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  /**
   * 初期化処理
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * セッション監視
   */
  useEffect(() => {
    if (session) {
      // セッション有効期限監視
      const checkInterval = setInterval(() => {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        // 期限10分前にリフレッシュ
        if (expiresAt.getTime() - now.getTime() < 10 * 60 * 1000) {
          refreshToken();
        }
      }, 60000); // 1分ごとにチェック

      return () => clearInterval(checkInterval);
    }
  }, [session]);

  /**
   * 認証状態の初期化
   */
  const initializeAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // 保存されたセッションから復元を試行
      const response = await fetch('/api/enterprise/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAccount(data.account);
        setSession(data.session);
        setPermissions(data.permissions);
        setGroupMemberships(data.groupMemberships);
        setAppliedPolicies(data.appliedPolicies);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('認証初期化エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ログイン処理
   */
  const login = useCallback(async (request: EnterpriseLoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await enterpriseAuthService.login(request);
      
      setUser(response.user);
      setAccount(response.account);
      setSession(response.session);
      setPermissions(response.permissions);
      setGroupMemberships(response.groupMemberships);
      setAppliedPolicies(response.appliedPolicies);
      setIsAuthenticated(true);

      // ログイン後の処理
      await postLoginProcessing(response.user, response.account);
      
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ログアウト処理
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      await enterpriseAuthService.logout(true);
      
      // 状態をクリア
      setUser(null);
      setAccount(null);
      setSession(null);
      setPermissions([]);
      setGroupMemberships([]);
      setAppliedPolicies([]);
      setIsAuthenticated(false);
      
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * アカウント切り替え
   */
  const switchAccount = useCallback(async (accountId: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const newAccount = await enterpriseAuthService.switchAccount(accountId);
      setAccount(newAccount);
      
      // 新しいアカウントの権限情報を取得
      await refreshPermissions();
      
    } catch (error) {
      console.error('アカウント切り替えエラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * トークンリフレッシュ
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await enterpriseAuthService.refreshToken();
      
      // セッション情報を更新
      const response = await fetch('/api/enterprise/auth/session', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      }
      
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      // リフレッシュ失敗時はログアウト
      await logout();
    }
  }, [logout]);

  /**
   * 権限チェック
   */
  const hasPermission = useCallback((
    resource: PermissionResource,
    action: PermissionAction,
    conditions?: Record<string, any>
  ): boolean => {
    if (!permissions.length) return false;

    return permissions.some(permission => {
      if (permission.resource !== resource) return false;
      if (!permission.actions.includes(action)) return false;

      // 条件チェック
      if (conditions && permission.conditions) {
        return permission.conditions.every(condition => {
          const value = conditions[condition.field];
          if (value === undefined) return false;

          switch (condition.operator) {
            case 'equals':
              return value === condition.value;
            case 'contains':
              return String(value).includes(String(condition.value));
            case 'starts_with':
              return String(value).startsWith(String(condition.value));
            case 'not_equals':
              return value !== condition.value;
            case 'in':
              return Array.isArray(condition.value) && condition.value.includes(value);
            case 'not_in':
              return Array.isArray(condition.value) && !condition.value.includes(value);
            default:
              return false;
          }
        });
      }

      return true;
    });
  }, [permissions]);

  /**
   * グループメンバーシップチェック
   */
  const hasGroupMembership = useCallback((groupName: string): boolean => {
    return groupMemberships.some(group => 
      group.name === groupName || group.distinguishedName === groupName
    );
  }, [groupMemberships]);

  /**
   * グループポリシー値の取得
   */
  const getPolicyValue = useCallback((policyType: GroupPolicyType, setting: string): any => {
    const policy = appliedPolicies.find(p => p.type === policyType && p.enabled);
    
    if (!policy) return null;

    const settings = policy.settings[`${policyType}Policy` as keyof typeof policy.settings];
    return settings ? (settings as any)[setting] : null;
  }, [appliedPolicies]);

  /**
   * セッション延長
   */
  const extendSession = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/enterprise/auth/extend-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.token || ''}`
        }
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      }
    } catch (error) {
      console.error('セッション延長エラー:', error);
    }
  }, [session]);

  /**
   * セッションリスク取得
   */
  const getSessionRisk = useCallback((): number => {
    return enterpriseAuthService.calculateSessionRisk();
  }, []);

  /**
   * デバイス情報更新
   */
  const updateDeviceInfo = useCallback((deviceInfo: Partial<DeviceInfo>): void => {
    if (session) {
      const updatedSession = {
        ...session,
        deviceInfo: { ...session.deviceInfo, ...deviceInfo }
      };
      setSession(updatedSession);
    }
  }, [session]);

  /**
   * 監査イベントログ
   */
  const logAuditEvent = useCallback(async (event: AuditEvent, details: Record<string, any>): Promise<void> => {
    await enterpriseAuthService.logAuditEvent(event, details);
  }, []);

  /**
   * コンプライアンス状況取得
   */
  const getComplianceStatus = useCallback(async (): Promise<ComplianceStatus> => {
    return enterpriseAuthService.getComplianceStatus();
  }, []);

  /**
   * Active Directory同期
   */
  const syncWithAd = useCallback(async (): Promise<void> => {
    await enterpriseAuthService.syncWithAd();
    
    // 同期後にユーザー情報を更新
    await refreshUserInfo();
  }, []);

  /**
   * ADユーザー情報取得
   */
  const getAdUserInfo = useCallback(async (): Promise<AdUserInfo> => {
    if (!user?.userPrincipalName) {
      throw new Error('ADユーザー情報がありません');
    }

    const response = await fetch(`/api/enterprise/auth/ad/users/${encodeURIComponent(user.userPrincipalName)}`, {
      headers: {
        'Authorization': `Bearer ${session?.token || ''}`
      }
    });

    if (!response.ok) {
      throw new Error('ADユーザー情報取得失敗');
    }

    return response.json();
  }, [user, session]);

  /**
   * AD属性更新
   */
  const updateAdAttributes = useCallback(async (attributes: Partial<any>): Promise<void> => {
    if (!user?.userPrincipalName) {
      throw new Error('ADユーザー情報がありません');
    }

    const response = await fetch(`/api/enterprise/auth/ad/users/${encodeURIComponent(user.userPrincipalName)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.token || ''}`
      },
      body: JSON.stringify(attributes)
    });

    if (!response.ok) {
      throw new Error('AD属性更新失敗');
    }

    // ユーザー情報を再取得
    await refreshUserInfo();
  }, [user, session]);

  /**
   * ログイン後処理
   */
  const postLoginProcessing = async (user: EnterpriseUser, account: EnterpriseAccount): Promise<void> => {
    try {
      // デバイス登録
      await registerDevice();
      
      // コンプライアンスチェック
      await checkCompliance();
      
      // 初回ログイン処理
      if (!user.lastLoginAt) {
        await handleFirstLogin(user);
      }
      
    } catch (error) {
      console.error('ログイン後処理エラー:', error);
    }
  };

  /**
   * 権限情報の更新
   */
  const refreshPermissions = async (): Promise<void> => {
    try {
      const response = await fetch('/api/enterprise/auth/permissions', {
        headers: {
          'Authorization': `Bearer ${session?.token || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions);
        setGroupMemberships(data.groupMemberships);
        setAppliedPolicies(data.appliedPolicies);
      }
    } catch (error) {
      console.error('権限情報更新エラー:', error);
    }
  };

  /**
   * ユーザー情報の更新
   */
  const refreshUserInfo = async (): Promise<void> => {
    try {
      const response = await fetch('/api/enterprise/auth/me', {
        headers: {
          'Authorization': `Bearer ${session?.token || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('ユーザー情報更新エラー:', error);
    }
  };

  /**
   * デバイス登録
   */
  const registerDevice = async (): Promise<void> => {
    try {
      await fetch('/api/enterprise/auth/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token || ''}`
        },
        body: JSON.stringify({
          deviceId: session?.deviceInfo.deviceId,
          deviceInfo: session?.deviceInfo
        })
      });
    } catch (error) {
      console.error('デバイス登録エラー:', error);
    }
  };

  /**
   * コンプライアンスチェック
   */
  const checkCompliance = async (): Promise<void> => {
    try {
      const response = await fetch('/api/enterprise/compliance/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.token || ''}`
        }
      });

      if (response.ok) {
        const complianceStatus = await response.json();
        
        // 重大なコンプライアンス違反がある場合は警告
        if (complianceStatus.overall === 'non_compliant') {
          console.warn('コンプライアンス違反が検出されました:', complianceStatus.violations);
        }
      }
    } catch (error) {
      console.error('コンプライアンスチェックエラー:', error);
    }
  };

  /**
   * 初回ログイン処理
   */
  const handleFirstLogin = async (user: EnterpriseUser): Promise<void> => {
    try {
      // 初回ログイン時の設定
      await fetch('/api/enterprise/auth/first-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token || ''}`
        },
        body: JSON.stringify({
          userId: user.id,
          setupCompleted: false
        })
      });

      // 初回ログイン監査ログ
      await logAuditEvent('login', {
        userId: user.id,
        isFirstLogin: true
      });
      
    } catch (error) {
      console.error('初回ログイン処理エラー:', error);
    }
  };

  const contextValue: EnterpriseAuthContextType = {
    user,
    account,
    session,
    permissions,
    groupMemberships,
    appliedPolicies,
    isLoading,
    isAuthenticated,
    login,
    logout,
    switchAccount,
    refreshToken,
    hasPermission,
    hasGroupMembership,
    getPolicyValue,
    extendSession,
    getSessionRisk,
    updateDeviceInfo,
    logAuditEvent,
    getComplianceStatus,
    syncWithAd,
    getAdUserInfo,
    updateAdAttributes
  };

  return (
    <EnterpriseAuthContext.Provider value={contextValue}>
      {children}
    </EnterpriseAuthContext.Provider>
  );
};

/**
 * エンタープライズ認証フック
 */
export const useEnterpriseAuth = (): EnterpriseAuthContextType => {
  const context = useContext(EnterpriseAuthContext);
  
  if (context === undefined) {
    throw new Error('useEnterpriseAuth must be used within an EnterpriseAuthProvider');
  }
  
  return context;
};

/**
 * 権限ガードフック
 */
export const usePermissionGuard = (
  resource: PermissionResource,
  action: PermissionAction,
  conditions?: Record<string, any>
): boolean => {
  const { hasPermission, isAuthenticated } = useEnterpriseAuth();
  
  if (!isAuthenticated) return false;
  
  return hasPermission(resource, action, conditions);
};

/**
 * グループメンバーシップガードフック
 */
export const useGroupMembershipGuard = (groupName: string): boolean => {
  const { hasGroupMembership, isAuthenticated } = useEnterpriseAuth();
  
  if (!isAuthenticated) return false;
  
  return hasGroupMembership(groupName);
};