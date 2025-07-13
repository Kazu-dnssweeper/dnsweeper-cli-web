/**
 * DNSweeper 高度なレポート機能
 * 
 * DNS分析レポート生成・管理・エクスポート
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  ShareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { useNotifications } from '../components/UI/Notification';
import { cn } from '../utils/cn';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'risk_analysis' | 'performance' | 'compliance' | 'security' | 'custom';
  category: 'dns' | 'security' | 'performance' | 'compliance';
  config: {
    sections: ReportSection[];
    filters: ReportFilter[];
    charts: ChartConfig[];
    exportFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  };
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'table' | 'chart' | 'list' | 'metrics';
  dataSource: string;
  config: Record<string, any>;
  order: number;
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  label: string;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  dataSource: string;
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

interface GeneratedReport {
  id: string;
  templateId: string;
  templateName: string;
  title: string;
  description?: string;
  status: 'generating' | 'completed' | 'failed' | 'scheduled';
  progress: number;
  generatedAt?: Date;
  generatedBy: string;
  config: {
    dateRange: {
      from: Date;
      to: Date;
    };
    filters: Record<string, any>;
    format: 'pdf' | 'excel' | 'csv' | 'json';
  };
  results?: {
    totalPages: number;
    totalRecords: number;
    fileSize: number;
    downloadUrl: string;
  };
  error?: string;
  scheduledFor?: Date;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

interface ReportMetrics {
  totalReports: number;
  reportsToday: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  avgGenerationTime: number;
  mostUsedTemplate: string;
  totalExports: number;
  storageUsed: number;
}

export const Reports: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'generated' | 'templates' | 'scheduled'>('generated');
  const [generationConfig, setGenerationConfig] = useState({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    },
    format: 'pdf' as const,
    filters: {}
  });

  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  // レポートテンプレート一覧の取得
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockTemplates: ReportTemplate[] = [
        {
          id: 'risk_analysis_standard',
          name: 'DNSリスク分析レポート',
          description: 'DNS設定のリスク要因を包括的に分析し、改善提案を含むレポート',
          type: 'risk_analysis',
          category: 'security',
          config: {
            sections: [
              {
                id: 'summary',
                title: 'エグゼクティブサマリー',
                type: 'summary',
                dataSource: 'risk_summary',
                config: { includeRecommendations: true },
                order: 1
              },
              {
                id: 'risk_table',
                title: 'リスク詳細一覧',
                type: 'table',
                dataSource: 'dns_records',
                config: { 
                  columns: ['name', 'type', 'riskScore', 'issues'],
                  sortBy: 'riskScore',
                  sortOrder: 'desc'
                },
                order: 2
              },
              {
                id: 'risk_chart',
                title: 'リスクスコア分布',
                type: 'chart',
                dataSource: 'risk_distribution',
                config: { chartType: 'bar' },
                order: 3
              }
            ],
            filters: [
              {
                field: 'riskScore',
                operator: 'greater_than',
                value: 0,
                label: 'リスクスコア'
              }
            ],
            charts: [
              {
                type: 'bar',
                dataSource: 'risk_distribution',
                xAxis: 'riskLevel',
                yAxis: 'count',
                aggregation: 'count'
              }
            ],
            exportFormats: ['pdf', 'excel', 'csv']
          },
          isBuiltIn: true,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'performance_analysis',
          name: 'DNS パフォーマンス分析',
          description: 'DNS解決時間、応答率、地域別パフォーマンスの詳細分析',
          type: 'performance',
          category: 'performance',
          config: {
            sections: [
              {
                id: 'perf_summary',
                title: 'パフォーマンス概要',
                type: 'metrics',
                dataSource: 'performance_metrics',
                config: {},
                order: 1
              },
              {
                id: 'response_time_chart',
                title: '応答時間トレンド',
                type: 'chart',
                dataSource: 'response_times',
                config: { chartType: 'line' },
                order: 2
              }
            ],
            filters: [],
            charts: [
              {
                type: 'line',
                dataSource: 'response_times',
                xAxis: 'timestamp',
                yAxis: 'responseTime',
                aggregation: 'avg'
              }
            ],
            exportFormats: ['pdf', 'excel']
          },
          isBuiltIn: true,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'compliance_audit',
          name: 'コンプライアンス監査レポート',
          description: 'セキュリティ基準、業界標準への準拠状況を評価',
          type: 'compliance',
          category: 'compliance',
          config: {
            sections: [
              {
                id: 'compliance_summary',
                title: '準拠状況サマリー',
                type: 'summary',
                dataSource: 'compliance_status',
                config: {},
                order: 1
              },
              {
                id: 'violations_table',
                title: '違反項目一覧',
                type: 'table',
                dataSource: 'compliance_violations',
                config: { 
                  columns: ['standard', 'rule', 'severity', 'status'],
                  groupBy: 'standard'
                },
                order: 2
              }
            ],
            filters: [
              {
                field: 'severity',
                operator: 'in',
                value: ['high', 'medium'],
                label: '重要度'
              }
            ],
            charts: [],
            exportFormats: ['pdf', 'excel', 'csv']
          },
          isBuiltIn: true,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ];
      return Promise.resolve(mockTemplates);
    }
  });

  // 生成済みレポート一覧の取得
  const { data: generatedReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['generatedReports'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockReports: GeneratedReport[] = [
        {
          id: 'report_1',
          templateId: 'risk_analysis_standard',
          templateName: 'DNSリスク分析レポート',
          title: '2025年7月度 DNSリスク分析',
          description: '月次定期レポート',
          status: 'completed',
          progress: 100,
          generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          generatedBy: 'admin@example.com',
          config: {
            dateRange: {
              from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              to: new Date()
            },
            filters: {},
            format: 'pdf'
          },
          results: {
            totalPages: 24,
            totalRecords: 1250,
            fileSize: 2.8 * 1024 * 1024,
            downloadUrl: '/api/reports/report_1/download'
          }
        },
        {
          id: 'report_2',
          templateId: 'performance_analysis',
          templateName: 'DNS パフォーマンス分析',
          title: 'パフォーマンス週次レビュー',
          status: 'generating',
          progress: 65,
          generatedBy: 'admin@example.com',
          config: {
            dateRange: {
              from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              to: new Date()
            },
            filters: {},
            format: 'excel'
          }
        },
        {
          id: 'report_3',
          templateId: 'compliance_audit',
          templateName: 'コンプライアンス監査レポート',
          title: 'Q3コンプライアンス監査',
          status: 'scheduled',
          progress: 0,
          generatedBy: 'admin@example.com',
          scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          config: {
            dateRange: {
              from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
              to: new Date()
            },
            filters: {},
            format: 'pdf'
          },
          isRecurring: true,
          recurringPattern: {
            frequency: 'monthly',
            interval: 3,
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        }
      ];
      return Promise.resolve(mockReports);
    },
    refetchInterval: 5000 // 5秒ごとに更新（進行中レポートの状況確認）
  });

  // レポートメトリクスの取得
  const { data: metrics } = useQuery({
    queryKey: ['reportMetrics'],
    queryFn: () => {
      // TODO: 実際のAPI実装
      const mockMetrics: ReportMetrics = {
        totalReports: 47,
        reportsToday: 3,
        reportsThisWeek: 12,
        reportsThisMonth: 25,
        avgGenerationTime: 45.2,
        mostUsedTemplate: 'DNSリスク分析レポート',
        totalExports: 156,
        storageUsed: 245.8 * 1024 * 1024
      };
      return Promise.resolve(mockMetrics);
    }
  });

  // レポート生成
  const generateReportMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      config: typeof generationConfig;
      title: string;
      description?: string;
      isRecurring?: boolean;
      recurringPattern?: any;
    }) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { reportId: `report_${Date.now()}` };
    },
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'レポート生成を開始しました',
        message: `レポートID: ${data.reportId}`,
        autoClose: true,
        duration: 5000
      });
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      setShowGenerateDialog(false);
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'レポート生成に失敗しました',
        message: error.message || 'レポートの生成中にエラーが発生しました',
        autoClose: true,
        duration: 5000
      });
    }
  });

  // レポート削除
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      // TODO: 実際のAPI実装
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'レポートを削除しました',
        autoClose: true,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case 'generating':
        return <ClockIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />;
      case 'scheduled':
        return <CalendarIcon className="w-5 h-5 text-warning-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'generating':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'scheduled':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    return '1時間以内';
  };

  const handleGenerateReport = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowGenerateDialog(true);
  };

  const handleDownloadReport = (report: GeneratedReport) => {
    if (report.results?.downloadUrl) {
      // TODO: 実際のダウンロード実装
      addNotification({
        type: 'info',
        title: 'ダウンロードを開始しました',
        message: `${report.title} (${report.config.format.toUpperCase()})`,
        autoClose: true,
        duration: 3000
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            レポート管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNS分析レポートの生成・管理・エクスポート
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setShowTemplateDialog(true)}
            variant="secondary"
          >
            テンプレート作成
          </Button>
          <Button
            icon={<DocumentTextIcon className="w-4 h-4" />}
            onClick={() => setShowGenerateDialog(true)}
          >
            レポート生成
          </Button>
        </div>
      </div>

      {/* メトリクス概要 */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                  <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    総レポート数
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.totalReports}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 dark:bg-green-900/50 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    今月の生成数
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.reportsThisMonth}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    平均生成時間
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.avgGenerationTime.toFixed(1)}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                  <ArrowDownTrayIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ストレージ使用量
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatFileSize(metrics.storageUsed)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'generated', label: '生成済みレポート', icon: DocumentTextIcon },
            { key: 'templates', label: 'テンプレート', icon: Cog6ToothIcon },
            { key: 'scheduled', label: 'スケジュール', icon: CalendarIcon }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'generated' && (
        <div className="space-y-4">
          {reportsLoading ? (
            <div className="text-center py-12">
              <LoadingSpinner text="レポートを読み込み中..." />
            </div>
          ) : generatedReports && generatedReports.length > 0 ? (
            generatedReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(report.status)}
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {report.title}
                        </h3>
                        <span className={cn(
                          'text-xs px-2 py-1 rounded border font-medium',
                          getStatusColor(report.status)
                        )}>
                          {report.status === 'completed' ? '完了' :
                           report.status === 'generating' ? '生成中' :
                           report.status === 'failed' ? '失敗' : 'スケジュール済み'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        テンプレート: {report.templateName}
                      </p>
                      
                      {report.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {report.description}
                        </p>
                      )}

                      {/* 進捗バー（生成中の場合） */}
                      {report.status === 'generating' && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">
                              生成進捗
                            </span>
                            <span className="font-medium">{report.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${report.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* レポート詳細（完了の場合） */}
                      {report.status === 'completed' && report.results && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">ページ数</p>
                            <p className="font-medium">{report.results.totalPages}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">レコード数</p>
                            <p className="font-medium">{report.results.totalRecords.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">ファイルサイズ</p>
                            <p className="font-medium">{formatFileSize(report.results.fileSize)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">形式</p>
                            <p className="font-medium">{report.config.format.toUpperCase()}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {report.generatedAt 
                            ? `生成日: ${formatTimeAgo(report.generatedAt)}`
                            : report.scheduledFor
                            ? `予定日: ${report.scheduledFor.toLocaleDateString()}`
                            : '処理中'
                          }
                        </span>
                        <span>作成者: {report.generatedBy}</span>
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center space-x-2 ml-4">
                      {report.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            icon={<EyeIcon className="w-4 h-4" />}
                            variant="secondary"
                          >
                            プレビュー
                          </Button>
                          <Button
                            size="sm"
                            icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                            onClick={() => handleDownloadReport(report)}
                            variant="secondary"
                          >
                            ダウンロード
                          </Button>
                          <Button
                            size="sm"
                            icon={<ShareIcon className="w-4 h-4" />}
                            variant="secondary"
                          >
                            共有
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={() => deleteReportMutation.mutate(report.id)}
                        loading={deleteReportMutation.isPending}
                        variant="danger"
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                生成済みレポートがありません
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templatesLoading ? (
            <div className="col-span-2 text-center py-12">
              <LoadingSpinner text="テンプレートを読み込み中..." />
            </div>
          ) : (
            templates?.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>タイプ: {template.type}</span>
                        <span>カテゴリ: {template.category}</span>
                        {template.isBuiltIn && (
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded">
                            標準
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                      onClick={() => handleGenerateReport(template.id)}
                    >
                      レポート生成
                    </Button>
                    <Button
                      size="sm"
                      icon={<EyeIcon className="w-4 h-4" />}
                      variant="secondary"
                    >
                      詳細
                    </Button>
                    {!template.isBuiltIn && (
                      <Button
                        size="sm"
                        icon={<Cog6ToothIcon className="w-4 h-4" />}
                        variant="secondary"
                      >
                        編集
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  スケジュール機能は実装予定です
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* レポート生成ダイアログ */}
      {showGenerateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                レポート生成
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    テンプレート
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">テンプレートを選択してください</option>
                    {templates?.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    レポートタイトル
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="レポートのタイトルを入力"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      開始日
                    </label>
                    <input
                      type="date"
                      value={generationConfig.dateRange.from.toISOString().split('T')[0]}
                      onChange={(e) => setGenerationConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: new Date(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      終了日
                    </label>
                    <input
                      type="date"
                      value={generationConfig.dateRange.to.toISOString().split('T')[0]}
                      onChange={(e) => setGenerationConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: new Date(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    出力形式
                  </label>
                  <select
                    value={generationConfig.format}
                    onChange={(e) => setGenerationConfig(prev => ({
                      ...prev,
                      format: e.target.value as any
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowGenerateDialog(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    if (selectedTemplate) {
                      generateReportMutation.mutate({
                        templateId: selectedTemplate,
                        config: generationConfig,
                        title: `レポート_${new Date().toLocaleDateString()}`
                      });
                    }
                  }}
                  loading={generateReportMutation.isPending}
                  disabled={!selectedTemplate}
                >
                  生成開始
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};