/**
 * DNSweeper 設定管理UI
 * 
 * アカウント設定・システム設定・セキュリティ設定・通知設定
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cog6ToothIcon,
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  KeyIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon,
  ServerIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useNotifications } from '../components/UI/Notification';
import { cn } from '../utils/cn';

interface UserSettings {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | 'viewer';
  timezone: string;
  language: 'ja' | 'en';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    riskAlerts: boolean;
    performanceAlerts: boolean;
    systemUpdates: boolean;
  };
  createdAt: Date;
  lastLoginAt: Date;
}

interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    expirationDays: number;
  };
  sessionPolicy: {
    timeoutMinutes: number;
    maxConcurrentSessions: number;
    requireReauth: boolean;
  };
  twoFactorAuth: {
    enabled: boolean;
    method: 'totp' | 'sms' | 'email';
    backupCodes: string[];
  };
  apiKeys: ApiKey[];
  auditLog: {
    enabled: boolean;
    retentionDays: number;
  };
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

interface SystemSettings {
  dns: {
    defaultTTL: number;
    resolverTimeout: number;
    retryAttempts: number;
    cachingEnabled: boolean;
    cacheTTL: number;
  };
  monitoring: {
    checkInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      availability: number;
    };
    retentionDays: number;
  };
  reporting: {
    autoGenerate: boolean;
    schedule: 'daily' | 'weekly' | 'monthly';
    formats: ('pdf' | 'excel' | 'csv')[];
    emailRecipients: string[];
  };
  backup: {
    enabled: boolean;
    schedule: 'daily' | 'weekly';
    retentionDays: number;
    location: 's3' | 'local';
  };
}

interface NotificationSettings {
  channels: {
    email: {
      enabled: boolean;
      address: string;
      verified: boolean;
    };
    webhook: {
      enabled: boolean;
      url: string;
      secret: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
  rules: NotificationRule[];
}

interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'risk_threshold' | 'performance_degradation' | 'system_error' | 'security_event';
  conditions: {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'contains';
    value: any;
  }[];
  actions: {
    channel: 'email' | 'webhook' | 'slack';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'system' | 'notifications'>('account');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ name: '', permissions: [] as string[] });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  // ユーザー設定の取得
  const { data: userSettings, isLoading: userLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockSettings: UserSettings = {
        id: 'user_1',
        email: 'admin@example.com',
        name: 'DNSweeper Administrator',
        role: 'admin',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        theme: 'auto',
        notifications: {
          email: true,
          push: false,
          riskAlerts: true,
          performanceAlerts: true,
          systemUpdates: false
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      };
      return Promise.resolve(mockSettings);
    }
  });

  // セキュリティ設定の取得
  const { data: securitySettings, isLoading: securityLoading } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockSettings: SecuritySettings = {
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          expirationDays: 90
        },
        sessionPolicy: {
          timeoutMinutes: 480,
          maxConcurrentSessions: 5,
          requireReauth: true
        },
        twoFactorAuth: {
          enabled: false,
          method: 'totp',
          backupCodes: []
        },
        apiKeys: [
          {
            id: 'key_1',
            name: 'Production API',
            key: 'dnsw_••••••••••••••••',
            permissions: ['read', 'write'],
            lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
            isActive: true,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        ],
        auditLog: {
          enabled: true,
          retentionDays: 90
        }
      };
      return Promise.resolve(mockSettings);
    }
  });

  // システム設定の取得
  const { data: systemSettings, isLoading: systemLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockSettings: SystemSettings = {
        dns: {
          defaultTTL: 3600,
          resolverTimeout: 5000,
          retryAttempts: 3,
          cachingEnabled: true,
          cacheTTL: 300
        },
        monitoring: {
          checkInterval: 300,
          alertThresholds: {
            responseTime: 1000,
            errorRate: 5,
            availability: 95
          },
          retentionDays: 30
        },
        reporting: {
          autoGenerate: true,
          schedule: 'weekly',
          formats: ['pdf', 'excel'],
          emailRecipients: ['admin@example.com']
        },
        backup: {
          enabled: true,
          schedule: 'daily',
          retentionDays: 30,
          location: 's3'
        }
      };
      return Promise.resolve(mockSettings);
    }
  });

  // 通知設定の取得
  const { data: notificationSettings, isLoading: notificationLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockSettings: NotificationSettings = {
        channels: {
          email: {
            enabled: true,
            address: 'admin@example.com',
            verified: true
          },
          webhook: {
            enabled: false,
            url: '',
            secret: ''
          },
          slack: {
            enabled: false,
            webhookUrl: '',
            channel: '#dns-alerts'
          }
        },
        rules: [
          {
            id: 'rule_1',
            name: '高リスクアラート',
            enabled: true,
            trigger: 'risk_threshold',
            conditions: [
              {
                field: 'riskScore',
                operator: 'gt',
                value: 8.0
              }
            ],
            actions: [
              {
                channel: 'email',
                message: '高リスクなDNSレコードが検出されました',
                severity: 'high'
              }
            ]
          }
        ]
      };
      return Promise.resolve(mockSettings);
    }
  });

  // 設定更新
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { type: string; settings: any }) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '設定を更新しました',
        autoClose: true,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['userSettings', 'securitySettings', 'systemSettings', 'notificationSettings'] });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: '設定の更新に失敗しました',
        message: error.message || '設定の保存中にエラーが発生しました',
        autoClose: true,
        duration: 5000
      });
    }
  });

  // パスワード変更
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      // TODO: 実際のAPI実装
      if (data.new !== data.confirm) {
        throw new Error('新しいパスワードが一致しません');
      }
      if (data.new.length < 12) {
        throw new Error('パスワードは12文字以上である必要があります');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'パスワードを変更しました',
        autoClose: true,
        duration: 3000
      });
      setShowPasswordDialog(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'パスワード変更に失敗しました',
        message: error.message,
        autoClose: true,
        duration: 5000
      });
    }
  });

  // APIキー生成
  const generateApiKeyMutation = useMutation({
    mutationFn: async (data: typeof newApiKey) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: `key_${Date.now()}`,
        name: data.name,
        key: `dnsw_${Math.random().toString(36).substring(2, 30)}`,
        permissions: data.permissions,
        isActive: true,
        createdAt: new Date()
      };
    },
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'APIキーを生成しました',
        message: `キー: ${data.key}`,
        autoClose: false,
        duration: 10000
      });
      queryClient.invalidateQueries({ queryKey: ['securitySettings'] });
      setShowApiKeyDialog(false);
      setNewApiKey({ name: '', permissions: [] });
    }
  });

  const formatDate = (date: Date) => {
    return date.toLocaleString('ja-JP');
  };

  const tabs = [
    { key: 'account', label: 'アカウント', icon: UserIcon },
    { key: 'security', label: 'セキュリティ', icon: ShieldCheckIcon },
    { key: 'system', label: 'システム', icon: ServerIcon },
    { key: 'notifications', label: '通知', icon: BellIcon }
  ];

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            設定
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            アカウント・セキュリティ・システム設定の管理
          </p>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* アカウント設定 */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {userLoading ? (
            <LoadingSpinner text="アカウント設定を読み込み中..." />
          ) : userSettings ? (
            <>
              {/* プロフィール */}
              <Card>
                <CardHeader>
                  <CardTitle>プロフィール</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        名前
                      </label>
                      <input
                        type="text"
                        value={userSettings.name}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        value={userSettings.email}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        タイムゾーン
                      </label>
                      <select
                        value={userSettings.timezone}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        言語
                      </label>
                      <select
                        value={userSettings.language}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="ja">日本語</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p>アカウント作成: {formatDate(userSettings.createdAt)}</p>
                      <p>最終ログイン: {formatDate(userSettings.lastLoginAt)}</p>
                    </div>
                    <Button
                      onClick={() => updateSettingsMutation.mutate({ type: 'account', settings: userSettings })}
                      loading={updateSettingsMutation.isPending}
                    >
                      保存
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* テーマ設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>表示設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      テーマ
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'light', label: 'ライト' },
                        { value: 'dark', label: 'ダーク' },
                        { value: 'auto', label: '自動' }
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          className={cn(
                            'p-4 border rounded-lg text-center',
                            userSettings.theme === theme.value
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          )}
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 通知設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>通知設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'email', label: 'メール通知' },
                    { key: 'push', label: 'プッシュ通知' },
                    { key: 'riskAlerts', label: 'リスクアラート' },
                    { key: 'performanceAlerts', label: 'パフォーマンスアラート' },
                    { key: 'systemUpdates', label: 'システム更新通知' }
                  ].map((notification) => (
                    <div key={notification.key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.label}
                      </span>
                      <button
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          userSettings.notifications[notification.key as keyof typeof userSettings.notifications]
                            ? 'bg-primary-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            userSettings.notifications[notification.key as keyof typeof userSettings.notifications]
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* セキュリティ設定 */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {securityLoading ? (
            <LoadingSpinner text="セキュリティ設定を読み込み中..." />
          ) : securitySettings ? (
            <>
              {/* パスワード設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>パスワード・認証</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        パスワード
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        最後に変更されてから90日が経過しています
                      </p>
                    </div>
                    <Button
                      icon={<KeyIcon className="w-4 h-4" />}
                      onClick={() => setShowPasswordDialog(true)}
                      variant="secondary"
                    >
                      変更
                    </Button>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          二要素認証
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          アカウントのセキュリティを向上させます
                        </p>
                      </div>
                      <Button
                        variant={securitySettings.twoFactorAuth.enabled ? 'danger' : 'primary'}
                      >
                        {securitySettings.twoFactorAuth.enabled ? '無効化' : '有効化'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* APIキー管理 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>APIキー</CardTitle>
                    <Button
                      icon={<KeyIcon className="w-4 h-4" />}
                      onClick={() => setShowApiKeyDialog(true)}
                    >
                      新しいキー
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {securitySettings.apiKeys.map((apiKey) => (
                      <div
                        key={apiKey.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {apiKey.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {apiKey.key}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            作成: {formatDate(apiKey.createdAt)}
                            {apiKey.lastUsed && ` • 最終使用: ${formatDate(apiKey.lastUsed)}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            'px-2 py-1 text-xs rounded',
                            apiKey.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          )}>
                            {apiKey.isActive ? 'アクティブ' : '無効'}
                          </span>
                          <Button
                            size="sm"
                            variant="danger"
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* セキュリティポリシー */}
              <Card>
                <CardHeader>
                  <CardTitle>セキュリティポリシー</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        パスワードポリシー
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• 最小長: {securitySettings.passwordPolicy.minLength}文字</li>
                        <li>• 大文字: {securitySettings.passwordPolicy.requireUppercase ? '必須' : '任意'}</li>
                        <li>• 数字: {securitySettings.passwordPolicy.requireNumbers ? '必須' : '任意'}</li>
                        <li>• 記号: {securitySettings.passwordPolicy.requireSymbols ? '必須' : '任意'}</li>
                        <li>• 有効期限: {securitySettings.passwordPolicy.expirationDays}日</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        セッションポリシー
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• タイムアウト: {securitySettings.sessionPolicy.timeoutMinutes}分</li>
                        <li>• 最大セッション数: {securitySettings.sessionPolicy.maxConcurrentSessions}</li>
                        <li>• 再認証: {securitySettings.sessionPolicy.requireReauth ? '必須' : '任意'}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* システム設定（管理者のみ） */}
      {activeTab === 'system' && userSettings?.role === 'admin' && (
        <div className="space-y-6">
          {systemLoading ? (
            <LoadingSpinner text="システム設定を読み込み中..." />
          ) : systemSettings ? (
            <>
              {/* DNS設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>DNS設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        デフォルトTTL (秒)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.dns.defaultTTL}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        リゾルバータイムアウト (ms)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.dns.resolverTimeout}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        リトライ回数
                      </label>
                      <input
                        type="number"
                        value={systemSettings.dns.retryAttempts}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        キャッシュTTL (秒)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.dns.cacheTTL}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      DNSキャッシュを有効化
                    </span>
                    <button
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        systemSettings.dns.cachingEnabled
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          systemSettings.dns.cachingEnabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* 監視設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>監視設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        チェック間隔 (秒)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.monitoring.checkInterval}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        データ保持期間 (日)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.monitoring.retentionDays}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      アラート閾値
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          応答時間 (ms)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.monitoring.alertThresholds.responseTime}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          エラー率 (%)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.monitoring.alertThresholds.errorRate}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          可用性 (%)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.monitoring.alertThresholds.availability}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* バックアップ設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>バックアップ設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      自動バックアップを有効化
                    </span>
                    <button
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        systemSettings.backup.enabled
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          systemSettings.backup.enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        スケジュール
                      </label>
                      <select
                        value={systemSettings.backup.schedule}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="daily">毎日</option>
                        <option value="weekly">毎週</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        保持期間 (日)
                      </label>
                      <input
                        type="number"
                        value={systemSettings.backup.retentionDays}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        保存場所
                      </label>
                      <select
                        value={systemSettings.backup.location}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="s3">Amazon S3</option>
                        <option value="local">ローカル</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* 通知設定 */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {notificationLoading ? (
            <LoadingSpinner text="通知設定を読み込み中..." />
          ) : notificationSettings ? (
            <>
              {/* 通知チャネル */}
              <Card>
                <CardHeader>
                  <CardTitle>通知チャネル</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* メール */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                        <BellIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          メール通知
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {notificationSettings.channels.email.address}
                          {notificationSettings.channels.email.verified && (
                            <CheckCircleIcon className="w-4 h-4 text-green-500 inline ml-2" />
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        notificationSettings.channels.email.enabled
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          notificationSettings.channels.email.enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {/* Webhook */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                        <GlobeAltIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Webhook
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          カスタムHTTPエンドポイント
                        </p>
                      </div>
                    </div>
                    <button
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        notificationSettings.channels.webhook.enabled
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          notificationSettings.channels.webhook.enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {/* Slack */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/50 rounded-lg">
                        <ChartBarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Slack
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {notificationSettings.channels.slack.channel || '未設定'}
                        </p>
                      </div>
                    </div>
                    <button
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        notificationSettings.channels.slack.enabled
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          notificationSettings.channels.slack.enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* 通知ルール */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>通知ルール</CardTitle>
                    <Button
                      icon={<BellIcon className="w-4 h-4" />}
                    >
                      新しいルール
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notificationSettings.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {rule.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            トリガー: {rule.trigger} • アクション: {rule.actions.length}件
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            'px-2 py-1 text-xs rounded',
                            rule.enabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          )}>
                            {rule.enabled ? '有効' : '無効'}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                          >
                            編集
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* パスワード変更ダイアログ */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                パスワード変更
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    現在のパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    新しいパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.new ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    パスワード確認
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.confirm ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordForm({ current: '', new: '', confirm: '' });
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => changePasswordMutation.mutate(passwordForm)}
                  loading={changePasswordMutation.isPending}
                  disabled={!passwordForm.current || !passwordForm.new || !passwordForm.confirm}
                >
                  変更
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APIキー生成ダイアログ */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                新しいAPIキー
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    キー名
                  </label>
                  <input
                    type="text"
                    value={newApiKey.name}
                    onChange={(e) => setNewApiKey(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="例: 本番環境API"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    権限
                  </label>
                  <div className="space-y-2">
                    {['read', 'write', 'delete', 'admin'].map((permission) => (
                      <label key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newApiKey.permissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewApiKey(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, permission]
                              }));
                            } else {
                              setNewApiKey(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== permission)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                          {permission}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowApiKeyDialog(false);
                    setNewApiKey({ name: '', permissions: [] });
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => generateApiKeyMutation.mutate(newApiKey)}
                  loading={generateApiKeyMutation.isPending}
                  disabled={!newApiKey.name || newApiKey.permissions.length === 0}
                >
                  生成
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};