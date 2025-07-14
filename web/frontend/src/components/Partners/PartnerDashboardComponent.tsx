/**
 * DNSweeper パートナーダッシュボードコンポーネント
 * パートナー管理・統合設定・API使用量・分析・サポート機能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import {
  Partner,
  Integration,
  WebhookConfig,
  PartnerSupportTicket,
  ApiAnalytics,
  PartnerType
} from '../../types/partner-api';

/**
 * タブタイプ
 */
type TabType = 'overview' | 'integrations' | 'webhooks' | 'analytics' | 'support' | 'sdk';

/**
 * パートナーダッシュボードプロパティ
 */
interface PartnerDashboardProps {
  partnerId?: string;
  partnerType?: PartnerType;
  adminView?: boolean;
}

/**
 * パートナーダッシュボードコンポーネント
 */
export const PartnerDashboardComponent: React.FC<PartnerDashboardProps> = ({
  partnerId,
  partnerType = 'technology',
  adminView = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [supportTickets, setSupportTickets] = useState<PartnerSupportTicket[]>([]);
  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [error, setError] = useState<string | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    if (partnerId) {
      loadPartnerData();
    }
  }, [partnerId]);

  // タブ変更時のデータ読み込み
  useEffect(() => {
    if (partnerId && activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab, partnerId, selectedTimeRange]);

  /**
   * パートナーデータの読み込み
   */
  const loadPartnerData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/partners/${partnerId}`);
      const result = await response.json();
      
      if (result.success) {
        setPartner(result.data);
      } else {
        setError(result.error?.message || 'パートナー情報の取得に失敗しました');
      }
    } catch (error) {
      setError('パートナー情報の読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * タブ別データの読み込み
   */
  const loadTabData = async (tab: TabType): Promise<void> => {
    if (!partnerId) return;

    try {
      setIsLoading(true);

      switch (tab) {
        case 'integrations':
          await loadIntegrations();
          break;
        case 'webhooks':
          await loadWebhooks();
          break;
        case 'analytics':
          await loadAnalytics();
          break;
        case 'support':
          await loadSupportTickets();
          break;
      }
    } catch (error) {
      setError(`${tab}データの読み込み中にエラーが発生しました`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 統合データの読み込み
   */
  const loadIntegrations = async (): Promise<void> => {
    const response = await fetch(`/api/partners/${partnerId}/integrations`);
    const result = await response.json();
    
    if (result.success) {
      setIntegrations(result.data);
    }
  };

  /**
   * Webhookデータの読み込み
   */
  const loadWebhooks = async (): Promise<void> => {
    const response = await fetch(`/api/partners/${partnerId}/webhooks`);
    const result = await response.json();
    
    if (result.success) {
      setWebhooks(result.data);
    }
  };

  /**
   * 分析データの読み込み
   */
  const loadAnalytics = async (): Promise<void> => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (selectedTimeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    const response = await fetch(
      `/api/partners/${partnerId}/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
    const result = await response.json();
    
    if (result.success) {
      setAnalytics(result.data);
    }
  };

  /**
   * サポートチケットの読み込み
   */
  const loadSupportTickets = async (): Promise<void> => {
    const response = await fetch(`/api/partners/${partnerId}/support/tickets`);
    const result = await response.json();
    
    if (result.success) {
      setSupportTickets(result.data);
    }
  };

  /**
   * パートナータイプアイコン
   */
  const getPartnerTypeIcon = (type: PartnerType): string => {
    const icons = {
      technology: '🔧',
      integration: '🔗',
      reseller: '🏪',
      mssp: '🛡️',
      consulting: '💼',
      oss: '🌍'
    };
    return icons[type] || '🤝';
  };

  /**
   * ステータスバッジ
   */
  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: '承認待ち' },
      approved: { color: 'bg-blue-100 text-blue-800', text: '承認済み' },
      active: { color: 'bg-green-100 text-green-800', text: 'アクティブ' },
      suspended: { color: 'bg-red-100 text-red-800', text: '停止中' },
      terminated: { color: 'bg-gray-100 text-gray-800', text: '終了' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  /**
   * ティアレベルバッジ
   */
  const getTierBadge = (tier: string): JSX.Element => {
    const tierConfig = {
      bronze: { color: 'bg-amber-100 text-amber-800', icon: '🥉' },
      silver: { color: 'bg-gray-100 text-gray-800', icon: '🥈' },
      gold: { color: 'bg-yellow-100 text-yellow-800', icon: '🥇' },
      platinum: { color: 'bg-purple-100 text-purple-800', icon: '💎' }
    };

    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.bronze;

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {tier.toUpperCase()}
      </span>
    );
  };

  /**
   * 概要タブ
   */
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* パートナー情報 */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-4">{getPartnerTypeIcon(partner?.type || 'technology')}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{partner?.name}</h2>
              <p className="text-gray-600">{partner?.companyName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {partner && getStatusBadge(partner.status)}
            {partner && getTierBadge(partner.tierLevel)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">パートナータイプ:</span>
              <span className="ml-2 text-sm text-gray-900">{partner?.type}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">連絡先:</span>
              <span className="ml-2 text-sm text-gray-900">{partner?.contactEmail}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">ウェブサイト:</span>
              {partner?.website ? (
                <a href={partner.website} target="_blank" rel="noopener noreferrer" 
                   className="ml-2 text-sm text-blue-600 hover:text-blue-800">
                  {partner.website}
                </a>
              ) : (
                <span className="ml-2 text-sm text-gray-500">未設定</span>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">登録日:</span>
              <span className="ml-2 text-sm text-gray-900">
                {partner?.createdAt ? new Date(partner.createdAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">最終アクティビティ:</span>
              <span className="ml-2 text-sm text-gray-900">
                {partner?.lastActiveAt ? new Date(partner.lastActiveAt).toLocaleDateString('ja-JP') : '-'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">統合数:</span>
              <span className="ml-2 text-sm text-gray-900">{partner?.integrations.length || 0}</span>
            </div>
          </div>
        </div>

        {partner?.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-700">{partner.description}</p>
          </div>
        )}
      </Card>

      {/* メトリクス概要 */}
      {partner && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">API使用量</p>
                <p className="text-2xl font-bold text-blue-600">
                  {partner.metrics.apiUsage.totalRequests.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">総リクエスト</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">成功率</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round((partner.metrics.apiUsage.successfulRequests / Math.max(partner.metrics.apiUsage.totalRequests, 1)) * 100)}%
                </p>
                <p className="text-xs text-gray-500">API成功率</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">データ転送</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(partner.metrics.dataUsage.dataTransferGB).toFixed(1)}GB
                </p>
                <p className="text-xs text-gray-500">総転送量</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">収益</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${partner.metrics.revenue.generated.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">総収益</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* API認証情報 */}
      {partner && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API認証情報</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">APIキー</label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono">
                  {partner.credentials.apiKey}
                </code>
                <Button size="sm" variant="outline">
                  コピー
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">認証方式:</span>
                <span className="ml-2 text-sm text-gray-900">{partner.credentials.authMethod}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">スコープ:</span>
                <span className="ml-2 text-sm text-gray-900">{partner.credentials.scopes.join(', ')}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">最終ローテーション:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {new Date(partner.credentials.lastRotated).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">有効期限:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {partner.credentials.expiresAt 
                    ? new Date(partner.credentials.expiresAt).toLocaleDateString('ja-JP')
                    : '無期限'
                  }
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                認証情報を再生成
              </Button>
              <Button size="sm" variant="outline">
                ドキュメントを表示
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  /**
   * 統合タブ
   */
  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">統合管理</h2>
        <Button>
          新しい統合を作成
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                <p className="text-sm text-gray-600">{integration.type}</p>
              </div>
              {getStatusBadge(integration.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">エンドポイント:</span>
                <span className="text-gray-900">{integration.endpoints.length}個</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">データマッピング:</span>
                <span className="text-gray-900">{integration.dataMapping.length}個</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">最終同期:</span>
                <span className="text-gray-900">
                  {integration.lastSyncAt 
                    ? new Date(integration.lastSyncAt).toLocaleString('ja-JP')
                    : '未実行'
                  }
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                設定
              </Button>
              <Button size="sm" variant="outline">
                テスト
              </Button>
              <Button size="sm" variant="outline">
                ログ
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-gray-500">統合が設定されていません</p>
          <Button className="mt-4">
            最初の統合を作成
          </Button>
        </div>
      )}
    </div>
  );

  /**
   * SDK タブ
   */
  const renderSdkTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">SDK・開発ツール</h2>

      {/* SDK言語サポート */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">対応言語</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'JavaScript/TypeScript', icon: '📜', status: 'stable', package: '@dnsweeper/sdk' },
            { name: 'Python', icon: '🐍', status: 'stable', package: 'dnsweeper-sdk' },
            { name: 'Go', icon: '🚀', status: 'stable', package: 'github.com/dnsweeper/go-sdk' },
            { name: 'Java', icon: '☕', status: 'beta', package: 'com.dnsweeper:dnsweeper-sdk' },
            { name: 'C#', icon: '🔷', status: 'beta', package: 'DNSweeper.SDK' },
            { name: 'Ruby', icon: '💎', status: 'alpha', package: 'dnsweeper-sdk' }
          ].map((lang) => (
            <div key={lang.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{lang.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{lang.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    lang.status === 'stable' ? 'bg-green-100 text-green-800' :
                    lang.status === 'beta' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lang.status}
                  </span>
                </div>
              </div>
              <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {lang.package}
              </code>
              <div className="mt-2 flex space-x-1">
                <Button size="sm" variant="outline">
                  ダウンロード
                </Button>
                <Button size="sm" variant="outline">
                  ドキュメント
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* コード例 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">基本的な使用例</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">JavaScript/TypeScript</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import { DNSweeper } from '@dnsweeper/sdk';

const client = new DNSweeper({
  apiKey: '${partner?.credentials.apiKey || 'your-api-key'}'
});

// DNS クエリの実行
const result = await client.dns.query({
  domain: 'example.com',
  type: 'A'
});

console.log(result);`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Python</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`from dnsweeper import DNSweeper

client = DNSweeper(api_key='${partner?.credentials.apiKey || 'your-api-key'}')

# DNS クエリの実行
result = await client.dns.query(
    domain='example.com',
    record_type='A'
)

print(result)`}
            </pre>
          </div>
        </div>
      </Card>

      {/* API リファレンス */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">開発リソース</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/docs/api-reference" target="_blank" rel="noopener noreferrer" 
             className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h4 className="font-medium text-gray-900">API リファレンス</h4>
            <p className="text-sm text-gray-600 mt-1">完全なAPI仕様書とエンドポイント一覧</p>
          </a>
          
          <a href="/docs/quickstart" target="_blank" rel="noopener noreferrer"
             className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h4 className="font-medium text-gray-900">クイックスタート</h4>
            <p className="text-sm text-gray-600 mt-1">5分で始められる導入ガイド</p>
          </a>
          
          <a href="/docs/examples" target="_blank" rel="noopener noreferrer"
             className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h4 className="font-medium text-gray-900">コード例集</h4>
            <p className="text-sm text-gray-600 mt-1">実践的なユースケース別のコード例</p>
          </a>
          
          <a href="https://github.com/dnsweeper/sdk" target="_blank" rel="noopener noreferrer"
             className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <h4 className="font-medium text-gray-900">GitHub リポジトリ</h4>
            <p className="text-sm text-gray-600 mt-1">ソースコードとサンプルプロジェクト</p>
          </a>
        </div>
      </Card>
    </div>
  );

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">エラーが発生しました</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); loadPartnerData(); }}>
            再試行
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {adminView ? 'パートナー管理' : 'パートナーダッシュボード'}
          </h1>
          <p className="text-gray-600 mt-1">
            {adminView ? 'パートナーアカウントの管理と監視' : 'API統合と開発ツール'}
          </p>
        </div>
        
        {adminView && (
          <div className="flex space-x-2">
            <Button variant="outline">
              パートナーを招待
            </Button>
            <Button>
              新しいパートナー
            </Button>
          </div>
        )}
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '概要', icon: '📊' },
            { id: 'integrations', name: '統合', icon: '🔗' },
            { id: 'webhooks', name: 'Webhook', icon: '📡' },
            { id: 'analytics', name: '分析', icon: '📈' },
            { id: 'sdk', name: 'SDK', icon: '🛠️' },
            { id: 'support', name: 'サポート', icon: '🎧' }
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
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'integrations' && renderIntegrationsTab()}
          {activeTab === 'sdk' && renderSdkTab()}
          {/* 他のタブは省略（同様の実装） */}
        </>
      )}
    </div>
  );
};

export default PartnerDashboardComponent;