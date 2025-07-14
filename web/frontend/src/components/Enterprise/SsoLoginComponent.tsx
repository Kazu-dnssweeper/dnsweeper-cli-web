/**
 * DNSweeper エンタープライズSSO認証コンポーネント
 * Active Directory・SAML・OAuth統合ログインシステム
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { useEnterpriseAuth } from '../../contexts/EnterpriseAuthContext';
import {
  SsoProvider,
  EnterpriseLoginRequest,
  LocalCredentials,
  SamlCredentials,
  AdCredentials,
  OAuthCredentials
} from '../../types/enterprise-auth';

interface SsoLoginComponentProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
  redirectUrl?: string;
}

/**
 * エンタープライズSSO認証コンポーネント
 */
export const SsoLoginComponent: React.FC<SsoLoginComponentProps> = ({
  onLoginSuccess,
  onLoginError,
  redirectUrl
}) => {
  const [selectedProvider, setSelectedProvider] = useState<SsoProvider>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<SsoProviderInfo[]>([]);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    domain: '',
    userPrincipalName: '',
    rememberMe: false
  });
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);

  const { login, isAuthenticated } = useEnterpriseAuth();

  // 認証済みの場合はリダイレクト
  useEffect(() => {
    if (isAuthenticated && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [isAuthenticated, redirectUrl]);

  // 利用可能なSSO プロバイダーを取得
  useEffect(() => {
    fetchAvailableProviders();
  }, []);

  // ドメイン入力時の自動補完
  useEffect(() => {
    if (loginForm.email.includes('@')) {
      const domain = loginForm.email.split('@')[1];
      if (domain) {
        fetchDomainSuggestions(domain);
      }
    }
  }, [loginForm.email]);

  /**
   * 利用可能なSSO プロバイダー取得
   */
  const fetchAvailableProviders = async (): Promise<void> => {
    try {
      const response = await fetch('/api/enterprise/auth/providers');
      if (response.ok) {
        const data = await response.json();
        setAvailableProviders(data.providers);
        
        // デフォルトプロバイダーを設定
        if (data.providers.length > 0) {
          const defaultProvider = data.providers.find((p: SsoProviderInfo) => p.isDefault) || data.providers[0];
          setSelectedProvider(defaultProvider.type);
        }
      }
    } catch (error) {
      console.error('SSO プロバイダー取得エラー:', error);
    }
  };

  /**
   * ドメイン自動補完候補の取得
   */
  const fetchDomainSuggestions = async (domain: string): Promise<void> => {
    try {
      const response = await fetch(`/api/enterprise/auth/domains/suggest?q=${encodeURIComponent(domain)}`);
      if (response.ok) {
        const data = await response.json();
        setDomainSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('ドメイン候補取得エラー:', error);
    }
  };

  /**
   * ローカル認証処理
   */
  const handleLocalLogin = async (): Promise<void> => {
    const credentials: LocalCredentials = {
      type: 'local',
      email: loginForm.email,
      password: loginForm.password
    };

    const loginRequest: EnterpriseLoginRequest = {
      credentials,
      ssoProvider: 'local'
    };

    await executeLogin(loginRequest);
  };

  /**
   * Active Directory認証処理
   */
  const handleAdLogin = async (): Promise<void> => {
    if (!loginForm.userPrincipalName || !loginForm.password || !loginForm.domain) {
      onLoginError?.('Active Directory認証には、ユーザー名、パスワード、ドメインが必要です');
      return;
    }

    const credentials: AdCredentials = {
      type: 'active_directory',
      userPrincipalName: loginForm.userPrincipalName,
      password: loginForm.password,
      domain: loginForm.domain
    };

    const loginRequest: EnterpriseLoginRequest = {
      credentials,
      ssoProvider: 'active_directory',
      domain: loginForm.domain
    };

    await executeLogin(loginRequest);
  };

  /**
   * SAML認証開始
   */
  const handleSamlLogin = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // SAML認証リクエスト生成
      const response = await fetch('/api/enterprise/auth/saml/login', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // IdPにリダイレクト
        window.location.href = data.data.loginUrl;
      } else {
        throw new Error('SAML認証の開始に失敗しました');
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'SAML認証エラー';
      onLoginError?.(errorMessage);
    }
  };

  /**
   * OAuth認証開始
   */
  const handleOAuthLogin = async (provider: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/enterprise/auth/oauth/${provider}/login`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        throw new Error('OAuth認証の開始に失敗しました');
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'OAuth認証エラー';
      onLoginError?.(errorMessage);
    }
  };

  /**
   * 共通ログイン実行処理
   */
  const executeLogin = async (loginRequest: EnterpriseLoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      await login(loginRequest);
      onLoginSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました';
      onLoginError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * フォーム入力ハンドラー
   */
  const handleInputChange = useCallback((field: string, value: string | boolean): void => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * ドメイン候補選択
   */
  const handleDomainSuggestionSelect = (domain: string): void => {
    const emailParts = loginForm.email.split('@');
    const newEmail = `${emailParts[0]}@${domain}`;
    handleInputChange('email', newEmail);
    setDomainSuggestions([]);
  };

  /**
   * プロバイダー別ログインボタンレンダリング
   */
  const renderProviderLogin = (): JSX.Element => {
    switch (selectedProvider) {
      case 'local':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
                disabled={isLoading}
              />
              {domainSuggestions.length > 0 && (
                <div className="mt-1 bg-white border border-gray-300 rounded-md shadow-sm">
                  {domainSuggestions.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => handleDomainSuggestionSelect(domain)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                    >
                      {loginForm.email.split('@')[0]}@{domain}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワードを入力"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={loginForm.rememberMe}
                onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                ログイン状態を保持する
              </label>
            </div>
            <Button
              onClick={handleLocalLogin}
              disabled={isLoading || !loginForm.email || !loginForm.password}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'ログイン'}
            </Button>
          </div>
        );

      case 'active_directory':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ドメイン
              </label>
              <input
                type="text"
                value={loginForm.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="example.com"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ユーザー名 (UPN)
              </label>
              <input
                type="text"
                value={loginForm.userPrincipalName}
                onChange={(e) => handleInputChange('userPrincipalName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワードを入力"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleAdLogin}
              disabled={isLoading || !loginForm.userPrincipalName || !loginForm.password || !loginForm.domain}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Active Directory でログイン'}
            </Button>
          </div>
        );

      case 'saml':
        return (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 mb-4">
              SAML Identity Provider経由でログインします
            </div>
            <Button
              onClick={handleSamlLogin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'SAML でログイン'}
            </Button>
          </div>
        );

      case 'oauth2':
        const oauthProviders = availableProviders.filter(p => p.type === 'oauth2');
        return (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 mb-4">
              OAuth Provider経由でログインします
            </div>
            {oauthProviders.map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleOAuthLogin(provider.providerId)}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : `${provider.displayName} でログイン`}
              </Button>
            ))}
          </div>
        );

      default:
        return <div className="text-red-500">サポートされていない認証プロバイダーです</div>;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">DNSweeper ログイン</h2>
          <p className="text-gray-600 mt-2">エンタープライズアカウントでサインイン</p>
        </div>

        {/* SSO プロバイダー選択 */}
        {availableProviders.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              認証方法を選択
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setSelectedProvider(provider.type)}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    selectedProvider === provider.type
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={isLoading}
                >
                  {provider.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 選択されたプロバイダーのログインフォーム */}
        {renderProviderLogin()}

        {/* 追加のリンク */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            <a href="/forgot-password" className="text-blue-600 hover:text-blue-500">
              パスワードをお忘れですか？
            </a>
          </div>
          {selectedProvider === 'local' && (
            <div className="text-sm text-gray-600 mt-2">
              アカウントをお持ちでない場合は{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-500">
                新規登録
              </a>
            </div>
          )}
        </div>

        {/* セキュリティ情報 */}
        <div className="mt-6 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            SSL/TLS暗号化で保護されています
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * SSO プロバイダー情報
 */
interface SsoProviderInfo {
  id: string;
  type: SsoProvider;
  displayName: string;
  providerId: string;
  isDefault: boolean;
  enabled: boolean;
  configuration: Record<string, any>;
}

export default SsoLoginComponent;