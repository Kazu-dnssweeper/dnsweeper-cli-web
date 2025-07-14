/**
 * マルチテナント管理ページ - DNSweeper統合版
 * 
 * 完全なマルチテナント環境でのDNS管理、リソース制限、
 * 監査ログ、請求管理、分離設定を提供
 */

import React, { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  settings: {
    maxDNSRecords: number;
    maxQueriesPerMonth: number;
    maxUsers: number;
    apiRateLimit: number;
    allowedFeatures: string[];
  };
  subscription: {
    planId: string;
    status: 'active' | 'past_due' | 'cancelled';
    usage: {
      dnsRecords: number;
      queriesThisMonth: number;
      activeUsers: number;
      apiCalls: number;
    };
  };
  metadata: {
    industry?: string;
    companySize?: string;
    region?: string;
    contactEmail: string;
  };
}

interface TenantStats {
  overview: {
    totalUsers: number;
    totalResources: number;
    totalQueries: number;
    totalStorage: number;
  };
  quota: {
    tenantId: string;
    limits: {
      dnsRecords: number;
      queriesPerMonth: number;
      users: number;
      apiCallsPerHour: number;
      storageGB: number;
    };
    usage: {
      dnsRecords: number;
      queriesThisMonth: number;
      activeUsers: number;
      apiCallsThisHour: number;
      storageUsedGB: number;
    };
  };
}

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newTenant, setNewTenant] = useState({
    name: '',
    domain: '',
    plan: 'free' as const,
    email: '',
    industry: 'technology',
    companySize: 'startup',
    region: 'us-east-1'
  });

  // テナント一覧を取得
  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenants');
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const data = await response.json();
      setTenants(data.tenants || data);
    } catch (error) {
      console.error('テナント一覧の取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // テナント統計を取得
  const fetchTenantStats = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch tenant stats');
      const data = await response.json();
      setTenantStats(data);
    } catch (error) {
      console.error('テナント統計の取得に失敗しました:', error);
    }
  };

  // テナント作成
  const createTenant = async () => {
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant)
      });
      
      if (!response.ok) throw new Error('Failed to create tenant');
      
      await fetchTenants();
      setIsCreateDialogOpen(false);
      setNewTenant({
        name: '',
        domain: '',
        plan: 'free',
        email: '',
        industry: 'technology',
        companySize: 'startup',
        region: 'us-east-1'
      });
      
      console.log('テナントが正常に作成されました');
    } catch (error) {
      console.error('テナントの作成に失敗しました:', error);
    }
  };

  // テナント更新
  const updateTenant = async (tenantId: string, updates: Partial<Tenant>) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update tenant');
      
      await fetchTenants();
      setIsEditDialogOpen(false);
      
      console.log('テナントが正常に更新されました');
    } catch (error) {
      console.error('テナントの更新に失敗しました:', error);
    }
  };

  // テナント削除
  const deleteTenant = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete tenant');
      
      await fetchTenants();
      
      console.log('テナントが正常に削除されました');
    } catch (error) {
      console.error('テナントの削除に失敗しました:', error);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // フィルタリング
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800', 
      cancelled: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'active' ? 'アクティブ' : status === 'suspended' ? '一時停止' : 'キャンセル'}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-amber-100 text-amber-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {plan.toUpperCase()}
      </span>
    );
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">テナント管理</h1>
          <p className="text-gray-600 mt-1">組織とユーザーのマルチテナント管理</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchTenants}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
          <button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規テナント
          </button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総テナント数</dt>
                  <dd className="text-lg font-medium text-gray-900">{tenants.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-green-600 font-medium">アクティブ: {tenants.filter(t => t.status === 'active').length}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総ユーザー数</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tenants.reduce((sum, t) => sum + t.subscription.usage.activeUsers, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">全テナント合計</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">月間クエリ数</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tenants.reduce((sum, t) => sum + t.subscription.usage.queriesThisMonth, 0).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">今月の合計</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">DNSレコード数</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tenants.reduce((sum, t) => sum + t.subscription.usage.dnsRecords, 0).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">管理中のレコード</span>
            </div>
          </div>
        </div>
      </div>

      {/* フィルターとテーブル */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">テナント一覧</h3>
            <div className="flex gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="テナント名またはドメインで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">すべて</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">すべて</option>
                <option value="active">アクティブ</option>
                <option value="suspended">一時停止</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">テナント名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ドメイン</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プラン</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用状況</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPlanBadge(tenant.plan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(tenant.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>DNS: {tenant.subscription.usage.dnsRecords}/{tenant.settings.maxDNSRecords}</span>
                          <span>{getUsagePercentage(tenant.subscription.usage.dnsRecords, tenant.settings.maxDNSRecords)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{ width: `${getUsagePercentage(tenant.subscription.usage.dnsRecords, tenant.settings.maxDNSRecords)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setSelectedTenant(tenant);
                            fetchTenantStats(tenant.id);
                            setIsStatsDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`テナント "${tenant.name}" を削除しますか？この操作は取り消せません。`)) {
                              deleteTenant(tenant.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* テナント作成ダイアログ */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">新しいテナントを作成</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">組織名</label>
                        <input
                          type="text"
                          value={newTenant.name}
                          onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="例: Acme Corporation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ドメイン</label>
                        <input
                          type="text"
                          value={newTenant.domain}
                          onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="例: acme.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                        <input
                          type="email"
                          value={newTenant.email}
                          onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="例: admin@acme.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">プラン</label>
                        <select
                          value={newTenant.plan}
                          onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value as any })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="free">Free</option>
                          <option value="basic">Basic</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={createTenant}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  作成
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* テナント統計ダイアログ */}
      {isStatsDialogOpen && selectedTenant && tenantStats && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedTenant.name} - 詳細統計</h3>
                    <div className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{tenantStats.overview.totalUsers}</div>
                          <div className="text-sm text-gray-600">ユーザー数</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{tenantStats.overview.totalResources}</div>
                          <div className="text-sm text-gray-600">リソース数</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{tenantStats.overview.totalQueries.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">クエリ数</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{tenantStats.overview.totalStorage.toFixed(2)} GB</div>
                          <div className="text-sm text-gray-600">ストレージ</div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-md font-medium text-gray-900">リソース使用状況</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>DNSレコード</span>
                              <span>{tenantStats.quota.usage.dnsRecords} / {tenantStats.quota.limits.dnsRecords}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${getUsagePercentage(tenantStats.quota.usage.dnsRecords, tenantStats.quota.limits.dnsRecords)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>月間クエリ</span>
                              <span>{tenantStats.quota.usage.queriesThisMonth.toLocaleString()} / {tenantStats.quota.limits.queriesPerMonth.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${getUsagePercentage(tenantStats.quota.usage.queriesThisMonth, tenantStats.quota.limits.queriesPerMonth)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>ユーザー数</span>
                              <span>{tenantStats.quota.usage.activeUsers} / {tenantStats.quota.limits.users}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full" 
                                style={{ width: `${getUsagePercentage(tenantStats.quota.usage.activeUsers, tenantStats.quota.limits.users)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>ストレージ</span>
                              <span>{tenantStats.quota.usage.storageUsedGB.toFixed(2)} GB / {tenantStats.quota.limits.storageGB} GB</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-600 h-2 rounded-full" 
                                style={{ width: `${getUsagePercentage(tenantStats.quota.usage.storageUsedGB, tenantStats.quota.limits.storageGB)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setIsStatsDialogOpen(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;