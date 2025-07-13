/**
 * DNSweeper 認証コンテキスト
 * 
 * マルチアカウント対応、自動トークン更新、権限管理
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authApi } from '../services/authApi';
import { useNotifications } from '../components/UI/Notification';
import type { 
  AuthContextType, 
  User, 
  Account, 
  Permission,
  LoginRequest,
  PermissionResource,
  PermissionAction
} from '../types/auth';

// 認証状態の型定義
interface AuthState {
  user: User | null;
  account: Account | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

// アクションの型定義
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; account: Account; permissions: Permission[]; token: string; refreshToken: string; expiresAt: Date } }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_TOKEN'; payload: { token: string; expiresAt: Date } }
  | { type: 'SWITCH_ACCOUNT'; payload: { account: Account; permissions: Permission[]; token: string; expiresAt: Date } }
  | { type: 'SET_LOADING'; payload: boolean };

// 初期状態
const initialState: AuthState = {
  user: null,
  account: null,
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
  token: localStorage.getItem('dnsweeper_token'),
  refreshToken: localStorage.getItem('dnsweeper_refresh_token'),
  tokenExpiresAt: localStorage.getItem('dnsweeper_token_expires') 
    ? new Date(localStorage.getItem('dnsweeper_token_expires')!) 
    : null
};

// リデューサー
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        account: action.payload.account,
        permissions: action.payload.permissions,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        tokenExpiresAt: action.payload.expiresAt,
        isLoading: false,
        isAuthenticated: true
      };

    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        account: null,
        permissions: [],
        token: null,
        refreshToken: null,
        tokenExpiresAt: null,
        isLoading: false,
        isAuthenticated: false
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        account: null,
        permissions: [],
        token: null,
        refreshToken: null,
        tokenExpiresAt: null,
        isLoading: false,
        isAuthenticated: false
      };

    case 'UPDATE_TOKEN':
      return {
        ...state,
        token: action.payload.token,
        tokenExpiresAt: action.payload.expiresAt
      };

    case 'SWITCH_ACCOUNT':
      return {
        ...state,
        account: action.payload.account,
        permissions: action.payload.permissions,
        token: action.payload.token,
        tokenExpiresAt: action.payload.expiresAt
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
};

// コンテキスト作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// プロバイダーコンポーネント
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { addNotification } = useNotifications();

  // ローカルストレージ同期
  useEffect(() => {
    if (state.token) {
      localStorage.setItem('dnsweeper_token', state.token);
    } else {
      localStorage.removeItem('dnsweeper_token');
    }

    if (state.refreshToken) {
      localStorage.setItem('dnsweeper_refresh_token', state.refreshToken);
    } else {
      localStorage.removeItem('dnsweeper_refresh_token');
    }

    if (state.tokenExpiresAt) {
      localStorage.setItem('dnsweeper_token_expires', state.tokenExpiresAt.toISOString());
    } else {
      localStorage.removeItem('dnsweeper_token_expires');
    }
  }, [state.token, state.refreshToken, state.tokenExpiresAt]);

  // APIクライアントにトークン設定
  useEffect(() => {
    const axios = require('axios');
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [state.token]);

  // 初期化（既存トークンでのユーザー情報取得）
  useEffect(() => {
    const initializeAuth = async () => {
      if (state.token && state.tokenExpiresAt && state.tokenExpiresAt > new Date()) {
        try {
          const { user, account, permissions } = await authApi.getMe();
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user,
              account,
              permissions,
              token: state.token,
              refreshToken: state.refreshToken || '',
              expiresAt: state.tokenExpiresAt
            }
          });
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []); // 初回のみ実行

  // ログイン
  const login = useCallback(async (credentials: LoginRequest) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await authApi.login(credentials);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.user,
          account: response.account,
          permissions: response.permissions,
          token: response.session.token,
          refreshToken: response.session.refreshToken,
          expiresAt: response.session.expiresAt
        }
      });

      addNotification({
        type: 'success',
        title: 'ログインしました',
        message: `${response.account.name} アカウントにログインしました`,
        autoClose: true,
        duration: 3000
      });

    } catch (error: any) {
      dispatch({ type: 'LOGIN_ERROR' });
      
      addNotification({
        type: 'error',
        title: 'ログインに失敗しました',
        message: error.message || 'ログイン処理中にエラーが発生しました',
        autoClose: true,
        duration: 5000
      });

      throw error;
    }
  }, [addNotification]);

  // ログアウト
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }

    dispatch({ type: 'LOGOUT' });
    
    addNotification({
      type: 'info',
      title: 'ログアウトしました',
      message: 'セッションが終了しました',
      autoClose: true,
      duration: 3000
    });
  }, [addNotification]);

  // アカウント切り替え
  const switchAccount = useCallback(async (accountId: string) => {
    try {
      const response = await authApi.switchAccount({ accountId });
      
      dispatch({
        type: 'SWITCH_ACCOUNT',
        payload: {
          account: response.account,
          permissions: response.permissions,
          token: response.session.token,
          expiresAt: response.session.expiresAt
        }
      });

      addNotification({
        type: 'success',
        title: 'アカウントを切り替えました',
        message: `${response.account.name} に切り替えました`,
        autoClose: true,
        duration: 3000
      });

    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'アカウント切り替えに失敗しました',
        message: error.message || 'アカウント切り替え中にエラーが発生しました',
        autoClose: true,
        duration: 5000
      });

      throw error;
    }
  }, [addNotification]);

  // アカウント一覧取得
  const getAccounts = useCallback(async (): Promise<Account[]> => {
    try {
      const response = await authApi.getAccounts();
      return response.accounts;
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'アカウント一覧の取得に失敗しました',
        message: error.message || 'データの取得中にエラーが発生しました',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }, [addNotification]);

  // 権限チェック
  const hasPermission = useCallback((resource: PermissionResource, action: PermissionAction): boolean => {
    if (!state.isAuthenticated || !state.permissions) {
      return false;
    }

    return state.permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }, [state.isAuthenticated, state.permissions]);

  // トークン更新
  const updateToken = useCallback((token: string, expiresAt?: Date) => {
    dispatch({
      type: 'UPDATE_TOKEN',
      payload: {
        token,
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // デフォルト24時間
      }
    });
  }, []);

  // 自動トークン更新
  useEffect(() => {
    if (!state.token || !state.refreshToken || !state.tokenExpiresAt) {
      return;
    }

    const timeUntilExpiry = state.tokenExpiresAt.getTime() - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // 5分前、最低1秒

    const refreshTimer = setTimeout(async () => {
      try {
        const { token, expiresAt } = await authApi.refreshToken(state.refreshToken!);
        updateToken(token, expiresAt);
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [state.token, state.refreshToken, state.tokenExpiresAt, updateToken, logout]);

  const contextValue: AuthContextType = {
    user: state.user,
    account: state.account,
    permissions: state.permissions,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
    switchAccount,
    getAccounts,
    hasPermission,
    updateToken
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};