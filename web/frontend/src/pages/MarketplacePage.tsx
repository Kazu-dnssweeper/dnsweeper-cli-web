/**
 * DNSweeper マーケットプレイスページ
 * クラウドマーケットプレイス統合・ワンクリックデプロイ・製品管理・分析ダッシュボード
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { MarketplaceDeployComponent } from '../components/Marketplace/MarketplaceDeployComponent';
import {
  MarketplaceProvider,
  MarketplaceProduct,
  DeploymentSession,
  MarketplaceMetrics,
  UsageReport
} from '../types/marketplace-integration';

/**
 * タブタイプ
 */
type TabType = 'deploy' | 'products' | 'deployments' | 'analytics' | 'billing';

/**
 * マーケットプレイスページ
 */
export const MarketplacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('deploy');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [deployments, setDeployments] = useState<DeploymentSession[]>([]);
  const [metrics, setMetrics] = useState<MarketplaceMetrics | null>(null);
  const [usageReports, setUsageReports] = useState<UsageReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('30d');

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, []);

  // メトリクス更新
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadMetrics();
    }
  }, [activeTab, selectedTimeRange]);

  /**
   * 初期データ読み込み
   */
  const loadInitialData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const [productsData, deploymentsData] = await Promise.all([
        fetch('/api/marketplace/products').then(res => res.json()),
        fetch('/api/marketplace/deployments').then(res => res.json())
      ]);

      if (productsData.success) {
        setProducts(productsData.data);
      }
      
      if (deploymentsData.success) {
        setDeployments(deploymentsData.data);
      }
    } catch (error) {
      console.error('初期データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * メトリクス読み込み
   */
  const loadMetrics = async (): Promise<void> => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedTimeRange) {
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
      }

      const response = await fetch(
        `/api/marketplace/metrics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('メトリクス読み込みエラー:', error);
    }
  };

  /**
   * デプロイメント開始ハンドラー
   */
  const handleDeploymentStart = (session: DeploymentSession): void => {
    setDeployments(prev => [session, ...prev]);
  };

  /**
   * デプロイメント完了ハンドラー
   */
  const handleDeploymentComplete = (session: DeploymentSession): void => {
    setDeployments(prev => 
      prev.map(d => d.id === session.id ? session : d)
    );
  };

  /**
   * プロバイダーアイコン取得
   */
  const getProviderIcon = (provider: MarketplaceProvider): string => {
    const icons = {
      aws: '🟠',
      azure: '🔵',
      gcp: '🟡',
      digital_ocean: '🔵',
      linode: '🟢',
      alibaba: '🟠'
    };
    return icons[provider] || '☁️';
  };

  /**
   * ステータスバッジ取得
   */
  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: '待機中' },
      initializing: { color: 'bg-blue-100 text-blue-800', text: '初期化中' },
      deploying: { color: 'bg-blue-100 text-blue-800', text: 'デプロイ中' },
      completed: { color: 'bg-green-100 text-green-800', text: '完了' },
      failed: { color: 'bg-red-100 text-red-800', text: '失敗' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'キャンセル' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  /**
   * デプロイタブ
   */
  const renderDeployTab = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">クラウドデプロイメント</h2>
        <p className="text-gray-600">
          DNSweeperを主要なクラウドプロバイダーにワンクリックでデプロイできます
        </p>
      </div>

      <MarketplaceDeployComponent
        onDeploymentStart={handleDeploymentStart}
        onDeploymentComplete={handleDeploymentComplete}
        onDeploymentError={(error) => console.error('デプロイメントエラー:', error)}
      />
    </div>
  );

  /**
   * 製品タブ
   */
  const renderProductsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">マーケットプレイス製品</h2>
          <p className="text-gray-600">各クラウドプロバイダーでの製品登録状況</p>
        </div>
        <Button onClick={loadInitialData}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getProviderIcon(product.provider)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.provider.toUpperCase()}</p>
                </div>
              </div>
              {getStatusBadge(product.status)}
            </div>

            <p className="text-sm text-gray-700 mb-4">{product.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">バージョン:</span>
                <span className="text-gray-900">{product.version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">デプロイ方式:</span>
                <span className="text-gray-900">{product.deploymentOptions.length}種類</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">対応地域:</span>
                <span className="text-gray-900">{product.supportedRegions.length}箇所</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button size="sm" variant="outline" className="flex-1">
                詳細
              </Button>
              {product.status === 'published' && (
                <Button size="sm" className="flex-1">
                  デプロイ
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-500">登録された製品がありません</p>
        </div>
      )}
    </div>
  );

  /**
   * デプロイメント履歴タブ
   */
  const renderDeploymentsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">デプロイメント履歴</h2>
          <p className="text-gray-600">過去のデプロイメント実行状況</p>
        </div>
        <Button onClick={loadInitialData}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  デプロイメント
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  プロバイダー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  地域
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  開始時刻
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所要時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deployments.map((deployment) => (
                <tr key={deployment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {deployment.id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500">
                      {deployment.customerInfo.organization || deployment.customerInfo.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getProviderIcon(deployment.marketplaceProvider)}</span>
                      <span className="text-sm text-gray-900">
                        {deployment.marketplaceProvider.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deployment.targetRegion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(deployment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(deployment.startTime).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {deployment.endTime 
                      ? `${Math.round((new Date(deployment.endTime).getTime() - new Date(deployment.startTime).getTime()) / 60000)}分`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        詳細
                      </Button>
                      {deployment.status === 'completed' && deployment.accessInformation.endpoints.length > 0 && (
                        <a
                          href={deployment.accessInformation.endpoints[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm">
                            アクセス
                          </Button>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deployments.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">デプロイメント履歴がありません</p>
          </div>
        )}
      </Card>
    </div>
  );

  /**
   * 分析タブ
   */
  const renderAnalyticsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">マーケットプレイス分析</h2>
          <p className="text-gray-600">デプロイメントと使用状況の分析</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">過去24時間</option>
            <option value="7d">過去7日間</option>
            <option value="30d">過去30日間</option>
          </select>
          <Button onClick={loadMetrics}>
            更新
          </Button>
        </div>
      </div>

      {metrics ? (
        <div className="space-y-6">
          {/* メトリクス概要 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">総デプロイメント</p>
                  <p className="text-3xl font-bold text-blue-600">{metrics.deployments.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">成功率</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(metrics.performance.successRate * 100)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">アクティブ顧客</p>
                  <p className="text-3xl font-bold text-purple-600">{metrics.customers.activeCustomers}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">総収益</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ${metrics.revenue.total.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* プロバイダー別分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プロバイダー別デプロイメント</h3>
              <div className="space-y-4">
                {Object.entries(metrics.deployments.byProvider).map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getProviderIcon(provider as MarketplaceProvider)}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {provider.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / metrics.deployments.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プロバイダー別収益</h3>
              <div className="space-y-4">
                {Object.entries(metrics.revenue.byProvider).map(([provider, revenue]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getProviderIcon(provider as MarketplaceProvider)}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {provider.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(revenue / metrics.revenue.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">${revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  );

  /**
   * 課金タブ
   */
  const renderBillingTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">課金・使用量</h2>
          <p className="text-gray-600">マーケットプレイス課金と使用量レポート</p>
        </div>
        <Button onClick={() => loadInitialData()}>
          レポート更新
        </Button>
      </div>

      <div className="space-y-6">
        {/* 課金サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">今月の収益</h3>
            <p className="text-2xl font-bold text-green-600">$12,450</p>
            <p className="text-xs text-gray-500 mt-1">前月比 +15%</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">アクティブサブスクリプション</h3>
            <p className="text-2xl font-bold text-blue-600">147</p>
            <p className="text-xs text-gray-500 mt-1">新規 +23</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">平均月額</h3>
            <p className="text-2xl font-bold text-purple-600">$84.69</p>
            <p className="text-xs text-gray-500 mt-1">ARPU</p>
          </Card>
        </div>

        {/* 使用量レポート */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近の使用量レポート</h3>
          
          <div className="space-y-4">
            {/* プレースホルダーデータ */}
            {[
              { id: '1', date: '2024-01-15', customer: 'Enterprise Corp', usage: '2.1M queries', amount: '$210' },
              { id: '2', date: '2024-01-14', customer: 'Tech Startup', usage: '850K queries', amount: '$85' },
              { id: '3', date: '2024-01-13', customer: 'Government Agency', usage: '5.2M queries', amount: '$520' }
            ].map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{report.customer}</div>
                  <div className="text-sm text-gray-600">{report.date}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{report.usage}</div>
                  <div className="text-xs text-gray-500">使用量</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">{report.amount}</div>
                  <div className="text-xs text-gray-500">請求額</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">マーケットプレイス</h1>
        <p className="text-gray-600">
          クラウドマーケットプレイス統合とデプロイメント管理
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'deploy', name: 'デプロイメント', icon: '🚀' },
            { id: 'products', name: '製品管理', icon: '📦' },
            { id: 'deployments', name: '履歴', icon: '📋' },
            { id: 'analytics', name: '分析', icon: '📊' },
            { id: 'billing', name: '課金', icon: '💰' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {activeTab === 'deploy' && renderDeployTab()}
          {activeTab === 'products' && renderProductsTab()}
          {activeTab === 'deployments' && renderDeploymentsTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'billing' && renderBillingTab()}
        </>
      )}
    </div>
  );
};

export default MarketplacePage;