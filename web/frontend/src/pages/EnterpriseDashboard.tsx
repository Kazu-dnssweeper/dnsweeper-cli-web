/**
 * DNSweeper エンタープライズダッシュボード
 * Active Directory統合・コンプライアンス監視・リアルタイム監査・セキュリティ分析
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useEnterpriseAuth } from '../contexts/EnterpriseAuthContext';
import {
  ComplianceStatus,
  FrameworkComplianceStatus,
  ComplianceViolation,
  AuditEvent,
  SecurityGroup,
  OrganizationUnit,
  EnterpriseUser,
  GroupPolicy
} from '../types/enterprise-auth';

/**
 * ダッシュボードメトリクス
 */
interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  totalPolicies: number;
  activePolicies: number;
  complianceScore: number;
  riskScore: number;
  lastAuditDate: Date;
  pendingReviews: number;
  securityAlerts: number;
  accessRequests: number;
  recentLogins: number;
}

/**
 * セキュリティアラート
 */
interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  source: string;
  affected: string[];
  status: 'open' | 'investigating' | 'resolved';
}

/**
 * 監査アクティビティ
 */
interface AuditActivity {
  id: string;
  timestamp: Date;
  event: AuditEvent;
  user: {
    id: string;
    name: string;
    department?: string;
  };
  resource: string;
  action: string;
  result: 'success' | 'failure' | 'warning';
  riskScore: number;
  location?: string;
}

/**
 * エンタープライズダッシュボードページ
 */
export const EnterpriseDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [recentAuditActivity, setRecentAuditActivity] = useState<AuditActivity[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [appliedPolicies, setAppliedPolicies] = useState<GroupPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30秒

  const {
    user,
    account,
    permissions,
    groupMemberships,
    hasPermission,
    getComplianceStatus,
    logAuditEvent
  } = useEnterpriseAuth();

  // 初期データ読み込み
  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange]);

  // 自動リフレッシュ
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRealTimeData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  /**
   * ダッシュボードデータの読み込み
   */
  const loadDashboardData = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // 並列でデータを取得
      const [
        metricsData,
        complianceData,
        alertsData,
        auditData,
        ouData,
        policiesData
      ] = await Promise.all([
        fetchDashboardMetrics(),
        getComplianceStatus(),
        fetchSecurityAlerts(),
        fetchRecentAuditActivity(),
        fetchOrganizationUnits(),
        fetchAppliedPolicies()
      ]);

      setMetrics(metricsData);
      setComplianceStatus(complianceData);
      setSecurityAlerts(alertsData);
      setRecentAuditActivity(auditData);
      setOrganizationUnits(ouData);
      setAppliedPolicies(policiesData);

      // ダッシュボード表示を監査ログに記録
      await logAuditEvent('resource_access', {
        resource: 'enterprise_dashboard',
        action: 'view',
        timeRange: selectedTimeRange
      });

    } catch (error) {
      console.error('ダッシュボードデータ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * リアルタイムデータの更新
   */
  const refreshRealTimeData = async (): Promise<void> => {
    try {
      const [metricsData, alertsData, auditData] = await Promise.all([
        fetchDashboardMetrics(),
        fetchSecurityAlerts(),
        fetchRecentAuditActivity()
      ]);

      setMetrics(metricsData);
      setSecurityAlerts(alertsData);
      setRecentAuditActivity(auditData);
    } catch (error) {
      console.error('リアルタイムデータ更新エラー:', error);
    }
  };

  /**
   * ダッシュボードメトリクス取得
   */
  const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
    const response = await fetch(`/api/enterprise/dashboard/metrics?timeRange=${selectedTimeRange}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('メトリクス取得失敗');
    }

    return response.json();
  };

  /**
   * セキュリティアラート取得
   */
  const fetchSecurityAlerts = async (): Promise<SecurityAlert[]> => {
    const response = await fetch('/api/enterprise/security/alerts?limit=10', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('セキュリティアラート取得失敗');
    }

    const data = await response.json();
    return data.alerts;
  };

  /**
   * 最近の監査アクティビティ取得
   */
  const fetchRecentAuditActivity = async (): Promise<AuditActivity[]> => {
    const response = await fetch(`/api/enterprise/audit/recent?timeRange=${selectedTimeRange}&limit=20`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('監査アクティビティ取得失敗');
    }

    const data = await response.json();
    return data.activities;
  };

  /**
   * 組織単位取得
   */
  const fetchOrganizationUnits = async (): Promise<OrganizationUnit[]> => {
    const response = await fetch('/api/enterprise/organization/units', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('組織単位取得失敗');
    }

    const data = await response.json();
    return data.organizationUnits;
  };

  /**
   * 適用ポリシー取得
   */
  const fetchAppliedPolicies = async (): Promise<GroupPolicy[]> => {
    const response = await fetch('/api/enterprise/policies/applied', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('適用ポリシー取得失敗');
    }

    const data = await response.json();
    return data.policies;
  };

  /**
   * セキュリティアラート解決
   */
  const resolveSecurityAlert = async (alertId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/enterprise/security/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('アラート解決失敗');
      }

      // アラートリストを更新
      setSecurityAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'resolved' }
            : alert
        )
      );

      await logAuditEvent('settings_change', {
        resource: 'security_alert',
        action: 'resolve',
        alertId
      });

    } catch (error) {
      console.error('アラート解決エラー:', error);
    }
  };

  // 計算されたメトリクス
  const calculatedMetrics = useMemo(() => {
    if (!metrics || !complianceStatus) return null;

    return {
      healthScore: Math.round((metrics.complianceScore + (100 - metrics.riskScore)) / 2),
      criticalAlerts: securityAlerts.filter(a => a.severity === 'critical' && a.status === 'open').length,
      highRiskAudits: recentAuditActivity.filter(a => a.riskScore > 70).length,
      complianceGap: 100 - metrics.complianceScore
    };
  }, [metrics, complianceStatus, securityAlerts, recentAuditActivity]);

  // アラート重要度別カウント
  const alertsBySeverity = useMemo(() => {
    return securityAlerts
      .filter(alert => alert.status === 'open')
      .reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }, [securityAlerts]);

  // コンプライアンス状況サマリー
  const complianceSummary = useMemo(() => {
    if (!complianceStatus) return null;

    const compliantFrameworks = complianceStatus.frameworks.filter(f => f.status === 'compliant').length;
    const totalFrameworks = complianceStatus.frameworks.length;
    const compliancePercentage = totalFrameworks > 0 ? (compliantFrameworks / totalFrameworks) * 100 : 100;

    return {
      compliantFrameworks,
      totalFrameworks,
      compliancePercentage,
      criticalViolations: complianceStatus.violations.filter(v => v.severity === 'critical').length
    };
  }, [complianceStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">エンタープライズダッシュボード</h1>
          <p className="text-gray-600 mt-1">
            {account?.name} - {user?.department || '全体管理'}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* 時間範囲選択 */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">過去24時間</option>
            <option value="7d">過去7日間</option>
            <option value="30d">過去30日間</option>
          </select>

          {/* リフレッシュボタン */}
          <Button onClick={loadDashboardData} variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </Button>
        </div>
      </div>

      {/* メトリクス概要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">システム健全性</p>
              <p className="text-3xl font-bold text-green-600">
                {calculatedMetrics?.healthScore || 0}%
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
              <p className="text-sm font-medium text-gray-600">アクティブユーザー</p>
              <p className="text-3xl font-bold text-blue-600">
                {metrics?.activeUsers || 0}
              </p>
              <p className="text-xs text-gray-500">
                / {metrics?.totalUsers || 0} 総ユーザー
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">コンプライアンス</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(complianceSummary?.compliancePercentage || 0)}%
              </p>
              <p className="text-xs text-gray-500">
                {complianceSummary?.compliantFrameworks || 0} / {complianceSummary?.totalFrameworks || 0} フレームワーク
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">セキュリティアラート</p>
              <p className="text-3xl font-bold text-red-600">
                {calculatedMetrics?.criticalAlerts || 0}
              </p>
              <p className="text-xs text-gray-500">
                クリティカル / {securityAlerts.filter(a => a.status === 'open').length} 総アラート
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* セキュリティアラート */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">セキュリティアラート</h3>
              {hasPermission('integrations', 'manage') && (
                <Button variant="outline" size="sm">
                  すべて表示
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {securityAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-500' :
                    alert.severity === 'high' ? 'bg-orange-500' :
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{alert.source}</span>
                      <span>{new Date(alert.timestamp).toLocaleString('ja-JP')}</span>
                      <span>{alert.affected.length} 件影響</span>
                    </div>
                  </div>

                  {alert.status === 'open' && hasPermission('integrations', 'manage') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveSecurityAlert(alert.id)}
                    >
                      解決
                    </Button>
                  )}
                </div>
              ))}

              {securityAlerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  現在、セキュリティアラートはありません
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* コンプライアンス状況 */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">コンプライアンス状況</h3>
            
            {complianceStatus && (
              <div className="space-y-4">
                {complianceStatus.frameworks.map((framework) => (
                  <div key={framework.framework} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {framework.framework.toUpperCase()}
                      </span>
                      <span className={`text-sm font-medium ${
                        framework.status === 'compliant' ? 'text-green-600' :
                        framework.status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(framework.score)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          framework.status === 'compliant' ? 'bg-green-500' :
                          framework.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${framework.score}%` }}
                      />
                    </div>
                  </div>
                ))}

                {complianceStatus.violations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      要対応違反 ({complianceStatus.violations.length})
                    </h4>
                    <div className="space-y-2">
                      {complianceStatus.violations.slice(0, 3).map((violation) => (
                        <div key={violation.id} className="text-xs text-red-600">
                          • {violation.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 監査アクティビティ */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近の監査アクティビティ</h3>
            {hasPermission('history', 'read') && (
              <Button variant="outline" size="sm">
                詳細ログ
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時刻
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    イベント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リソース
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    結果
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リスク
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAuditActivity.slice(0, 10).map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(activity.timestamp).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{activity.user.name}</div>
                      {activity.user.department && (
                        <div className="text-xs text-gray-500">{activity.user.department}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.event}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        activity.result === 'success' ? 'bg-green-100 text-green-800' :
                        activity.result === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {activity.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              activity.riskScore > 70 ? 'bg-red-500' :
                              activity.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${activity.riskScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{activity.riskScore}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recentAuditActivity.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              監査アクティビティがありません
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EnterpriseDashboard;