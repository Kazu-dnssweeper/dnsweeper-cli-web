import React, { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useWebSocket } from '../hooks/useWebSocket';
import { cn } from '../utils/cn';

interface MonitoringRecord {
  id: string;
  domain: string;
  type: string;
  expectedValue: string;
  currentValue: string;
  lastChecked: Date;
  status: 'ok' | 'changed' | 'error';
  changes: Array<{
    timestamp: Date;
    previousValue: string;
    newValue: string;
    changeType: 'value' | 'ttl' | 'new' | 'deleted';
  }>;
}

export const Monitoring: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringRecords, setMonitoringRecords] = useState<MonitoringRecord[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(300); // 5分

  // WebSocket接続
  const { isConnected, sendMessage, subscribeToUpdates } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'dns_update') {
        handleDnsUpdate(message.payload);
      }
    }
  });

  // サンプルデータ
  useEffect(() => {
    const sampleRecords: MonitoringRecord[] = [
      {
        id: '1',
        domain: 'app.example.com',
        type: 'A',
        expectedValue: '192.168.1.100',
        currentValue: '192.168.1.100',
        lastChecked: new Date(),
        status: 'ok',
        changes: []
      },
      {
        id: '2',
        domain: 'api.example.com',
        type: 'CNAME',
        expectedValue: 'api-lb.example.com',
        currentValue: 'api-new-lb.example.com',
        lastChecked: new Date(Date.now() - 300000),
        status: 'changed',
        changes: [
          {
            timestamp: new Date(Date.now() - 300000),
            previousValue: 'api-lb.example.com',
            newValue: 'api-new-lb.example.com',
            changeType: 'value'
          }
        ]
      },
      {
        id: '3',
        domain: 'old-service.example.com',
        type: 'A',
        expectedValue: '10.0.0.1',
        currentValue: '',
        lastChecked: new Date(Date.now() - 600000),
        status: 'error',
        changes: [
          {
            timestamp: new Date(Date.now() - 600000),
            previousValue: '10.0.0.1',
            newValue: '',
            changeType: 'deleted'
          }
        ]
      }
    ];
    setMonitoringRecords(sampleRecords);
  }, []);

  const handleDnsUpdate = (data: any) => {
    setMonitoringRecords(prev =>
      prev.map(record => {
        if (record.domain === data.domain) {
          return {
            ...record,
            currentValue: data.value,
            lastChecked: new Date(),
            status: data.value === record.expectedValue ? 'ok' : 'changed',
            changes: data.value !== record.currentValue ? [
              ...record.changes,
              {
                timestamp: new Date(),
                previousValue: record.currentValue,
                newValue: data.value,
                changeType: 'value' as const
              }
            ] : record.changes
          };
        }
        return record;
      })
    );
  };

  const startMonitoring = () => {
    if (!isConnected) {
      console.warn('WebSocket not connected');
      return;
    }

    setIsMonitoring(true);
    const domains = monitoringRecords.map(r => r.domain);
    subscribeToUpdates(domains);

    // 定期的な監視の開始をシミュレート
    console.log(`Started monitoring ${domains.length} domains every ${refreshInterval} seconds`);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    console.log('Stopped monitoring');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <div className="w-3 h-3 bg-success-500 rounded-full" />;
      case 'changed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-warning-600" />;
      case 'error':
        return <div className="w-3 h-3 bg-error-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'changed':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'error':
        return 'text-error-600 bg-error-50 border-error-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeDiff = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  const stats = {
    total: monitoringRecords.length,
    ok: monitoringRecords.filter(r => r.status === 'ok').length,
    changed: monitoringRecords.filter(r => r.status === 'changed').length,
    error: monitoringRecords.filter(r => r.status === 'error').length
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            DNS 監視
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            リアルタイムDNSレコード変更監視
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              isConnected ? 'bg-success-500' : 'bg-error-500'
            )} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? '接続中' : '未接続'}
            </span>
          </div>
          <Button
            variant="secondary"
            icon={<Cog6ToothIcon className="w-4 h-4" />}
          >
            設定
          </Button>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            icon={isMonitoring ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
            disabled={!isConnected}
          >
            {isMonitoring ? '監視停止' : '監視開始'}
          </Button>
        </div>
      </div>

      {/* 監視状態 */}
      {isMonitoring && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <LoadingSpinner size="sm" />
                <div>
                  <p className="font-medium text-primary-900 dark:text-primary-100">
                    DNS監視が実行中です
                  </p>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {monitoringRecords.length}件のレコードを{refreshInterval}秒間隔で監視中
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  次回チェック: {Math.floor(refreshInterval / 60)}分後
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">監視中</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <GlobeAltIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">正常</p>
                <p className="text-2xl font-bold text-success-600">
                  {stats.ok}
                </p>
              </div>
              <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">変更検知</p>
                <p className="text-2xl font-bold text-warning-600">
                  {stats.changed}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-warning-600" />
            </div>
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">エラー</p>
                <p className="text-2xl font-bold text-error-600">
                  {stats.error}
                </p>
              </div>
              <div className="w-8 h-8 bg-error-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 監視レコード一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>監視レコード</span>
            <Button variant="secondary" size="sm" icon={<ChartBarIcon className="w-4 h-4" />}>
              履歴表示
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monitoringRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(record.status)}
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {record.domain}
                      </h3>
                      <span className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {record.type}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded border font-medium',
                        getStatusColor(record.status)
                      )}>
                        {record.status === 'ok' ? '正常' : 
                         record.status === 'changed' ? '変更検知' : 'エラー'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">期待値:</p>
                        <p className="font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {record.expectedValue}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-1">現在値:</p>
                        <p className={cn(
                          'font-mono p-2 rounded',
                          record.status === 'ok' 
                            ? 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800'
                            : record.status === 'changed'
                            ? 'text-warning-800 dark:text-warning-200 bg-warning-50 dark:bg-warning-900/20'
                            : 'text-error-800 dark:text-error-200 bg-error-50 dark:bg-error-900/20'
                        )}>
                          {record.currentValue || '(削除済み)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>最終チェック: {formatTimeDiff(record.lastChecked)}</span>
                      </div>
                      {record.changes.length > 0 && (
                        <span>{record.changes.length}件の変更履歴</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      履歴
                    </Button>
                    <Button variant="secondary" size="sm">
                      設定
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};