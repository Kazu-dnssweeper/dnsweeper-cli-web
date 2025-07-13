import React, { useState } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ExportDialog } from '../components/Export/ExportDialog';
import { cn } from '../utils/cn';
import type { DnsRecord } from '../types';

export const Analysis: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'domain' | 'risk' | 'lastUpdated'>('risk');
  const [showExportDialog, setShowExportDialog] = useState(false);

  // サンプルデータ（実際の実装では状態管理やAPIから取得）
  const records: DnsRecord[] = [
    {
      id: '1',
      domain: 'app.example.com',
      type: 'A',
      value: '192.168.1.100',
      ttl: 3600,
      lastUpdated: new Date('2025-07-13T10:30:00Z'),
      riskScore: 8.5
    },
    {
      id: '2',
      domain: 'api.example.com', 
      type: 'CNAME',
      value: 'api-lb.example.com',
      ttl: 300,
      lastUpdated: new Date('2025-07-13T14:15:00Z'),
      riskScore: 3.2
    },
    {
      id: '3',
      domain: 'old-service.example.com',
      type: 'A',
      value: '10.0.0.1',
      ttl: 86400,
      lastUpdated: new Date('2025-06-15T09:00:00Z'),
      riskScore: 9.1
    },
    {
      id: '4',
      domain: 'www.example.com',
      type: 'A',
      value: '203.0.113.10',
      ttl: 3600,
      lastUpdated: new Date('2025-07-13T16:45:00Z'),
      riskScore: 2.1
    },
    {
      id: '5',
      domain: 'mail.example.com',
      type: 'MX',
      value: '10 mail1.example.com',
      ttl: 7200,
      lastUpdated: new Date('2025-07-12T11:20:00Z'),
      riskScore: 6.7
    }
  ];

  const getRiskLevel = (score: number) => {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-error-600 bg-error-50 border-error-200';
      case 'medium': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'low': return 'text-success-600 bg-success-50 border-success-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredRecords = records
    .filter(record => {
      const matchesSearch = record.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.value.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || getRiskLevel(record.riskScore!) === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'domain':
          return a.domain.localeCompare(b.domain);
        case 'risk':
          return (b.riskScore || 0) - (a.riskScore || 0);
        case 'lastUpdated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        default:
          return 0;
      }
    });

  const stats = {
    total: records.length,
    high: records.filter(r => getRiskLevel(r.riskScore!) === 'high').length,
    medium: records.filter(r => getRiskLevel(r.riskScore!) === 'medium').length,
    low: records.filter(r => getRiskLevel(r.riskScore!) === 'low').length
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTTL = (ttl: number) => {
    if (ttl >= 86400) return `${Math.floor(ttl / 86400)}日`;
    if (ttl >= 3600) return `${Math.floor(ttl / 3600)}時間`;
    if (ttl >= 60) return `${Math.floor(ttl / 60)}分`;
    return `${ttl}秒`;
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            分析結果
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            DNS レコードの詳細分析とリスク評価
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            icon={<ArrowDownTrayIcon className="w-4 h-4" />}
            onClick={() => setShowExportDialog(true)}
          >
            エクスポート
          </Button>
          <Button icon={<GlobeAltIcon className="w-4 h-4" />}>
            新規スキャン
          </Button>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">総数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <GlobeAltIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">高リスク</p>
                <p className="text-2xl font-bold text-error-600">
                  {stats.high}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-error-600" />
            </div>
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">中リスク</p>
                <p className="text-2xl font-bold text-warning-600">
                  {stats.medium}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-warning-600" />
            </div>
          </CardContent>
        </Card>

        <Card padding="sm">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">低リスク</p>
                <p className="text-2xl font-bold text-success-600">
                  {stats.low}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-success-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター・検索 */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* 検索 */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ドメインまたはIPアドレスで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "placeholder-gray-500 dark:placeholder-gray-400",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              />
            </div>

            {/* リスクレベルフィルター */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className={cn(
                  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              >
                <option value="all">すべてのリスク</option>
                <option value="high">高リスク</option>
                <option value="medium">中リスク</option>
                <option value="low">低リスク</option>
              </select>
            </div>

            {/* ソート */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={cn(
                  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              >
                <option value="risk">リスクスコア順</option>
                <option value="domain">ドメイン名順</option>
                <option value="lastUpdated">更新日時順</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* レコード一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>
            DNS レコード ({filteredRecords.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              const riskLevel = getRiskLevel(record.riskScore!);
              const riskColor = getRiskColor(riskLevel);
              
              return (
                <div 
                  key={record.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {record.domain}
                        </h3>
                        <span className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {record.type}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded border font-medium",
                          riskColor
                        )}>
                          リスク: {record.riskScore?.toFixed(1)}/10
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">値: </span>
                          <span className="font-mono text-gray-900 dark:text-white">
                            {record.value}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">TTL: </span>
                          <span className="text-gray-900 dark:text-white">
                            {formatTTL(record.ttl)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">更新: </span>
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(record.lastUpdated)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        詳細
                      </Button>
                      <Button variant="secondary" size="sm">
                        編集
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                条件に一致するレコードが見つかりません
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* エクスポートダイアログ */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        defaultType="dns_records"
        defaultFilter={{
          domain: searchTerm || undefined,
          recordType: filterType !== 'all' ? undefined : undefined,
          riskLevel: filterType !== 'all' ? filterType : undefined
        }}
        title="分析結果のエクスポート"
      />
    </div>
  );
};