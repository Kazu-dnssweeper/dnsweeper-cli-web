/**
 * DNSweeper 認証APIクライアント
 */

import { apiClient } from './api';
import type { 
  LoginRequest, 
  LoginResponse, 
  SwitchAccountRequest, 
  SwitchAccountResponse,
  User,
  Account,
  Permission
} from '../types/auth';

export interface AuthApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export const authApi = {
  /**
   * ユーザーログイン
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<AuthApiResponse<LoginResponse>>('/auth/login', credentials);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'ログインに失敗しました');
    }

    return response.data.data;
  },

  /**
   * ユーザーログアウト
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // ログアウトはエラーでも続行
      console.warn('Logout request failed:', error);
    }
  },

  /**
   * トークン更新
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; expiresAt: Date }> {
    const response = await apiClient.post<AuthApiResponse<{ token: string; expiresAt: string }>>('/auth/refresh', {
      refreshToken
    });

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'トークン更新に失敗しました');
    }

    return {
      token: response.data.data.token,
      expiresAt: new Date(response.data.data.expiresAt)
    };
  },

  /**
   * 現在のユーザー情報取得
   */
  async getMe(): Promise<{ user: User; account: Account; permissions: Permission[] }> {
    const response = await apiClient.get<AuthApiResponse<{
      user: User;
      account: Account;
      permissions: Permission[];
    }>>('/auth/me');

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'ユーザー情報の取得に失敗しました');
    }

    return response.data.data;
  },

  /**
   * アクセス可能なアカウント一覧取得
   */
  async getAccounts(): Promise<{ accounts: Account[]; currentAccount: Account }> {
    const response = await apiClient.get<AuthApiResponse<{
      accounts: Account[];
      currentAccount: Account;
    }>>('/auth/accounts');

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'アカウント一覧の取得に失敗しました');
    }

    return response.data.data;
  },

  /**
   * アカウント切り替え
   */
  async switchAccount(request: SwitchAccountRequest): Promise<SwitchAccountResponse> {
    const response = await apiClient.post<AuthApiResponse<SwitchAccountResponse>>('/auth/switch-account', request);

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'アカウント切り替えに失敗しました');
    }

    return response.data.data;
  },

  /**
   * 権限一覧取得
   */
  async getPermissions(): Promise<{ permissions: Permission[]; account: Account; user: User }> {
    const response = await apiClient.get<AuthApiResponse<{
      permissions: Permission[];
      account: Account;
      user: User;
    }>>('/auth/permissions');

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '権限情報の取得に失敗しました');
    }

    return response.data.data;
  }
};