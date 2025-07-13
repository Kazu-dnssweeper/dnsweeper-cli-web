/**
 * DNSweeper パフォーマンス分析ダッシュボード
 * 
 * 詳細なパフォーマンス指標・トレンド分析・ベンチマーク
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MapIcon,
  ServerIcon,
  CursorArrowRaysIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { cn } from '../utils/cn';

interface PerformanceMetrics {
  timeRange: string;
  totalQueries: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  lastUpdated: Date;
}

interface RegionalPerformance {
  region: string;
  country: string;
  averageResponseTime: number;
  queryCount: number;
  errorRate: number;
  popularDomains: string[];
}

interface DNSServerPerformance {
  server: string;
  provider: string;
  averageResponseTime: number;
  successRate: number;
  queryCount: number;
  lastTested: Date;
}

interface TrendData {
  timestamp: Date;
  responseTime: number;
  queryCount: number;
  errorRate: number;
}

interface PerformanceInsight {
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export const PerformanceAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [selectedMetric, setSelectedMetric] = useState<'responseTime' | 'throughput' | 'errorRate'>('responseTime');
  const [showRegionalView, setShowRegionalView] = useState(false);

  // パフォーマンスメトリクスの取得
  const { data: metricsData, isLoading: metricsLoading, refetch } = useQuery({
    queryKey: ['performanceMetrics', timeRange],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockMetrics: PerformanceMetrics = {
        timeRange,
        totalQueries: 125340,
        averageResponseTime: 187,
        medianResponseTime: 145,
        p95ResponseTime: 420,
        p99ResponseTime: 890,
        throughput: 145.2,
        errorRate: 2.1,
        availability: 99.89,
        lastUpdated: new Date()
      };
      return Promise.resolve(mockMetrics);
    },
    refetchInterval: 60000 // 1分ごとに更新
  });

  // トレンドデータの取得
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['performanceTrend', timeRange, selectedMetric],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockTrend: TrendData[] = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000),
        responseTime: 150 + Math.random() * 100 + Math.sin(i / 4) * 50,
        queryCount: 100 + Math.random() * 50,
        errorRate: Math.random() * 5
      }));
      return Promise.resolve(mockTrend);
    }
  });

  // 地域別パフォーマンスの取得
  const { data: regionalData, isLoading: regionalLoading } = useQuery({
    queryKey: ['regionalPerformance', timeRange],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockRegional: RegionalPerformance[] = [
        {
          region: 'Asia Pacific',
          country: 'Japan',
          averageResponseTime: 95,
          queryCount: 45320,
          errorRate: 1.2,
          popularDomains: ['example.com', 'api.example.com', 'cdn.example.com']
        },
        {
          region: 'North America',
          country: 'United States',
          averageResponseTime: 165,
          queryCount: 38210,
          errorRate: 2.8,
          popularDomains: ['app.example.com', 'www.example.com']
        },
        {
          region: 'Europe',
          country: 'Germany',
          averageResponseTime: 142,
          queryCount: 28490,
          errorRate: 1.9,
          popularDomains: ['eu.example.com', 'api.example.com']
        }
      ];
      return Promise.resolve(mockRegional);
    },
    enabled: showRegionalView
  });

  // DNSサーバー別パフォーマンスの取得
  const { data: serverData, isLoading: serverLoading } = useQuery({
    queryKey: ['serverPerformance', timeRange],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockServers: DNSServerPerformance[] = [
        {
          server: '1.1.1.1',
          provider: 'Cloudflare',
          averageResponseTime: 89,
          successRate: 99.95,
          queryCount: 15420,
          lastTested: new Date()
        },
        {
          server: '8.8.8.8',
          provider: 'Google',
          averageResponseTime: 124,
          successRate: 99.92,
          queryCount: 12380,
          lastTested: new Date()
        },
        {
          server: '208.67.222.222',
          provider: 'OpenDNS',
          averageResponseTime: 156,
          successRate: 99.87,
          queryCount: 8940,
          lastTested: new Date()
        }
      ];
      return Promise.resolve(mockServers);
    }
  });

  // パフォーマンスインサイトの取得
  const { data: insightsData } = useQuery({
    queryKey: ['performanceInsights', timeRange],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockInsights: PerformanceInsight[] = [
        {
          type: 'optimization',
          title: 'TTL値の最適化機会',
          description: 'api.example.com のTTL値が短すぎます（60秒）',
          impact: 'medium',
          recommendation: 'TTL値を300秒に増加することで、DNS クエリ数を40%削減可能'
        },
        {
          type: 'warning',
          title: 'レスポンス時間の増加傾向',
          description: '過去6時間でDNS応答時間が25%増加しています',
          impact: 'high',
          recommendation: 'DNS サーバーの負荷分散設定を確認し、追加のレコードを検討'
        },
        {
          type: 'info',
          title: 'AAAA レコードの利用機会',
          description: 'IPv6 対応により、一部地域でのパフォーマンス向上が期待できます',
          impact: 'low',
          recommendation: '主要ドメインにAAAAレコードを追加することを検討'
        }
      ];
      return Promise.resolve(mockInsights);
    }
  });

  const metrics = metricsData;
  const trends = trendData || [];
  const regional = regionalData || [];
  const servers = serverData || [];
  const insights = insightsData || [];

  const formatResponseTime = (ms: number) => {
    return `${Math.round(ms)}ms`;
  };

  const formatThroughput = (qps: number) => {
    return `${qps.toFixed(1)} q/s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getTrendDirection = (current: number, previous: number) => {
    if (current > previous * 1.05) return 'up';
    if (current < previous * 0.95) return 'down';
    return 'stable';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization':
        return <LightBulbIcon className="w-5 h-5 text-blue-600" />;
      case 'warning':
        return <CursorArrowRaysIcon className="w-5 h-5 text-warning-600" />;
      case 'info':
        return <ChartBarIcon className="w-5 h-5 text-gray-600" />;
      default:
        return <ChartBarIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'optimization':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      case 'warning':
        return 'border-warning-200 bg-warning-50 dark:bg-warning-900/20';
      case 'info':
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            パフォーマンス分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNS解決パフォーマンスの詳細分析・トレンド・最適化提案
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
            <option value="30d">過去30日</option>
          </select>

          <Button
            icon={<MapIcon className="w-4 h-4" />}
            onClick={() => setShowRegionalView(!showRegionalView)}
            variant={showRegionalView ? "primary" : "secondary"}
          >
            地域別表示
          </Button>

          <Button
            icon={<ChartBarIcon className="w-4 h-4" />}
            onClick={() => refetch()}
            loading={metricsLoading}
          >
            更新
          </Button>
        </div>
      </div>

      {/* 主要パフォーマンス指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 平均応答時間 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  平均応答時間
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatResponseTime(metrics?.averageResponseTime || 0)}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <ArrowTrendingDownIcon className="w-4 h-4 text-success-600" />
              <p className="text-sm text-success-600">
                12% 改善 (前日比)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* スループット */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  スループット
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatThroughput(metrics?.throughput || 0)}
                </p>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-success-600" />
              <p className="text-sm text-success-600">
                8% 増加 (前日比)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 可用性 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  可用性
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(metrics?.availability || 0)}
                </p>
              </div>
              <ServerIcon className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                SLA目標: 99.9%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* エラー率 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  エラー率
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(metrics?.errorRate || 0)}
                </p>
              </div>
              <CursorArrowRaysIcon className={cn(
                "w-8 h-8",
                (metrics?.errorRate || 0) < 1 ? "text-success-600" :
                (metrics?.errorRate || 0) < 3 ? "text-warning-600" : "text-error-600"
              )} />
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                目標: &lt; 1%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細パフォーマンス分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* パーセンタイル分析 */}
        <Card>
          <CardHeader>
            <CardTitle>応答時間分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">中央値 (P50)</span>
                <span className="font-medium">{formatResponseTime(metrics?.medianResponseTime || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">95パーセンタイル</span>
                <span className="font-medium">{formatResponseTime(metrics?.p95ResponseTime || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">99パーセンタイル</span>
                <span className="font-medium">{formatResponseTime(metrics?.p99ResponseTime || 0)}</span>
              </div>
              
              {/* 簡易ヒストグラム表示 */}
              <div className="mt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>0-100ms</span>
                    <span>45%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-success-600 h-2 rounded-full" style={{ width: '45%' }} />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span>100-300ms</span>
                    <span>35%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-warning-600 h-2 rounded-full" style={{ width: '35%' }} />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span>300ms+</span>
                    <span>20%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-error-600 h-2 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DNSサーバー別パフォーマンス */}
        <Card>
          <CardHeader>
            <CardTitle>DNSサーバー別性能</CardTitle>
          </CardHeader>
          <CardContent>
            {serverLoading ? (
              <LoadingSpinner text="データを読み込み中..." />
            ) : (
              <div className="space-y-4">
                {servers.map((server) => (
                  <div key={server.server} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {server.server}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {server.provider}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatResponseTime(server.averageResponseTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>成功率: {formatPercentage(server.successRate)}</span>
                      <span>{server.queryCount.toLocaleString()} クエリ</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* パフォーマンスインサイト */}
        <Card>
          <CardHeader>
            <CardTitle>最適化提案</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border",
                    getInsightColor(insight.type)
                  )}
                >
                  <div className="flex items-start space-x-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {insight.description}
                      </p>
                      <div className="mt-2">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded font-medium",
                          insight.impact === 'high' && "bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200",
                          insight.impact === 'medium' && "bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200",
                          insight.impact === 'low' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        )}>
                          {insight.impact === 'high' ? '高影響' :
                           insight.impact === 'medium' ? '中影響' : '低影響'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">
                        推奨: {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 地域別パフォーマンス */}
      {showRegionalView && (
        <Card>
          <CardHeader>
            <CardTitle>地域別パフォーマンス分析</CardTitle>
          </CardHeader>
          <CardContent>
            {regionalLoading ? (
              <LoadingSpinner text="地域データを読み込み中..." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {regional.map((region) => (
                  <div
                    key={region.region}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {region.region}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {region.country}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">平均応答時間</span>
                        <span className="font-medium">{formatResponseTime(region.averageResponseTime)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">クエリ数</span>
                        <span className="font-medium">{region.queryCount.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">エラー率</span>
                        <span className="font-medium">{formatPercentage(region.errorRate)}</span>
                      </div>
                      
                      {region.popularDomains.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            人気ドメイン:
                          </p>
                          <div className="space-y-1">
                            {region.popularDomains.slice(0, 3).map((domain, idx) => (
                              <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                • {domain}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};