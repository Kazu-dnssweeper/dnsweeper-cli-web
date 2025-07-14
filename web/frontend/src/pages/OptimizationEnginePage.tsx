/**
 * DNSweeper パフォーマンス最適化エンジンページ
 * 自動化されたパフォーマンス分析・最適化・実装システムの統合インターフェース
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { OptimizationEngine } from '../components/Performance/OptimizationEngine';
import { useNotifications } from '../components/UI/Notification';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import {
  RocketLaunchIcon,
  CpuChipIcon,
  ChartBarIcon,
  CogIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface OptimizationAPI {
  getOptimizationRules: () => Promise<any>;
  getOptimizationJobs: () => Promise<any>;
  getPerformanceMetrics: () => Promise<any>;
  executeOptimization: (ruleId: string) => Promise<any>;
  updateOptimizationRule: (ruleId: string, updates: any) => Promise<any>;
}

// API関数
const optimizationAPI: OptimizationAPI = {
  getOptimizationRules: async () => {
    const response = await fetch('/api/optimization/rules');
    if (!response.ok) throw new Error('最適化ルールの取得に失敗しました');
    return response.json();
  },

  getOptimizationJobs: async () => {
    const response = await fetch('/api/optimization/jobs');
    if (!response.ok) throw new Error('最適化ジョブの取得に失敗しました');
    return response.json();
  },

  getPerformanceMetrics: async () => {
    const response = await fetch('/api/optimization/metrics');
    if (!response.ok) throw new Error('パフォーマンスメトリクスの取得に失敗しました');
    return response.json();
  },

  executeOptimization: async (ruleId: string) => {
    const response = await fetch(`/api/optimization/execute/${ruleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('最適化の実行に失敗しました');
    return response.json();
  },

  updateOptimizationRule: async (ruleId: string, updates: any) => {
    const response = await fetch(`/api/optimization/rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('最適化ルールの更新に失敗しました');
    return response.json();
  }
};

export const OptimizationEnginePage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'engine' | 'analytics' | 'settings'>('engine');
  const [isAutoOptimization, setIsAutoOptimization] = useState(false);
  const { addNotification } = useNotifications();

  // パフォーマンスメトリクスの取得
  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: optimizationAPI.getPerformanceMetrics,
    refetchInterval: 10000 // 10秒ごとに更新
  });

  // 最適化ルールの取得
  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['optimization-rules'],
    queryFn: optimizationAPI.getOptimizationRules,
    refetchInterval: 30000 // 30秒ごとに更新
  });

  // 最適化ジョブの取得
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['optimization-jobs'],
    queryFn: optimizationAPI.getOptimizationJobs,
    refetchInterval: 5000 // 5秒ごとに更新
  });

  // 最適化実行のmutation
  const executeMutation = useMutation({
    mutationFn: optimizationAPI.executeOptimization,
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: '最適化実行開始',
        message: `最適化ジョブ ${data.jobId} を開始しました`,
        autoClose: true
      });
      refetchJobs();
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: '最適化実行エラー',
        message: (error as Error).message,
        autoClose: false
      });
    }
  });

  // ルール更新のmutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: any }) => 
      optimizationAPI.updateOptimizationRule(ruleId, updates),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'ルール更新完了',
        message: '最適化ルールを更新しました',
        autoClose: true
      });
      refetchRules();
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'ルール更新エラー',
        message: (error as Error).message,
        autoClose: false
      });
    }
  });

  // 最適化開始ハンドラー
  const handleOptimizationStart = (ruleId: string) => {
    executeMutation.mutate(ruleId);
  };

  // 最適化完了ハンドラー
  const handleOptimizationComplete = (jobId: string, result: any) => {
    addNotification({
      type: 'success',
      title: '最適化完了',
      message: `ジョブ ${jobId} が正常に完了しました`,
      autoClose: true
    });
    refetchMetrics();
    refetchJobs();
  };

  // ルール更新ハンドラー
  const handleRuleUpdate = (rule: any) => {
    updateRuleMutation.mutate({ ruleId: rule.id, updates: rule });
  };

  // 自動最適化切り替え
  const handleAutoOptimizationToggle = () => {
    setIsAutoOptimization(!isAutoOptimization);
    addNotification({
      type: 'info',
      title: '自動最適化設定変更',
      message: `自動最適化を${!isAutoOptimization ? '有効' : '無効'}にしました`,
      autoClose: true
    });
  };

  // ダミーメトリクスの生成（実際の実装ではAPIから取得）
  const generateMockMetrics = () => ({
    responseTime: 45.2 + Math.random() * 10,
    throughput: 1200 + Math.random() * 200,
    errorRate: 2.1 + Math.random() * 2,
    cacheHitRate: 85 + Math.random() * 10,
    cpuUsage: 65 + Math.random() * 20,
    memoryUsage: 70 + Math.random() * 15,
    diskUsage: 45 + Math.random() * 20,
    networkLatency: 15 + Math.random() * 10,
    cost: 1000 + Math.random() * 200,
    uptime: 99.5 + Math.random() * 0.5
  });

  const currentMetrics = metricsData?.metrics || generateMockMetrics();

  if (metricsLoading || rulesLoading || jobsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="最適化エンジンを読み込み中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ページヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RocketLaunchIcon className="w-8 h-8 text-blue-600" />
              パフォーマンス最適化エンジン
            </h1>
            <p className="text-gray-600 mt-2">自動化されたパフォーマンス分析・最適化・実装システム</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* エンジン状態表示 */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isAutoOptimization ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isAutoOptimization ? '自動最適化有効' : '自動最適化無効'}
              </span>
            </div>
            
            {/* 自動最適化切り替え */}
            <button
              onClick={handleAutoOptimizationToggle}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isAutoOptimization 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BoltIcon className="w-4 h-4" />
              {isAutoOptimization ? '自動最適化停止' : '自動最適化開始'}
            </button>
            
            {/* モード切替 */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { key: 'engine', label: '最適化エンジン', icon: RocketLaunchIcon },
                { key: 'analytics', label: 'アナリティクス', icon: ChartBarIcon },
                { key: 'settings', label: '設定', icon: CogIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveMode(key as any)}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    activeMode === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* システム概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">最適化ルール</p>
              <p className="text-2xl font-bold text-blue-600">
                {rulesData?.rules?.length || 0}
              </p>
            </div>
            <CogIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">実行中ジョブ</p>
              <p className="text-2xl font-bold text-orange-600">
                {jobsData?.activeJobs?.length || 0}
              </p>
            </div>
            <CpuChipIcon className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">完了ジョブ</p>
              <p className="text-2xl font-bold text-green-600">
                {jobsData?.completedJobs?.length || 0}
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">成功率</p>
              <p className="text-2xl font-bold text-purple-600">
                {jobsData?.metadata?.successRate ? `${jobsData.metadata.successRate.toFixed(1)}%` : '0%'}
              </p>
            </div>
            <RocketLaunchIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      {activeMode === 'engine' && (
        <OptimizationEngine
          currentMetrics={currentMetrics}
          onOptimizationStart={handleOptimizationStart}
          onOptimizationComplete={handleOptimizationComplete}
          autoOptimization={isAutoOptimization}
          onRuleUpdate={handleRuleUpdate}
        />
      )}

      {activeMode === 'analytics' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最適化分析</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">パフォーマンス傾向</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">応答時間</span>
                  <span className="font-medium">{currentMetrics.responseTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">スループット</span>
                  <span className="font-medium">{currentMetrics.throughput.toFixed(0)} req/s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">エラー率</span>
                  <span className="font-medium">{currentMetrics.errorRate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">キャッシュヒット率</span>
                  <span className="font-medium">{currentMetrics.cacheHitRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">リソース使用状況</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CPU使用率</span>
                  <span className="font-medium">{currentMetrics.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">メモリ使用率</span>
                  <span className="font-medium">{currentMetrics.memoryUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ディスク使用率</span>
                  <span className="font-medium">{currentMetrics.diskUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">月間コスト</span>
                  <span className="font-medium">¥{currentMetrics.cost.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMode === 'settings' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最適化エンジン設定</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自動最適化間隔
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="30s">30秒</option>
                <option value="1m">1分</option>
                <option value="5m">5分</option>
                <option value="15m">15分</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最適化閾値設定
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">応答時間 (ms)</label>
                  <input type="number" defaultValue="100" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">エラー率 (%)</label>
                  <input type="number" defaultValue="5" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">自動リスク評価を有効にする</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">最適化前のバックアップを作成する</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-700">高リスク操作に手動承認を要求する</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationEnginePage;