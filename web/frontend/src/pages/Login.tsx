/**
 * DNSweeper ログインページ
 * 
 * マルチアカウント対応、セキュアな認証フォーム
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ShieldCheckIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { cn } from '../utils/cn';

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    accountSlug: searchParams.get('account') || ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // すでに認証済みの場合はダッシュボードにリダイレクト
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoginLoading(true);

    // フォーム検証
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoginLoading(false);
      return;
    }

    try {
      await login({
        email: formData.email,
        password: formData.password,
        accountSlug: formData.accountSlug || undefined
      });
    } catch (error: any) {
      if (error.message.includes('credentials')) {
        setErrors({ form: 'メールアドレスまたはパスワードが正しくありません' });
      } else if (error.message.includes('account')) {
        setErrors({ accountSlug: 'アカウントが見つかりません' });
      } else {
        setErrors({ form: error.message || 'ログインに失敗しました' });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner text="認証状態を確認中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <ShieldCheckIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            DNSweeper にログイン
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            DNS管理とセキュリティ分析プラットフォーム
          </p>
        </div>

        {/* フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.form && (
            <div className="rounded-md bg-error-50 dark:bg-error-900/20 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
                <div className="ml-3">
                  <p className="text-sm text-error-800 dark:text-error-200">
                    {errors.form}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                メールアドレス
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircleIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={cn(
                    "block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm",
                    "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    errors.email 
                      ? "border-error-300 focus:border-error-500 dark:border-error-600" 
                      : "border-gray-300 focus:border-primary-500 dark:border-gray-600"
                  )}
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.email}</p>
              )}
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                パスワード
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={cn(
                    "block w-full pr-10 pl-3 py-2 border rounded-md shadow-sm",
                    "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    errors.password 
                      ? "border-error-300 focus:border-error-500 dark:border-error-600" 
                      : "border-gray-300 focus:border-primary-500 dark:border-gray-600"
                  )}
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.password}</p>
              )}
            </div>

            {/* アカウント指定（オプション） */}
            <div>
              <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                アカウント（オプション）
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="account"
                  name="account"
                  type="text"
                  autoComplete="organization"
                  value={formData.accountSlug}
                  onChange={(e) => handleInputChange('accountSlug', e.target.value)}
                  className={cn(
                    "block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm",
                    "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    errors.accountSlug 
                      ? "border-error-300 focus:border-error-500 dark:border-error-600" 
                      : "border-gray-300 focus:border-primary-500 dark:border-gray-600"
                  )}
                  placeholder="company-name"
                />
              </div>
              {errors.accountSlug && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.accountSlug}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                特定のアカウントにログインする場合に指定してください
              </p>
            </div>
          </div>

          {/* ログインボタン */}
          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loginLoading}
              loading={loginLoading}
              className="w-full"
            >
              ログイン
            </Button>
          </div>

          {/* フッターリンク */}
          <div className="text-center space-y-2">
            <div className="text-sm">
              <a 
                href="#" 
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: パスワード リセット機能実装
                  alert('パスワード リセット機能は実装中です');
                }}
              >
                パスワードをお忘れの方
              </a>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              アカウントをお持ちでない方は{' '}
              <a 
                href="#" 
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: ユーザー登録機能実装
                  alert('ユーザー登録機能は実装中です');
                }}
              >
                新規登録
              </a>
            </div>
          </div>
        </form>

        {/* デモアカウント情報 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            デモアカウント
          </h3>
          <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
            <div><strong>メール:</strong> admin@demo-company.example</div>
            <div><strong>パスワード:</strong> demo123</div>
            <div><strong>アカウント:</strong> demo-company</div>
          </div>
        </div>
      </div>
    </div>
  );
};