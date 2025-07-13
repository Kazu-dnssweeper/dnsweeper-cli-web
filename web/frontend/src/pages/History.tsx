import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ExportDialog } from '../components/Export/ExportDialog';
import { historyApi } from '../services/historyApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotifications } from '../components/UI/Notification';
import { cn } from '../utils/cn';
import type { ChangeHistoryFilter, DnsChangeRecord } from '../types/history';

export const History: React.FC = () => {
  const [filter, setFilter] = useState<ChangeHistoryFilter>({
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  const [showStats, setShowStats] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { addNotification } = useNotifications();

  // WebSocket接続でリアルタイム更新
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'dns_change_recorded') {
        // 新しい変更が記録されたら通知とデータ更新
        addNotification({
          type: 'info',
          title: 'DNS変更が記録されました',
          message: `${message.payload.domain} の ${message.payload.recordType} レコードが${
            message.payload.changeType === 'create' ? '作成' :
            message.payload.changeType === 'update' ? '更新' : '削除'
          }されました`,
          autoClose: true,
          duration: 5000
        });
        
        // データを再取得
        refetch();
      }
    }
  });

  // 変更履歴データの取得
  const { data: historyData, isLoading, error, refetch } = useQuery({
    queryKey: ['changeHistory', filter],
    queryFn: () => historyApi.getChangeHistory(filter),
    staleTime: 30000 // 30秒間はキャッシュを使用
  });

  // 統計データの取得
  const { data: statsData } = useQuery({
    queryKey: ['changeStatistics', filter.dateFrom, filter.dateTo],
    queryFn: () => {
      const dateFrom = filter.dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const dateTo = filter.dateTo || new Date();
      return historyApi.getChangeStatistics(dateFrom, dateTo);
    },
    enabled: showStats,
    staleTime: 60000 // 1分間はキャッシュを使用
  });

  const changes = historyData?.data?.changes || [];
  const stats = statsData?.data;

  const handleFilterChange = (newFilter: Partial<ChangeHistoryFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const handleLoadMore = () => {
    if (historyData?.data?.hasNextPage && historyData.data.pageInfo.endCursor) {
      handleFilterChange({ cursor: historyData.data.pageInfo.endCursor });
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create': return <PlusIcon className="w-4 h-4 text-success-600" />;
      case 'update': return <PencilSquareIcon className="w-4 h-4 text-warning-600" />;
      case 'delete': return <TrashIcon className="w-4 h-4 text-error-600" />;
      default: return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create': return 'text-success-600 bg-success-50 border-success-200';
      case 'update': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'delete': return 'text-error-600 bg-error-50 border-error-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'manual': return '👤';
      case 'import': return '📥';
      case 'api': return '🔧';
      case 'monitoring': return '📡';
      default: return '❓';
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-error-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            データの読み込みに失敗しました
          </p>
          <Button onClick={() => refetch()}>再試行</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            変更履歴
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNS レコードの変更履歴とアクティビティ
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<ChartBarIcon className="w-4 h-4" />}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '統計を非表示' : '統計を表示'}
          </Button>
          <Button
            variant="secondary"
            icon={<DocumentArrowDownIcon className="w-4 h-4" />}
            onClick={() => setShowExportDialog(true)}
          >
            エクスポート
          </Button>
          <Button
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            更新
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      {showStats && stats && (
        <Card>
          <CardHeader>
            <CardTitle>変更統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalChanges}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">総変更数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success-600">
                  {stats.changesByType.create}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">作成</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning-600">
                  {stats.changesByType.update}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">更新</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-error-600">
                  {stats.changesByType.delete}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">削除</p>
              </div>
            </div>

            {stats.topChangedDomains.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  最も変更されたドメイン
                </h4>
                <div className="space-y-2">
                  {stats.topChangedDomains.slice(0, 5).map((domain) => (
                    <div key={domain.domain} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {domain.domain}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {domain.changeCount}件
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* フィルター */}
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* ドメイン検索 */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ドメイン名で検索..."
                  value={filter.domain || ''}
                  onChange={(e) => handleFilterChange({ domain: e.target.value || undefined })}
                  className={cn(
                    "w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    "placeholder-gray-500 dark:placeholder-gray-400",
                    "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  )}
                />
              </div>

              {/* レコードタイプフィルター */}
              <select
                value={filter.recordType || ''}
                onChange={(e) => handleFilterChange({ recordType: e.target.value || undefined })}
                className={cn(
                  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              >
                <option value="">すべてのタイプ</option>
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
              </select>

              {/* 変更タイプフィルター */}
              <select
                value={filter.changeType || ''}
                onChange={(e) => handleFilterChange({ changeType: e.target.value || undefined })}
                className={cn(
                  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              >
                <option value="">すべての変更</option>
                <option value="create">作成</option>
                <option value="update">更新</option>
                <option value="delete">削除</option>
              </select>

              {/* ソースフィルター */}
              <select
                value={filter.source || ''}
                onChange={(e) => handleFilterChange({ source: e.target.value || undefined })}
                className={cn(
                  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              >
                <option value="">すべてのソース</option>
                <option value="manual">手動</option>
                <option value="import">インポート</option>
                <option value="api">API</option>
                <option value="monitoring">監視</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 変更履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>変更履歴 ({historyData?.data?.totalCount || 0}件)</span>
            {isLoading && <LoadingSpinner size="sm" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {changes.map((change: DnsChangeRecord) => (
              <div
                key={change.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* アイコン */}
                    <div className="mt-1">
                      {getChangeTypeIcon(change.changeType)}
                    </div>

                    {/* メイン情報 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {change.domain}
                        </h3>
                        <span className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {change.recordType}
                        </span>
                        <span className={cn(
                          'text-xs px-2 py-1 rounded border font-medium',
                          getChangeTypeColor(change.changeType)
                        )}>
                          {change.changeType === 'create' ? '作成' :
                           change.changeType === 'update' ? '更新' : '削除'}
                        </span>
                      </div>

                      {/* 変更内容 */}
                      <div className="space-y-1 text-sm">
                        {change.changeType === 'update' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">変更前: </span>
                              <span className="font-mono text-gray-900 dark:text-white">
                                {change.previousValue}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">変更後: </span>
                              <span className="font-mono text-gray-900 dark:text-white">
                                {change.newValue}
                              </span>
                            </div>
                          </div>
                        )}
                        {change.changeType === 'create' && change.newValue && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">値: </span>
                            <span className="font-mono text-gray-900 dark:text-white">
                              {change.newValue}
                            </span>
                          </div>
                        )}
                        {change.changeType === 'delete' && change.previousValue && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">削除された値: </span>
                            <span className="font-mono text-gray-900 dark:text-white">
                              {change.previousValue}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* メタデータ */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <span>{getSourceIcon(change.source)}</span>
                          <span>{change.source}</span>
                        </div>
                        {change.userEmail && (
                          <span>👤 {change.userEmail}</span>
                        )}
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>{formatTimestamp(change.timestamp)}</span>
                          <span className="text-gray-400">({formatTimeAgo(change.timestamp)})</span>
                        </div>
                      </div>

                      {/* 理由 */}
                      {change.reason && (
                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">理由: </span>
                          <span className="text-gray-900 dark:text-white">{change.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 空の状態 */}
            {!isLoading && changes.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">変更履歴がありません</p>
                <p>DNS レコードの変更が記録されると、ここに表示されます。</p>
              </div>
            )}

            {/* ローディング状態 */}
            {isLoading && changes.length === 0 && (
              <div className="text-center py-8">
                <LoadingSpinner text="変更履歴を読み込み中..." />
              </div>
            )}

            {/* もっと読み込むボタン */}
            {historyData?.data?.hasNextPage && (
              <div className="text-center pt-4">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  loading={isLoading}
                >
                  さらに読み込む
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* エクスポートダイアログ */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        defaultType="change_history"
        defaultFilter={{
          domain: filter.domain,
          changeType: filter.changeType as any,
          source: filter.source as any,
          dateFrom: filter.dateFrom,
          dateTo: filter.dateTo
        }}
        title="変更履歴のエクスポート"
      />
    </div>
  );
};