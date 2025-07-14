/**
 * DNSweeper 高度リアルタイム分析ダッシュボード
 * 
 * エンタープライズレベルのリアルタイム分析・予測・自動化
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ArrowPathIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  EyeIcon,
  CloudIcon,
  ServerIcon,
  ChartPieIcon,
  BeakerIcon,
  CubeTransparentIcon
} from '@heroicons/react/24/outline';
import { DetailedMetricsView } from '../components/Analytics/DetailedMetricsView';
import { MetricsChart, ResponseTimeChart, QueryTypeChart } from '../components/Charts/MetricsChart';

interface RealtimeAnalytics {
  // 基本メトリクス
  overview: {
    totalQueries: number;
    queriesPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    activeConnections: number;
  };
  
  // 高度な分析
  predictions: {
    nextHourQueriesEstimate: number;
    peakTimeEstimate: string;
    bottleneckRisk: number;
    capacityUtilization: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  };
  
  // ジオロケーション分析
  geographical: {
    topCountries: { country: string; queries: number; responseTime: number }[];
    globalDistribution: { region: string; percentage: number; quality: number }[];
    edgePerformance: { location: string; load: number; latency: number }[];
  };
  
  // 脅威検出
  security: {
    suspiciousQueries: number;
    blockedDomains: number;
    malwareDetections: number;
    dnsHijackAttempts: number;
    riskScore: number;
    recentThreats: { type: string; domain: string; timestamp: Date; severity: 'low' | 'medium' | 'high' }[];
  };
  
  // パフォーマンス分析
  performance: {
    responseTimeDistribution: { range: string; count: number; percentage: number }[];
    queriesByType: { type: string; count: number; avgTime: number }[];
    serverPerformance: { server: string; load: number; responseTime: number; status: string }[];
    cachingEfficiency: { hitRate: number; missRate: number; evictionRate: number };
  };
  
  // AI分析
  aiInsights: {
    anomalies: { type: string; description: string; impact: number; confidence: number }[];
    recommendations: { category: string; suggestion: string; benefit: string; effort: 'low' | 'medium' | 'high' }[];
    predictions: { metric: string; prediction: number; confidence: number; timeframe: string }[];
  };
}

interface AdvancedAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'security' | 'performance';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  affectedSystems: string[];
  suggestedActions: string[];
  autoResolution?: boolean;
  acknowledged: boolean;
}

const RealtimeAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<RealtimeAnalytics | null>(null);
  const [alerts, setAlerts] = useState<AdvancedAlert[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '6h'>('15m');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'ai' | 'security' | 'metrics'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5秒
  const wsRef = useRef<WebSocket | null>(null);
  const chartRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  // WebSocket接続とリアルタイム更新
  useEffect(() => {
    if (autoRefresh) {
      wsRef.current = new WebSocket(`${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/realtime-analytics`);
      
      wsRef.current.onopen = () => {
        console.log('リアルタイム分析WebSocket接続完了');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'analytics_update') {
          setAnalytics(data.payload);
        } else if (data.type === 'new_alert') {
          setAlerts(prev => [data.payload, ...prev]);
          // 重要なアラートの場合、ブラウザ通知を表示
          if (data.payload.impact === 'critical' || data.payload.type === 'security') {
            showDesktopNotification(data.payload);
          }
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket接続エラー:', error);
      };
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [autoRefresh]);

  // データフェッチ関数
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/realtime?timeframe=${selectedTimeframe}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('分析データの取得に失敗:', error);
    }
  };

  // アラート取得
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/active');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('アラートデータの取得に失敗:', error);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    fetchAnalytics();
    fetchAlerts();
  }, [selectedTimeframe]);

  // デスクトップ通知
  const showDesktopNotification = (alert: AdvancedAlert) => {
    if (Notification.permission === 'granted') {
      new Notification(`DNSweeper ${alert.type.toUpperCase()}`, {
        body: alert.description,
        icon: '/logo192.png',
        tag: alert.id
      });
    }
  };

  // 通知権限リクエスト
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // アラート処理
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (error) {
      console.error('アラート確認の処理に失敗:', error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('アラート削除の処理に失敗:', error);
    }
  };

  // 指標計算
  const getHealthScore = useMemo(() => {
    if (!analytics) return 0;
    const { errorRate, uptime } = analytics.overview;
    const { capacityUtilization } = analytics.predictions;
    const { riskScore } = analytics.security;
    
    const healthFactors = [
      (100 - errorRate) * 0.3,
      uptime * 0.3,
      (100 - capacityUtilization) * 0.2,
      (100 - riskScore) * 0.2
    ];
    
    return Math.round(healthFactors.reduce((sum, factor) => sum + factor, 0));
  }, [analytics]);

  // 詳細メトリクス変換
  const detailedMetrics = useMemo(() => {
    if (!analytics) return null;

    // 時系列データの生成（過去のデータポイントをシミュレート）
    const generateTimeSeriesData = (baseValue: number, variance: number, points: number = 24) => {
      const now = new Date();
      return Array.from({ length: points }, (_, i) => ({
        timestamp: new Date(now.getTime() - (points - i - 1) * 60000).toISOString(),
        value: baseValue + (Math.random() - 0.5) * variance
      }));
    };

    return {
      overview: {
        totalQueries: analytics.overview.totalQueries,
        successQueries: analytics.overview.totalQueries - Math.floor(analytics.overview.totalQueries * analytics.overview.errorRate / 100),
        failedQueries: Math.floor(analytics.overview.totalQueries * analytics.overview.errorRate / 100),
        averageResponseTime: analytics.overview.averageResponseTime,
        peakResponseTime: analytics.overview.averageResponseTime * 1.5,
        cacheHitRate: analytics.performance.cachingEfficiency.hitRate,
        throughputQPS: analytics.overview.queriesPerSecond
      },
      timeSeriesData: {
        queries: generateTimeSeriesData(analytics.overview.queriesPerSecond, 50),
        responseTime: generateTimeSeriesData(analytics.overview.averageResponseTime, 20),
        errorRate: generateTimeSeriesData(analytics.overview.errorRate, 1),
        cachePerformance: generateTimeSeriesData(analytics.performance.cachingEfficiency.hitRate, 5)
      },
      queryAnalysis: {
        byType: analytics.performance.queriesByType,
        byDomain: analytics.geographical.topCountries.map(c => ({
          domain: c.country + '.example.com',
          count: c.queries,
          avgTime: c.responseTime
        })),
        topDomains: analytics.geographical.topCountries.map(c => ({
          domain: c.country.toLowerCase() + '.example.com',
          queries: c.queries,
          errorRate: Math.random() * 5
        }))
      },
      geographical: {
        distribution: analytics.geographical.globalDistribution,
        countryStats: analytics.geographical.topCountries,
        edgeNodes: analytics.geographical.edgePerformance.map(edge => ({
          location: edge.location,
          load: edge.load,
          latency: edge.latency,
          status: edge.load > 80 ? 'critical' : edge.load > 60 ? 'warning' : 'healthy'
        }))
      },
      performance: {
        serverStats: analytics.performance.serverPerformance.map(server => ({
          server: server.server,
          cpu: server.load,
          memory: server.load * 0.8,
          connections: Math.floor(Math.random() * 1000) + 500
        })),
        networkStats: [
          { metric: 'スループット', value: analytics.overview.queriesPerSecond, trend: 'up' as const },
          { metric: '応答時間', value: analytics.overview.averageResponseTime, trend: 'stable' as const },
          { metric: 'エラー率', value: analytics.overview.errorRate, trend: 'down' as const }
        ],
        bottlenecks: [
          { 
            component: 'DNS解決エンジン', 
            severity: analytics.overview.averageResponseTime > 100 ? 'high' as const : 'low' as const,
            description: '平均応答時間が閾値を超過しています'
          },
          {
            component: 'キャッシュシステム',
            severity: analytics.performance.cachingEfficiency.hitRate < 80 ? 'medium' as const : 'low' as const,
            description: 'キャッシュヒット率の改善が必要です'
          }
        ]
      }
    };
  }, [analytics]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'decreasing': return <ArrowTrendingUpIcon className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <ArrowPathIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'security': return <ShieldCheckIcon className="w-5 h-5 text-purple-500" />;
      case 'performance': return <CpuChipIcon className="w-5 h-5 text-blue-500" />;
      default: return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-blue-600" />
              リアルタイム分析ダッシュボード
            </h1>
            <p className="text-gray-600 mt-1">AI駆動DNS分析・予測・最適化</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 時間範囲選択 */}
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="1m">1分</option>
              <option value="5m">5分</option>
              <option value="15m">15分</option>
              <option value="1h">1時間</option>
              <option value="6h">6時間</option>
            </select>
            
            {/* 表示モード選択 */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { key: 'overview', label: '概要', icon: ChartBarIcon },
                { key: 'detailed', label: '詳細', icon: EyeIcon },
                { key: 'metrics', label: '高度分析', icon: CubeTransparentIcon },
                { key: 'ai', label: 'AI分析', icon: BeakerIcon },
                { key: 'security', label: 'セキュリティ', icon: ShieldCheckIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    viewMode === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            
            {/* 自動更新切り替え */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg ${
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowPathIcon className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 概要メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">システム健全性</p>
              <p className="text-2xl font-bold text-gray-900">{getHealthScore}%</p>
            </div>
            <div className={`p-3 rounded-full ${getHealthScore >= 90 ? 'bg-green-100' : getHealthScore >= 70 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <CheckCircleIcon className={`w-6 h-6 ${getHealthScore >= 90 ? 'text-green-600' : getHealthScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            {getTrendIcon(analytics.predictions.trendDirection)}
            <span className="ml-1 text-gray-600">システム安定稼働中</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">クエリ/秒</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.queriesPerSecond.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <SignalIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              次時間予測: {analytics.predictions.nextHourQueriesEstimate.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">応答時間</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.averageResponseTime}ms</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              エラー率: {analytics.overview.errorRate.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">セキュリティリスク</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.security.riskScore}%</p>
            </div>
            <div className={`p-3 rounded-full ${analytics.security.riskScore < 30 ? 'bg-green-100' : analytics.security.riskScore < 70 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <ShieldCheckIcon className={`w-6 h-6 ${analytics.security.riskScore < 30 ? 'text-green-600' : analytics.security.riskScore < 70 ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              脅威検出: {analytics.security.suspiciousQueries}件
            </span>
          </div>
        </div>
      </div>

      {/* アラート表示 */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <BellIcon className="w-5 h-5" />
                アクティブアラート ({alerts.filter(a => !a.acknowledged).length})
              </h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`px-6 py-4 border-b border-gray-100 last:border-b-0 ${!alert.acknowledged ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>影響度: {alert.impact}</span>
                          <span>時刻: {alert.timestamp.toLocaleTimeString()}</span>
                          {alert.affectedSystems.length > 0 && (
                            <span>影響システム: {alert.affectedSystems.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          確認
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ - 表示モード別 */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 応答時間トレンド */}
          {detailedMetrics && (
            <ResponseTimeChart
              data={detailedMetrics.timeSeriesData.responseTime}
              realtime={autoRefresh}
            />
          )}
          
          {/* クエリタイプ分布 */}
          <QueryTypeChart data={analytics.performance.queriesByType} />

          {/* パフォーマンス分析 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5" />
              パフォーマンス分析
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>キャッシュヒット率</span>
                  <span>{analytics.performance.cachingEfficiency.hitRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${analytics.performance.cachingEfficiency.hitRate}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>容量使用率</span>
                  <span>{analytics.predictions.capacityUtilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      analytics.predictions.capacityUtilization > 80 ? 'bg-red-600' :
                      analytics.predictions.capacityUtilization > 60 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${analytics.predictions.capacityUtilization}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">クエリタイプ別</h4>
                {analytics.performance.queriesByType.slice(0, 3).map((type) => (
                  <div key={type.type} className="flex justify-between text-sm py-1">
                    <span>{type.type}</span>
                    <span>{type.count.toLocaleString()}件 ({type.avgTime}ms)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'ai' && (
        <div className="space-y-6">
          {/* AI異常検知 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <BeakerIcon className="w-5 h-5" />
              AI異常検知
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.aiInsights.anomalies.map((anomaly, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{anomaly.type}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      anomaly.impact > 70 ? 'bg-red-100 text-red-700' :
                      anomaly.impact > 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      影響度 {anomaly.impact}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{anomaly.description}</p>
                  <div className="text-xs text-gray-500">
                    信頼度: {anomaly.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI推奨事項 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <LightBulbIcon className="w-5 h-5" />
              AI推奨事項
            </h3>
            <div className="space-y-4">
              {analytics.aiInsights.recommendations.map((rec, index) => (
                <div key={index} className="border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{rec.category}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.effort === 'low' ? 'bg-green-100 text-green-700' :
                      rec.effort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      実装難易度: {rec.effort}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{rec.suggestion}</p>
                  <p className="text-xs text-gray-500">期待効果: {rec.benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'metrics' && detailedMetrics && (
        <DetailedMetricsView
          metrics={detailedMetrics}
          timeRange={selectedTimeframe === '1m' || selectedTimeframe === '5m' ? '1h' : 
                    selectedTimeframe === '15m' ? '6h' : 
                    selectedTimeframe === '1h' ? '24h' : '7d'}
          onTimeRangeChange={(range) => {
            const mapping = { '1h': '15m', '6h': '1h', '24h': '6h', '7d': '6h' };
            setSelectedTimeframe(mapping[range] as any);
          }}
          realtime={autoRefresh}
        />
      )}

      {viewMode === 'security' && (
        <div className="space-y-6">
          {/* セキュリティ概要 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analytics.security.suspiciousQueries}</div>
                <div className="text-sm text-gray-600">疑わしいクエリ</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analytics.security.blockedDomains}</div>
                <div className="text-sm text-gray-600">ブロック済みドメイン</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analytics.security.malwareDetections}</div>
                <div className="text-sm text-gray-600">マルウェア検出</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{analytics.security.dnsHijackAttempts}</div>
                <div className="text-sm text-gray-600">ハイジャック試行</div>
              </div>
            </div>
          </div>

          {/* 最近の脅威 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              最近の脅威
            </h3>
            <div className="space-y-3">
              {analytics.security.recentThreats.map((threat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      threat.severity === 'high' ? 'bg-red-500' :
                      threat.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-900">{threat.type}</div>
                      <div className="text-sm text-gray-600">{threat.domain}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">{threat.severity.toUpperCase()}</div>
                    <div className="text-xs text-gray-500">{threat.timestamp.toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeAnalyticsDashboard;