import React from 'react';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';

export const Dashboard: React.FC = () => {
  // サンプルデータ（実際の実装では状態管理やAPIから取得）
  const stats = {
    totalRecords: 1250,
    highRisk: 45,
    mediumRisk: 127,
    lowRisk: 1078,
    lastScan: '2時間前'
  };

  const recentAnalyses = [
    {
      id: '1',
      fileName: 'cloudflare_domains.csv',
      recordCount: 450,
      riskScore: 7.2,
      createdAt: '2025-07-13 14:30',
      status: 'completed'
    },
    {
      id: '2', 
      fileName: 'route53_export.csv',
      recordCount: 800,
      riskScore: 5.8,
      createdAt: '2025-07-13 12:15',
      status: 'completed'
    },
    {
      id: '3',
      fileName: 'dns_backup.csv',
      recordCount: 320,
      riskScore: 8.1,
      createdAt: '2025-07-13 09:45',
      status: 'processing'
    }
  ];

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ダッシュボード
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNS レコードの監視と分析の概要
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-4 h-4" />
          <span>最終更新: {stats.lastScan}</span>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  総レコード数
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalRecords.toLocaleString()}
                </p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  高リスク
                </p>
                <p className="text-2xl font-bold text-error-600">
                  {stats.highRisk}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-error-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  中リスク
                </p>
                <p className="text-2xl font-bold text-warning-600">
                  {stats.mediumRisk}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-warning-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  低リスク
                </p>
                <p className="text-2xl font-bold text-success-600">
                  {stats.lowRisk}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-success-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近の分析結果 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近の分析結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => (
                <div 
                  key={analysis.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {analysis.fileName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {analysis.recordCount.toLocaleString()} レコード • {analysis.createdAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        analysis.riskScore >= 7 
                          ? 'text-error-600' 
                          : analysis.riskScore >= 5 
                          ? 'text-warning-600' 
                          : 'text-success-600'
                      }`}>
                        リスク: {analysis.riskScore}/10
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        analysis.status === 'completed' 
                          ? 'bg-success-500' 
                          : 'bg-warning-500 animate-pulse'
                      }`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* リスク分布チャート（プレースホルダー） */}
        <Card>
          <CardHeader>
            <CardTitle>リスク分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  高リスク ({((stats.highRisk / stats.totalRecords) * 100).toFixed(1)}%)
                </span>
                <span className="text-sm font-bold text-error-600">
                  {stats.highRisk}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-error-600 h-2 rounded-full" 
                  style={{ width: `${(stats.highRisk / stats.totalRecords) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  中リスク ({((stats.mediumRisk / stats.totalRecords) * 100).toFixed(1)}%)
                </span>
                <span className="text-sm font-bold text-warning-600">
                  {stats.mediumRisk}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-warning-600 h-2 rounded-full" 
                  style={{ width: `${(stats.mediumRisk / stats.totalRecords) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  低リスク ({((stats.lowRisk / stats.totalRecords) * 100).toFixed(1)}%)
                </span>
                <span className="text-sm font-bold text-success-600">
                  {stats.lowRisk}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-success-600 h-2 rounded-full" 
                  style={{ width: `${(stats.lowRisk / stats.totalRecords) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};