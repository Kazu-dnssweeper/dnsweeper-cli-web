/**
 * DNSweeper 詳細メトリクス表示コンポーネント
 * 高度な分析・可視化・インタラクティブな探索機能
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  GlobeAltIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentChartBarIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import {
  MetricsChart,
  ResponseTimeChart,
  QueryTypeChart,
  ErrorRateChart,
  GeographicRadarChart,
  type MetricDataPoint,
  type ChartDataset
} from '../Charts/MetricsChart';

interface DetailedMetrics {
  overview: {
    totalQueries: number;
    successQueries: number;
    failedQueries: number;
    averageResponseTime: number;
    peakResponseTime: number;
    cacheHitRate: number;
    throughputQPS: number;
  };
  
  timeSeriesData: {
    queries: MetricDataPoint[];
    responseTime: MetricDataPoint[];
    errorRate: MetricDataPoint[];
    cachePerformance: MetricDataPoint[];
  };
  
  queryAnalysis: {
    byType: { type: string; count: number; avgTime: number }[];
    byDomain: { domain: string; count: number; avgTime: number }[];
    topDomains: { domain: string; queries: number; errorRate: number }[];
  };
  
  geographical: {
    distribution: { region: string; percentage: number; quality: number }[];
    countryStats: { country: string; queries: number; responseTime: number }[];
    edgeNodes: { location: string; load: number; latency: number; status: string }[];
  };
  
  performance: {
    serverStats: { server: string; cpu: number; memory: number; connections: number }[];
    networkStats: { metric: string; value: number; trend: 'up' | 'down' | 'stable' }[];
    bottlenecks: { component: string; severity: 'low' | 'medium' | 'high'; description: string }[];
  };
}

interface DetailedMetricsViewProps {
  metrics: DetailedMetrics | null;
  timeRange: '1h' | '6h' | '24h' | '7d';
  onTimeRangeChange: (range: '1h' | '6h' | '24h' | '7d') => void;
  realtime?: boolean;
}

export const DetailedMetricsView: React.FC<DetailedMetricsViewProps> = ({
  metrics,
  timeRange,
  onTimeRangeChange,
  realtime = false
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'geography' | 'analysis'>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['queries', 'responseTime']);
  
  // パフォーマンス指標の計算
  const performanceIndicators = useMemo(() => {
    if (!metrics) return null;
    
    const successRate = metrics.overview.totalQueries > 0 
      ? (metrics.overview.successQueries / metrics.overview.totalQueries) * 100 
      : 0;
    
    const errorRate = metrics.overview.totalQueries > 0
      ? (metrics.overview.failedQueries / metrics.overview.totalQueries) * 100
      : 0;
    
    return {
      successRate,
      errorRate,
      avgResponseTime: metrics.overview.averageResponseTime,
      cacheEfficiency: metrics.overview.cacheHitRate,
      throughput: metrics.overview.throughputQPS
    };
  }, [metrics]);

  // 複数メトリクスの組み合わせチャート用データ
  const combinedChartData: ChartDataset[] = useMemo(() => {
    if (!metrics) return [];
    
    const datasets: ChartDataset[] = [];
    
    if (selectedMetrics.includes('queries')) {
      datasets.push({
        label: 'クエリ数',
        data: metrics.timeSeriesData.queries,
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620'
      });
    }
    
    if (selectedMetrics.includes('responseTime')) {
      datasets.push({
        label: '応答時間 (ms)',
        data: metrics.timeSeriesData.responseTime,
        borderColor: '#10B981',
        backgroundColor: '#10B98120'
      });
    }
    
    if (selectedMetrics.includes('errorRate')) {
      datasets.push({
        label: 'エラー率 (%)',
        data: metrics.timeSeriesData.errorRate,
        borderColor: '#EF4444',
        backgroundColor: '#EF444420'
      });
    }
    
    if (selectedMetrics.includes('cache')) {
      datasets.push({
        label: 'キャッシュヒット率 (%)',
        data: metrics.timeSeriesData.cachePerformance,
        borderColor: '#F59E0B',
        backgroundColor: '#F59E0B20'
      });
    }
    
    return datasets;
  }, [metrics, selectedMetrics]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">詳細メトリクスを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* 表示選択 */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { key: 'overview', label: '概要', icon: ChartBarIcon },
                { key: 'performance', label: 'パフォーマンス', icon: CpuChipIcon },
                { key: 'geography', label: '地理的分析', icon: GlobeAltIcon },
                { key: 'analysis', label: '詳細分析', icon: DocumentChartBarIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedView(key as any)}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    selectedView === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            
            {/* 時間範囲選択 */}
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="1h">過去1時間</option>
              <option value="6h">過去6時間</option>
              <option value="24h">過去24時間</option>
              <option value="7d">過去7日</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* メトリクス選択 */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">表示メトリクス:</span>
              {['queries', 'responseTime', 'errorRate', 'cache'].map((metric) => (
                <label key={metric} className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMetrics([...selectedMetrics, metric]);
                      } else {
                        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-xs">{
                    metric === 'queries' ? 'クエリ' :
                    metric === 'responseTime' ? '応答時間' :
                    metric === 'errorRate' ? 'エラー率' : 'キャッシュ'
                  }</span>
                </label>
              ))}
            </div>
            
            {/* リアルタイム表示 */}
            {realtime && (
              <div className="flex items-center space-x-2 text-green-600">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">リアルタイム</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* パフォーマンス指標サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">成功率</p>
              <p className="text-2xl font-bold text-green-600">
                {performanceIndicators?.successRate.toFixed(1)}%
              </p>
            </div>
            <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均応答時間</p>
              <p className="text-2xl font-bold text-blue-600">
                {performanceIndicators?.avgResponseTime}ms
              </p>
            </div>
            <ClockIcon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">スループット</p>
              <p className="text-2xl font-bold text-purple-600">
                {performanceIndicators?.throughput} QPS
              </p>
            </div>
            <ChartBarIcon className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">キャッシュ効率</p>
              <p className="text-2xl font-bold text-yellow-600">
                {performanceIndicators?.cacheEfficiency.toFixed(1)}%
              </p>
            </div>
            <CloudIcon className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">エラー率</p>
              <p className="text-2xl font-bold text-red-600">
                {performanceIndicators?.errorRate.toFixed(2)}%
              </p>
            </div>
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* メインコンテンツ表示 */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 複合メトリクスチャート */}
          <div className="lg:col-span-2">
            <MetricsChart
              type="line"
              title="統合メトリクス推移"
              datasets={combinedChartData}
              realtime={realtime}
              height={300}
            />
          </div>
          
          {/* クエリタイプ分布 */}
          <QueryTypeChart data={metrics.queryAnalysis.byType} />
          
          {/* エラー率推移 */}
          <ErrorRateChart data={metrics.timeSeriesData.errorRate} realtime={realtime} />
        </div>
      )}

      {selectedView === 'performance' && (
        <div className="space-y-6">
          {/* サーバーパフォーマンス */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">サーバーパフォーマンス</h3>
            <div className="space-y-4">
              {metrics.performance.serverStats.map((server, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{server.server}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">CPU: </span>
                    <span className={`font-medium ${server.cpu > 80 ? 'text-red-600' : server.cpu > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {server.cpu}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">メモリ: </span>
                    <span className={`font-medium ${server.memory > 80 ? 'text-red-600' : server.memory > 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {server.memory}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">接続数: </span>
                    <span className="font-medium">{server.connections.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* ボトルネック分析 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ボトルネック分析</h3>
            <div className="space-y-3">
              {metrics.performance.bottlenecks.map((bottleneck, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  bottleneck.severity === 'high' ? 'border-red-500 bg-red-50' :
                  bottleneck.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{bottleneck.component}</h4>
                      <p className="text-sm text-gray-600 mt-1">{bottleneck.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      bottleneck.severity === 'high' ? 'bg-red-100 text-red-700' :
                      bottleneck.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {bottleneck.severity === 'high' ? '高' : bottleneck.severity === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedView === 'geography' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 地理的分布レーダーチャート */}
          <GeographicRadarChart data={metrics.geographical.distribution} />
          
          {/* 国別統計 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">国別パフォーマンス</h3>
            <div className="space-y-3">
              {metrics.geographical.countryStats.map((country, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{country.country}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{country.queries.toLocaleString()} クエリ</div>
                    <div className="text-xs text-gray-500">{country.responseTime}ms 平均</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* エッジノード状態 */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">エッジノード状態</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.geographical.edgeNodes.map((node, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{node.location}</h4>
                      <span className={`w-3 h-3 rounded-full ${
                        node.status === 'healthy' ? 'bg-green-500' :
                        node.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">負荷:</span>
                        <span className={`font-medium ${
                          node.load > 80 ? 'text-red-600' : node.load > 60 ? 'text-yellow-600' : 'text-green-600'
                        }`}>{node.load.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">レイテンシ:</span>
                        <span className="font-medium">{node.latency.toFixed(1)}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'analysis' && (
        <div className="space-y-6">
          {/* 検索フィルター */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ドメイン・メトリクスを検索..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* トップドメイン分析 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">トップドメイン分析</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ドメイン
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      クエリ数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      エラー率
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.queryAnalysis.topDomains
                    .filter(domain => domain.domain.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((domain, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {domain.domain}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {domain.queries.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`${
                          domain.errorRate > 5 ? 'text-red-600' : domain.errorRate > 1 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {domain.errorRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          domain.errorRate > 5 ? 'bg-red-100 text-red-800' :
                          domain.errorRate > 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {domain.errorRate > 5 ? '要注意' : domain.errorRate > 1 ? '警告' : '正常'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedMetricsView;