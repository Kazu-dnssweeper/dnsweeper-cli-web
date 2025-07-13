/**
 * DNSweeper リアルタイム監視ダッシュボード
 * 
 * 高度な監視機能・アラート・パフォーマンス分析
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  CpuChipIcon,
  SignalIcon,
  BellIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotifications } from '../components/UI/Notification';
import { cn } from '../utils/cn';

interface MonitoringStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  peakResponseTime: number;
  activeZones: number;
  healthyZones: number;
  problematicZones: number;
  totalRecords: number;
  monitoredRecords: number;
  lastUpdateTime: Date;
}

interface DNSQueryMetric {
  id: string;
  domain: string;
  recordType: string;
  responseTime: number;
  status: 'success' | 'failed' | 'timeout';
  serverUsed: string;
  timestamp: Date;
  errorMessage?: string;
}

interface ZoneHealth {
  zone: string;
  status: 'healthy' | 'degraded' | 'critical';
  lastChecked: Date;
  successRate: number;
  averageResponseTime: number;
  recordCount: number;
  issues: string[];
}

interface MonitoringAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  domain?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export const RealtimeMonitoring: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [alertFilters, setAlertFilters] = useState({
    error: true,
    warning: true,
    info: false
  });
  const { addNotification } = useNotifications();
  
  // WebSocket接続でリアルタイム更新
  const [realtimeMetrics, setRealtimeMetrics] = useState<DNSQueryMetric[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'dns_query_completed') {
        const metric: DNSQueryMetric = message.payload;
        setRealtimeMetrics(prev => [metric, ...prev.slice(0, 99)]); // 最新100件を保持
        
        // パフォーマンス閾値チェック
        if (metric.responseTime > 5000) {
          const alert: MonitoringAlert = {
            id: `alert_${Date.now()}`,
            type: 'warning',
            title: 'DNS応答時間警告',
            message: `${metric.domain} の応答時間が ${metric.responseTime}ms と遅延しています`,
            domain: metric.domain,
            timestamp: new Date(),
            acknowledged: false
          };
          setAlerts(prev => [alert, ...prev]);
          
          addNotification({
            type: 'warning',
            title: 'DNS応答時間警告',
            message: alert.message,
            autoClose: true,
            duration: 8000
          });
        }
        
        // エラー検知
        if (metric.status === 'failed') {
          const alert: MonitoringAlert = {
            id: `alert_${Date.now()}`,
            type: 'error',
            title: 'DNS解決エラー',
            message: `${metric.domain} の解決に失敗しました: ${metric.errorMessage}`,
            domain: metric.domain,
            timestamp: new Date(),
            acknowledged: false
          };
          setAlerts(prev => [alert, ...prev]);
          
          addNotification({
            type: 'error',
            title: 'DNS解決エラー',
            message: alert.message,
            autoClose: false
          });
        }
      }
    }
  });

  // 監視統計データの取得
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['monitoringStats', timeRange],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockStats: MonitoringStats = {
        totalQueries: 15420,
        successfulQueries: 14892,
        failedQueries: 528,
        averageResponseTime: 245,
        peakResponseTime: 1240,
        activeZones: 12,
        healthyZones: 10,
        problematicZones: 2,
        totalRecords: 1847,
        monitoredRecords: 1692,
        lastUpdateTime: new Date()
      };
      return Promise.resolve(mockStats);
    },
    refetchInterval: 30000 // 30秒ごとに更新
  });

  // ゾーン健全性データの取得
  const { data: zoneHealthData, isLoading: zoneHealthLoading } = useQuery({
    queryKey: ['zoneHealth', timeRange, selectedZone],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockZoneHealth: ZoneHealth[] = [
        {
          zone: 'example.com',
          status: 'healthy',
          lastChecked: new Date(),
          successRate: 99.8,
          averageResponseTime: 180,
          recordCount: 45,
          issues: []
        },
        {
          zone: 'api.example.com',
          status: 'degraded',
          lastChecked: new Date(),
          successRate: 94.2,
          averageResponseTime: 450,
          recordCount: 12,
          issues: ['高い応答時間', 'DNS サーバー不安定']
        },
        {
          zone: 'staging.example.com',
          status: 'critical',
          lastChecked: new Date(),
          successRate: 78.5,
          averageResponseTime: 1200,
          recordCount: 8,
          issues: ['DNS解決失敗多発', 'TTL設定問題', 'サーバー応答不安定']
        }
      ];
      return Promise.resolve(mockZoneHealth);
    },
    refetchInterval: 60000 // 1分ごとに更新
  });

  const stats = statsData;
  const zoneHealth = zoneHealthData || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-600" />;
      case 'critical':
        return <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'degraded':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'critical':
        return 'text-error-600 bg-error-50 border-error-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const filteredAlerts = alerts.filter(alert => {
    if (alert.acknowledged) return false;
    return alertFilters[alert.type];
  });

  const calculateSuccessRate = () => {
    if (!stats) return 0;
    return stats.totalQueries > 0 ? (stats.successfulQueries / stats.totalQueries) * 100 : 0;
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            リアルタイム監視ダッシュボード
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNS解決パフォーマンス・健全性・アラートの統合監視
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* 時間範囲選択 */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            <option value="1h">過去1時間</option>
            <option value="6h">過去6時間</option>
            <option value="24h">過去24時間</option>
            <option value="7d">過去7日</option>
          </select>
          
          <Button
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={() => refetchStats()}
            loading={statsLoading}
            variant="secondary"
          >
            更新
          </Button>

          <Button
            icon={<AdjustmentsHorizontalIcon className="w-4 h-4" />}
            onClick={() => setShowAlerts(!showAlerts)}
            variant={showAlerts ? "primary" : "secondary"}
          >
            アラート {filteredAlerts.length > 0 && `(${filteredAlerts.length})`}
          </Button>
        </div>
      </div>

      {/* 主要メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 総クエリ数 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  総クエリ数
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalQueries?.toLocaleString() || '0'}
                </p>
              </div>
              <GlobeAltIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                成功率: {calculateSuccessRate().toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 平均応答時間 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  平均応答時間
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatResponseTime(stats?.averageResponseTime || 0)}
                </p>
              </div>
              <CpuChipIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ピーク: {formatResponseTime(stats?.peakResponseTime || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* アクティブゾーン */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  アクティブゾーン
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.activeZones || 0}
                </p>
              </div>
              <SignalIcon className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                健全: {stats?.healthyZones || 0} / 問題: {stats?.problematicZones || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* アラート数 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  未処理アラート
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredAlerts.length}
                </p>
              </div>
              <BellIcon className={cn(
                "w-8 h-8",
                filteredAlerts.length > 0 ? "text-error-600" : "text-gray-400"
              )} />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                最終更新: {stats ? formatTimeAgo(stats.lastUpdateTime) : '不明'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ゾーン健全性 */}
        <Card>
          <CardHeader>
            <CardTitle>ゾーン健全性状況</CardTitle>
          </CardHeader>
          <CardContent>
            {zoneHealthLoading ? (
              <div className="text-center py-8">
                <LoadingSpinner text="ゾーンデータを読み込み中..." />
              </div>
            ) : (
              <div className="space-y-3">
                {zoneHealth.map((zone) => (
                  <div
                    key={zone.zone}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-800",
                      selectedZone === zone.zone && "ring-2 ring-primary-500"
                    )}
                    onClick={() => setSelectedZone(
                      selectedZone === zone.zone ? null : zone.zone
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(zone.status)}
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {zone.zone}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {zone.recordCount}レコード • 成功率{zone.successRate}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded border font-medium',
                          getStatusColor(zone.status)
                        )}>
                          {zone.status === 'healthy' ? '正常' :
                           zone.status === 'degraded' ? '要注意' : '異常'}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatResponseTime(zone.averageResponseTime)}
                        </p>
                      </div>
                    </div>
                    
                    {zone.issues.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          検出された問題:
                        </p>
                        <div className="space-y-1">
                          {zone.issues.map((issue, idx) => (
                            <p key={idx} className="text-xs text-error-600 dark:text-error-400">
                              • {issue}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* リアルタイムアラート */}
        {showAlerts && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>リアルタイムアラート</span>
                <div className="flex items-center space-x-2 text-sm">
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={alertFilters.error}
                      onChange={(e) => setAlertFilters(prev => ({
                        ...prev,
                        error: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-error-600">エラー</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={alertFilters.warning}
                      onChange={(e) => setAlertFilters(prev => ({
                        ...prev,
                        warning: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-warning-600">警告</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={alertFilters.info}
                      onChange={(e) => setAlertFilters(prev => ({
                        ...prev,
                        info: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <span className="text-blue-600">情報</span>
                  </label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAlerts.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    現在アラートはありません
                  </p>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border-l-4 bg-opacity-50",
                        alert.type === 'error' && "border-error-500 bg-error-50 dark:bg-error-900/20",
                        alert.type === 'warning' && "border-warning-500 bg-warning-50 dark:bg-warning-900/20",
                        alert.type === 'info' && "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {alert.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {alert.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatTimeAgo(alert.timestamp)}</span>
                            {alert.domain && <span>ドメイン: {alert.domain}</span>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          確認
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* リアルタイムクエリメトリクス */}
      <Card>
        <CardHeader>
          <CardTitle>リアルタイムDNSクエリ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {realtimeMetrics.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                DNS クエリの監視を開始しています...
              </p>
            ) : (
              realtimeMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      metric.status === 'success' && "bg-success-500",
                      metric.status === 'failed' && "bg-error-500",
                      metric.status === 'timeout' && "bg-warning-500"
                    )} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {metric.domain}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {metric.recordType} • {metric.serverUsed}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatResponseTime(metric.responseTime)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(metric.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};