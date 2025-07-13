/**
 * DNSweeper API統合管理ページ
 * 
 * Cloudflare・Route53・DNSプロバイダー統合管理
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CloudIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ChartBarIcon,
  KeyIcon,
  GlobeAltIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useNotifications } from '../components/UI/Notification';
import { cn } from '../utils/cn';

interface DNSProvider {
  id: string;
  name: string;
  type: 'cloudflare' | 'route53' | 'generic';
  enabled: boolean;
  status: 'connected' | 'error' | 'testing' | 'disconnected';
  lastSync?: Date;
  recordCount: number;
  zoneCount: number;
  config: {
    masked: boolean;
    configuredAt?: Date;
  };
  limits: {
    requestsPerSecond: number;
    requestsPerHour: number;
    maxConcurrent: number;
  };
  metrics: {
    successRate: number;
    averageResponseTime: number;
    requestsToday: number;
    errorsToday: number;
  };
}

interface SyncJob {
  id: string;
  providerId: string;
  type: 'full_sync' | 'incremental_sync' | 'zone_sync' | 'record_sync';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    errors: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  results: {
    zonesProcessed: number;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted: number;
    errors: string[];
  };
}

interface ProviderConfig {
  cloudflare?: {
    apiToken: string;
    accountId: string;
  };
  route53?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  generic?: {
    baseUrl: string;
    apiKey: string;
    authMethod: 'header' | 'query' | 'bearer';
  };
}

export const APIIntegrations: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configFormData, setConfigFormData] = useState<ProviderConfig>({});
  const [activeJobs, setActiveJobs] = useState<SyncJob[]>([]);
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  // プロバイダー一覧の取得
  const { data: providers, isLoading: providersLoading, refetch } = useQuery({
    queryKey: ['dnsProviders'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockProviders: DNSProvider[] = [
        {
          id: 'cloudflare_default',
          name: 'Cloudflare DNS',
          type: 'cloudflare',
          enabled: true,
          status: 'connected',
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
          recordCount: 245,
          zoneCount: 8,
          config: {
            masked: true,
            configuredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          limits: {
            requestsPerSecond: 4,
            requestsPerHour: 1200,
            maxConcurrent: 10
          },
          metrics: {
            successRate: 99.7,
            averageResponseTime: 124,
            requestsToday: 342,
            errorsToday: 1
          }
        },
        {
          id: 'route53_default',
          name: 'AWS Route53',
          type: 'route53',
          enabled: false,
          status: 'disconnected',
          recordCount: 0,
          zoneCount: 0,
          config: {
            masked: false
          },
          limits: {
            requestsPerSecond: 5,
            requestsPerHour: 1000,
            maxConcurrent: 5
          },
          metrics: {
            successRate: 0,
            averageResponseTime: 0,
            requestsToday: 0,
            errorsToday: 0
          }
        }
      ];
      return Promise.resolve(mockProviders);
    },
    refetchInterval: 30000 // 30秒ごとに更新
  });

  // 同期ジョブ一覧の取得
  const { data: syncJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['syncJobs'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockJobs: SyncJob[] = [
        {
          id: 'sync_1',
          providerId: 'cloudflare_default',
          type: 'incremental_sync',
          status: 'completed',
          progress: { total: 8, completed: 8, errors: 0 },
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
          results: {
            zonesProcessed: 8,
            recordsProcessed: 245,
            recordsCreated: 12,
            recordsUpdated: 8,
            recordsDeleted: 2,
            errors: []
          }
        }
      ];
      return Promise.resolve(mockJobs);
    }
  });

  // プロバイダー設定更新
  const updateProviderMutation = useMutation({
    mutationFn: async (data: { providerId: string; config: ProviderConfig }) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'プロバイダー設定を更新しました',
        message: '接続テストが正常に完了しました',
        autoClose: true,
        duration: 5000
      });
      queryClient.invalidateQueries({ queryKey: ['dnsProviders'] });
      setShowConfigDialog(false);
      setConfigFormData({});
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

  // 同期ジョブ開始
  const startSyncMutation = useMutation({
    mutationFn: async (data: { providerId: string; type: SyncJob['type'] }) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 500));
      return { jobId: `sync_${Date.now()}` };
    },
    onSuccess: (data) => {
      addNotification({
        type: 'info',
        title: '同期ジョブを開始しました',
        message: `ジョブID: ${data.jobId}`,
        autoClose: true,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['syncJobs'] });
    }
  });

  // プロバイダー接続テスト
  const testConnectionMutation = useMutation({
    mutationFn: async (providerId: string) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '接続テストが成功しました',
        message: 'プロバイダーとの通信が正常に確立されています',
        autoClose: true,
        duration: 5000
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: '接続テストに失敗しました',
        message: error.message || 'プロバイダーとの接続に問題があります',
        autoClose: true,
        duration: 5000
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-error-600" />;
      case 'testing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'disconnected':
        return <XCircleIcon className="w-5 h-5 text-gray-400" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'error':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'testing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'disconnected':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-warning-600 bg-warning-50 border-warning-200';
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'cloudflare':
        return '☁️';
      case 'route53':
        return '🌐';
      case 'generic':
        return '🔧';
      default:
        return '❓';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    return '1時間以内';
  };

  const handleConfigureProvider = (provider: DNSProvider) => {
    setSelectedProvider(provider.id);
    setShowConfigDialog(true);
    
    // 既存設定がある場合は初期値として設定
    if (provider.config.masked) {
      setConfigFormData({
        [provider.type]: {
          // マスクされた値の表示用ダミー
          ...(provider.type === 'cloudflare' && {
            apiToken: '••••••••••••••••',
            accountId: '••••••••••••••••'
          }),
          ...(provider.type === 'route53' && {
            accessKeyId: '••••••••••••••••',
            secretAccessKey: '••••••••••••••••',
            region: 'us-east-1'
          })
        }
      });
    }
  };

  const handleSaveConfig = () => {
    if (!selectedProvider) return;

    updateProviderMutation.mutate({
      providerId: selectedProvider,
      config: configFormData
    });
  };

  const renderConfigForm = () => {
    const provider = providers?.find(p => p.id === selectedProvider);
    if (!provider) return null;

    return (
      <div className="space-y-4">
        {provider.type === 'cloudflare' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API Token
              </label>
              <input
                type="password"
                value={configFormData.cloudflare?.apiToken || ''}
                onChange={(e) => setConfigFormData(prev => ({
                  ...prev,
                  cloudflare: { 
                    apiToken: e.target.value,
                    accountId: prev.cloudflare?.accountId || ''
                  }
                }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Cloudflare API Token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Account ID
              </label>
              <input
                type="text"
                value={configFormData.cloudflare?.accountId || ''}
                onChange={(e) => setConfigFormData(prev => ({
                  ...prev,
                  cloudflare: { 
                    apiToken: prev.cloudflare?.apiToken || '',
                    accountId: e.target.value
                  }
                }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Cloudflare Account ID"
              />
            </div>
          </>
        )}

        {provider.type === 'route53' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Access Key ID
              </label>
              <input
                type="text"
                value={configFormData.route53?.accessKeyId || ''}
                onChange={(e) => setConfigFormData(prev => ({
                  ...prev,
                  route53: { 
                    accessKeyId: e.target.value,
                    secretAccessKey: prev.route53?.secretAccessKey || '',
                    region: prev.route53?.region || 'us-east-1'
                  }
                }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="AWS Access Key ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Secret Access Key
              </label>
              <input
                type="password"
                value={configFormData.route53?.secretAccessKey || ''}
                onChange={(e) => setConfigFormData(prev => ({
                  ...prev,
                  route53: { 
                    accessKeyId: prev.route53?.accessKeyId || '',
                    secretAccessKey: e.target.value,
                    region: prev.route53?.region || 'us-east-1'
                  }
                }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="AWS Secret Access Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Region
              </label>
              <select
                value={configFormData.route53?.region || 'us-east-1'}
                onChange={(e) => setConfigFormData(prev => ({
                  ...prev,
                  route53: { 
                    accessKeyId: prev.route53?.accessKeyId || '',
                    secretAccessKey: prev.route53?.secretAccessKey || '',
                    region: e.target.value
                  }
                }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              </select>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            API統合管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNSプロバイダーとの統合・同期設定管理
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={() => refetch()}
            loading={providersLoading}
            variant="secondary"
          >
            更新
          </Button>
        </div>
      </div>

      {/* プロバイダー一覧 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providersLoading ? (
          <div className="col-span-2 text-center py-12">
            <LoadingSpinner text="プロバイダー情報を読み込み中..." />
          </div>
        ) : (
          providers?.map((provider) => (
            <Card key={provider.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getProviderIcon(provider.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {provider.type.charAt(0).toUpperCase() + provider.type.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(provider.status)}
                    <span className={cn(
                      'text-xs px-2 py-1 rounded border font-medium',
                      getStatusColor(provider.status)
                    )}>
                      {provider.status === 'connected' ? '接続済み' :
                       provider.status === 'error' ? 'エラー' :
                       provider.status === 'testing' ? 'テスト中' : '未接続'}
                    </span>
                  </div>
                </div>

                {/* 統計情報 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ゾーン数</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {provider.zoneCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">レコード数</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {provider.recordCount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* パフォーマンス情報 */}
                {provider.enabled && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">成功率</p>
                        <p className="font-medium">{provider.metrics.successRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">応答時間</p>
                        <p className="font-medium">{provider.metrics.averageResponseTime}ms</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">今日のリクエスト</p>
                        <p className="font-medium">{provider.metrics.requestsToday}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">今日のエラー</p>
                        <p className="font-medium text-error-600">{provider.metrics.errorsToday}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 最終同期時刻 */}
                {provider.lastSync && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    最終同期: {formatTimeAgo(provider.lastSync)}
                  </p>
                )}

                {/* アクションボタン */}
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    icon={<Cog6ToothIcon className="w-4 h-4" />}
                    onClick={() => handleConfigureProvider(provider)}
                    variant="secondary"
                  >
                    設定
                  </Button>
                  
                  {provider.enabled && (
                    <>
                      <Button
                        size="sm"
                        icon={<KeyIcon className="w-4 h-4" />}
                        onClick={() => testConnectionMutation.mutate(provider.id)}
                        loading={testConnectionMutation.isPending}
                        variant="secondary"
                      >
                        接続テスト
                      </Button>
                      
                      <Button
                        size="sm"
                        icon={<ArrowPathIcon className="w-4 h-4" />}
                        onClick={() => startSyncMutation.mutate({
                          providerId: provider.id,
                          type: 'incremental_sync'
                        })}
                        loading={startSyncMutation.isPending}
                      >
                        同期
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 同期ジョブ履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>同期ジョブ履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <LoadingSpinner text="同期ジョブを読み込み中..." />
          ) : syncJobs && syncJobs.length > 0 ? (
            <div className="space-y-3">
              {syncJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {job.type === 'full_sync' ? '完全同期' :
                         job.type === 'incremental_sync' ? '増分同期' :
                         job.type === 'zone_sync' ? 'ゾーン同期' : 'レコード同期'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        プロバイダー: {providers?.find(p => p.id === job.providerId)?.name}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded border font-medium',
                      job.status === 'completed' && 'text-success-600 bg-success-50 border-success-200',
                      job.status === 'failed' && 'text-error-600 bg-error-50 border-error-200',
                      job.status === 'running' && 'text-blue-600 bg-blue-50 border-blue-200',
                      job.status === 'pending' && 'text-warning-600 bg-warning-50 border-warning-200'
                    )}>
                      {job.status === 'completed' ? '完了' :
                       job.status === 'failed' ? '失敗' :
                       job.status === 'running' ? '実行中' : '待機中'}
                    </span>
                  </div>

                  {job.status === 'completed' && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">処理ゾーン</p>
                        <p className="font-medium">{job.results.zonesProcessed}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">処理レコード</p>
                        <p className="font-medium">{job.results.recordsProcessed}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">作成</p>
                        <p className="font-medium text-success-600">{job.results.recordsCreated}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">更新</p>
                        <p className="font-medium text-blue-600">{job.results.recordsUpdated}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">削除</p>
                        <p className="font-medium text-error-600">{job.results.recordsDeleted}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      開始: {job.startedAt ? formatTimeAgo(job.startedAt) : '未開始'}
                    </span>
                    {job.completedAt && (
                      <span>
                        所要時間: {Math.round((job.completedAt.getTime() - job.startedAt!.getTime()) / 60000)}分
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              同期ジョブの履歴がありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 設定ダイアログ */}
      {showConfigDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                プロバイダー設定
              </h3>
              
              {renderConfigForm()}
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowConfigDialog(false);
                    setConfigFormData({});
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  loading={updateProviderMutation.isPending}
                >
                  保存してテスト
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};