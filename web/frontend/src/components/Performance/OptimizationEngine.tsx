/**
 * DNSweeper パフォーマンス最適化エンジン
 * 自動化されたパフォーマンス分析・最適化・実装システム
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CpuChipIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BoltIcon,
  ShieldCheckIcon,
  CloudIcon,
  ServerIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { MetricsChart } from '../Charts/MetricsChart';

interface OptimizationRule {
  id: string;
  name: string;
  category: 'performance' | 'cost' | 'reliability' | 'security';
  description: string;
  trigger: OptimizationTrigger;
  actions: OptimizationAction[];
  priority: number;
  enabled: boolean;
  autoApply: boolean;
  lastExecuted?: Date;
  successRate: number;
  estimatedImpact: {
    performance: number;
    cost: number;
    reliability: number;
  };
}

interface OptimizationTrigger {
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'trend_up' | 'trend_down';
  threshold: number;
  duration: number; // minutes
  cooldown: number; // minutes
}

interface OptimizationAction {
  id: string;
  type: 'config_change' | 'scaling' | 'cache_optimization' | 'dns_tuning' | 'monitoring';
  description: string;
  parameters: Record<string, any>;
  reversible: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  executionTime: number; // seconds
}

interface OptimizationJob {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  progress: number;
  actions: OptimizationJobAction[];
  metrics: {
    before: Record<string, number>;
    after?: Record<string, number>;
    improvement?: Record<string, number>;
  };
  logs: OptimizationLog[];
}

interface OptimizationJobAction {
  actionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

interface OptimizationLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  cost: number;
  uptime: number;
}

interface OptimizationEngineProps {
  currentMetrics?: PerformanceMetrics;
  onOptimizationStart?: (ruleId: string) => void;
  onOptimizationComplete?: (jobId: string, result: any) => void;
  autoOptimization?: boolean;
  onRuleUpdate?: (rule: OptimizationRule) => void;
}

export const OptimizationEngine: React.FC<OptimizationEngineProps> = ({
  currentMetrics,
  onOptimizationStart,
  onOptimizationComplete,
  autoOptimization = false,
  onRuleUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'jobs' | 'metrics'>('dashboard');
  const [isEngineRunning, setIsEngineRunning] = useState(autoOptimization);
  const [selectedJob, setSelectedJob] = useState<OptimizationJob | null>(null);
  const [optimizationRules, setOptimizationRules] = useState<OptimizationRule[]>([]);
  const [activeJobs, setActiveJobs] = useState<OptimizationJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<OptimizationJob[]>([]);

  // デフォルトの最適化ルール
  useEffect(() => {
    const defaultRules: OptimizationRule[] = [
      {
        id: 'dns_cache_optimization',
        name: 'DNS キャッシュ最適化',
        category: 'performance',
        description: 'キャッシュヒット率が低い場合にTTL値とキャッシュサイズを最適化',
        trigger: {
          metric: 'cache_hit_rate',
          condition: 'less_than',
          threshold: 80,
          duration: 10,
          cooldown: 60
        },
        actions: [
          {
            id: 'adjust_ttl',
            type: 'dns_tuning',
            description: 'TTL値を最適化（現在値の1.5倍に調整）',
            parameters: { multiplier: 1.5, min_ttl: 300, max_ttl: 3600 },
            reversible: true,
            riskLevel: 'low',
            executionTime: 30
          },
          {
            id: 'expand_cache',
            type: 'config_change',
            description: 'キャッシュサイズを20%拡張',
            parameters: { expansion_ratio: 1.2, max_memory_limit: '2GB' },
            reversible: true,
            riskLevel: 'medium',
            executionTime: 60
          }
        ],
        priority: 85,
        enabled: true,
        autoApply: true,
        successRate: 92,
        estimatedImpact: {
          performance: 25,
          cost: -5,
          reliability: 10
        }
      },
      {
        id: 'response_time_optimization',
        name: '応答時間最適化',
        category: 'performance',
        description: '応答時間が閾値を超えた場合の自動最適化',
        trigger: {
          metric: 'response_time',
          condition: 'greater_than',
          threshold: 100,
          duration: 5,
          cooldown: 30
        },
        actions: [
          {
            id: 'enable_compression',
            type: 'config_change',
            description: 'レスポンス圧縮を有効化',
            parameters: { compression_level: 6, min_size: 1024 },
            reversible: true,
            riskLevel: 'low',
            executionTime: 15
          },
          {
            id: 'optimize_dns_servers',
            type: 'dns_tuning',
            description: 'DNS サーバー優先順位を最適化',
            parameters: { latency_based_routing: true, health_check_interval: 30 },
            reversible: true,
            riskLevel: 'medium',
            executionTime: 45
          }
        ],
        priority: 90,
        enabled: true,
        autoApply: false, // 手動承認が必要
        successRate: 88,
        estimatedImpact: {
          performance: 35,
          cost: 5,
          reliability: 15
        }
      },
      {
        id: 'cost_optimization',
        name: 'コスト最適化',
        category: 'cost',
        description: 'リソース使用量とコストを最適化',
        trigger: {
          metric: 'cost',
          condition: 'trend_up',
          threshold: 10, // 10%増加
          duration: 60,
          cooldown: 1440 // 24時間
        },
        actions: [
          {
            id: 'right_size_instances',
            type: 'scaling',
            description: 'インスタンスサイズを需要に合わせて調整',
            parameters: { target_utilization: 75, min_instances: 2, max_instances: 10 },
            reversible: true,
            riskLevel: 'high',
            executionTime: 300
          },
          {
            id: 'optimize_storage',
            type: 'config_change',
            description: 'ストレージタイプと保持期間を最適化',
            parameters: { tier_to_cold_storage: 30, delete_after: 90 },
            reversible: false,
            riskLevel: 'medium',
            executionTime: 120
          }
        ],
        priority: 70,
        enabled: true,
        autoApply: false,
        successRate: 85,
        estimatedImpact: {
          performance: -5,
          cost: -30,
          reliability: 0
        }
      },
      {
        id: 'reliability_optimization',
        name: '信頼性最適化',
        category: 'reliability',
        description: 'エラー率とダウンタイムを最小化',
        trigger: {
          metric: 'error_rate',
          condition: 'greater_than',
          threshold: 5,
          duration: 3,
          cooldown: 15
        },
        actions: [
          {
            id: 'enable_failover',
            type: 'config_change',
            description: '自動フェイルオーバーを有効化',
            parameters: { health_check_timeout: 5, retry_attempts: 3 },
            reversible: false,
            riskLevel: 'low',
            executionTime: 30
          },
          {
            id: 'circuit_breaker',
            type: 'monitoring',
            description: 'サーキットブレーカーパターンを適用',
            parameters: { failure_threshold: 5, timeout: 60, half_open_max_calls: 10 },
            reversible: true,
            riskLevel: 'medium',
            executionTime: 45
          }
        ],
        priority: 95,
        enabled: true,
        autoApply: true,
        successRate: 94,
        estimatedImpact: {
          performance: 10,
          cost: 10,
          reliability: 40
        }
      }
    ];
    
    setOptimizationRules(defaultRules);
  }, []);

  // 最適化エンジンの実行状態管理
  useEffect(() => {
    if (isEngineRunning && currentMetrics) {
      const interval = setInterval(() => {
        checkOptimizationTriggers();
      }, 30000); // 30秒ごとにチェック
      
      return () => clearInterval(interval);
    }
  }, [isEngineRunning, currentMetrics, optimizationRules]);

  const checkOptimizationTriggers = () => {
    if (!currentMetrics) return;

    optimizationRules.forEach(rule => {
      if (!rule.enabled) return;
      
      const metricValue = currentMetrics[rule.trigger.metric as keyof PerformanceMetrics];
      const shouldTrigger = evaluateTrigger(rule.trigger, metricValue);
      
      if (shouldTrigger && canExecuteRule(rule)) {
        if (rule.autoApply) {
          executeOptimization(rule);
        } else {
          // 手動承認が必要な場合のアラート
          console.log(`最適化提案: ${rule.name} の実行を推奨します`);
        }
      }
    });
  };

  const evaluateTrigger = (trigger: OptimizationTrigger, value: number): boolean => {
    switch (trigger.condition) {
      case 'greater_than':
        return value > trigger.threshold;
      case 'less_than':
        return value < trigger.threshold;
      case 'equals':
        return Math.abs(value - trigger.threshold) < 0.01;
      case 'trend_up':
        // 実際の実装では時系列データから傾向を分析
        return value > trigger.threshold;
      case 'trend_down':
        return value < trigger.threshold;
      default:
        return false;
    }
  };

  const canExecuteRule = (rule: OptimizationRule): boolean => {
    if (!rule.lastExecuted) return true;
    
    const cooldownMs = rule.trigger.cooldown * 60 * 1000;
    const timeSinceLastExecution = Date.now() - rule.lastExecuted.getTime();
    
    return timeSinceLastExecution > cooldownMs;
  };

  const executeOptimization = (rule: OptimizationRule) => {
    const job: OptimizationJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'pending',
      startTime: new Date(),
      progress: 0,
      actions: rule.actions.map(action => ({
        actionId: action.id,
        status: 'pending'
      })),
      metrics: {
        before: currentMetrics ? { ...currentMetrics } : {}
      },
      logs: [{
        timestamp: new Date(),
        level: 'info',
        message: `最適化ジョブ開始: ${rule.name}`
      }]
    };

    setActiveJobs(prev => [...prev, job]);
    
    if (onOptimizationStart) {
      onOptimizationStart(rule.id);
    }

    // 実際の実装では非同期で最適化を実行
    simulateOptimizationExecution(job, rule);
  };

  const simulateOptimizationExecution = async (job: OptimizationJob, rule: OptimizationRule) => {
    try {
      // ジョブ開始
      setActiveJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'running' } : j
      ));

      // アクションを順次実行
      for (let i = 0; i < rule.actions.length; i++) {
        const action = rule.actions[i];
        
        // アクション開始
        setActiveJobs(prev => prev.map(j => {
          if (j.id === job.id) {
            const updatedActions = [...j.actions];
            updatedActions[i] = {
              ...updatedActions[i],
              status: 'running',
              startTime: new Date()
            };
            return {
              ...j,
              actions: updatedActions,
              progress: (i / rule.actions.length) * 100,
              logs: [...j.logs, {
                timestamp: new Date(),
                level: 'info',
                message: `アクション実行中: ${action.description}`
              }]
            };
          }
          return j;
        }));

        // アクション実行のシミュレーション
        await new Promise(resolve => setTimeout(resolve, action.executionTime * 100));

        // アクション完了
        setActiveJobs(prev => prev.map(j => {
          if (j.id === job.id) {
            const updatedActions = [...j.actions];
            updatedActions[i] = {
              ...updatedActions[i],
              status: 'completed',
              endTime: new Date(),
              result: 'Success'
            };
            return {
              ...j,
              actions: updatedActions,
              logs: [...j.logs, {
                timestamp: new Date(),
                level: 'success',
                message: `アクション完了: ${action.description}`
              }]
            };
          }
          return j;
        }));
      }

      // ジョブ完了
      const completedJob = {
        ...job,
        status: 'completed' as const,
        endTime: new Date(),
        progress: 100,
        metrics: {
          ...job.metrics,
          after: generateOptimizedMetrics(currentMetrics, rule),
          improvement: calculateImprovement(currentMetrics, rule)
        }
      };

      setActiveJobs(prev => prev.filter(j => j.id !== job.id));
      setCompletedJobs(prev => [completedJob, ...prev]);

      // ルールの最終実行時刻を更新
      setOptimizationRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, lastExecuted: new Date() } : r
      ));

      if (onOptimizationComplete) {
        onOptimizationComplete(job.id, completedJob);
      }

    } catch (error) {
      // エラー処理
      setActiveJobs(prev => prev.map(j => 
        j.id === job.id ? {
          ...j,
          status: 'failed',
          endTime: new Date(),
          logs: [...j.logs, {
            timestamp: new Date(),
            level: 'error',
            message: `最適化失敗: ${(error as Error).message}`
          }]
        } : j
      ));
    }
  };

  const generateOptimizedMetrics = (current: PerformanceMetrics | undefined, rule: OptimizationRule): Record<string, number> => {
    if (!current) return {};
    
    const optimized = { ...current };
    
    // ルールのカテゴリに基づいて改善をシミュレート
    switch (rule.category) {
      case 'performance':
        optimized.responseTime *= (1 - rule.estimatedImpact.performance / 100);
        optimized.throughput *= (1 + rule.estimatedImpact.performance / 200);
        break;
      case 'cost':
        optimized.cost *= (1 + rule.estimatedImpact.cost / 100);
        break;
      case 'reliability':
        optimized.errorRate *= (1 - rule.estimatedImpact.reliability / 100);
        optimized.uptime = Math.min(99.99, optimized.uptime + rule.estimatedImpact.reliability / 100);
        break;
    }
    
    return optimized;
  };

  const calculateImprovement = (current: PerformanceMetrics | undefined, rule: OptimizationRule): Record<string, number> => {
    if (!current) return {};
    
    return {
      performance: rule.estimatedImpact.performance,
      cost: rule.estimatedImpact.cost,
      reliability: rule.estimatedImpact.reliability
    };
  };

  const toggleEngine = () => {
    setIsEngineRunning(!isEngineRunning);
  };

  const toggleRule = (ruleId: string) => {
    setOptimizationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const manualOptimization = (ruleId: string) => {
    const rule = optimizationRules.find(r => r.id === ruleId);
    if (rule) {
      executeOptimization(rule);
    }
  };

  // メトリクス計算
  const engineStats = useMemo(() => {
    const totalRules = optimizationRules.length;
    const enabledRules = optimizationRules.filter(r => r.enabled).length;
    const runningJobs = activeJobs.length;
    const totalJobs = completedJobs.length + activeJobs.length;
    const successfulJobs = completedJobs.filter(j => j.status === 'completed').length;
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

    return {
      totalRules,
      enabledRules,
      runningJobs,
      successRate
    };
  }, [optimizationRules, activeJobs, completedJobs]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <RocketLaunchIcon className="w-8 h-8 text-blue-600" />
              パフォーマンス最適化エンジン
            </h2>
            <p className="text-gray-600 mt-1">自動化されたパフォーマンス分析・最適化・実装システム</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* エンジン状態 */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isEngineRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isEngineRunning ? '自動最適化実行中' : '自動最適化停止中'}
              </span>
            </div>
            
            {/* エンジン制御 */}
            <button
              onClick={toggleEngine}
              className={`p-3 rounded-lg flex items-center gap-2 ${
                isEngineRunning 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isEngineRunning ? (
                <>
                  <PauseIcon className="w-5 h-5" />
                  停止
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  開始
                </>
              )}
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="mt-6">
          <div className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'ダッシュボード', icon: ChartBarIcon },
              { key: 'rules', label: '最適化ルール', icon: CogIcon },
              { key: 'jobs', label: '実行ジョブ', icon: BoltIcon },
              { key: 'metrics', label: 'パフォーマンス', icon: ArrowTrendingUpIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`pb-2 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* エンジン統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">有効ルール</p>
              <p className="text-2xl font-bold text-blue-600">
                {engineStats.enabledRules}/{engineStats.totalRules}
              </p>
            </div>
            <CogIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">実行中ジョブ</p>
              <p className="text-2xl font-bold text-green-600">
                {engineStats.runningJobs}
              </p>
            </div>
            <BoltIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">成功率</p>
              <p className="text-2xl font-bold text-purple-600">
                {engineStats.successRate.toFixed(1)}%
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">エンジン状態</p>
              <p className={`text-2xl font-bold ${isEngineRunning ? 'text-green-600' : 'text-gray-600'}`}>
                {isEngineRunning ? 'ACTIVE' : 'IDLE'}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isEngineRunning ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <div className={`w-4 h-4 rounded-full ${
                isEngineRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* アクティブジョブ */}
          {activeJobs.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">実行中の最適化</h3>
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{job.ruleName}</h4>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">開始時刻:</span>
                        <span className="ml-2 font-medium">{job.startTime.toLocaleTimeString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">進捗:</span>
                        <span className="ml-2 font-medium">{job.progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 最近の完了ジョブ */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">最近の最適化結果</h3>
            {completedJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">まだ最適化ジョブが実行されていません</p>
            ) : (
              <div className="space-y-4">
                {completedJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{job.ruleName}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          job.status === 'completed' ? 'bg-green-100 text-green-700' :
                          job.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {job.endTime?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {job.metrics.improvement && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">パフォーマンス:</span>
                          <span className={`ml-2 font-medium ${
                            job.metrics.improvement.performance > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {job.metrics.improvement.performance > 0 ? '+' : ''}
                            {job.metrics.improvement.performance.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">コスト:</span>
                          <span className={`ml-2 font-medium ${
                            job.metrics.improvement.cost < 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {job.metrics.improvement.cost > 0 ? '+' : ''}
                            {job.metrics.improvement.cost.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">信頼性:</span>
                          <span className={`ml-2 font-medium ${
                            job.metrics.improvement.reliability > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {job.metrics.improvement.reliability > 0 ? '+' : ''}
                            {job.metrics.improvement.reliability.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最適化ルール</h3>
          <div className="space-y-4">
            {optimizationRules.map((rule) => (
              <div key={rule.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      rule.category === 'performance' ? 'bg-blue-100 text-blue-700' :
                      rule.category === 'cost' ? 'bg-green-100 text-green-700' :
                      rule.category === 'reliability' ? 'bg-purple-100 text-purple-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {rule.category}
                    </span>
                    <span className="text-sm text-gray-500">優先度: {rule.priority}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(rule.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">有効</span>
                    </label>
                    
                    <button
                      onClick={() => manualOptimization(rule.id)}
                      disabled={!rule.enabled}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      手動実行
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">トリガー:</span>
                    <span className="ml-2 font-medium">
                      {rule.trigger.metric} {rule.trigger.condition} {rule.trigger.threshold}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">成功率:</span>
                    <span className="ml-2 font-medium">{rule.successRate}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">アクション数:</span>
                    <span className="ml-2 font-medium">{rule.actions.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">自動実行:</span>
                    <span className={`ml-2 font-medium ${rule.autoApply ? 'text-green-600' : 'text-red-600'}`}>
                      {rule.autoApply ? '有効' : '無効'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* 実行中ジョブ */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">実行中ジョブ</h3>
            {activeJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">実行中のジョブはありません</p>
            ) : (
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{job.ruleName}</h4>
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        詳細
                      </button>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">ジョブID:</span>
                        <span className="ml-2 font-mono text-xs">{job.id.substr(0, 8)}...</span>
                      </div>
                      <div>
                        <span className="text-gray-600">開始時刻:</span>
                        <span className="ml-2 font-medium">{job.startTime.toLocaleTimeString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">進捗:</span>
                        <span className="ml-2 font-medium">{job.progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 完了ジョブ履歴 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ジョブ履歴</h3>
            <div className="space-y-3">
              {completedJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{job.ruleName}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        job.status === 'completed' ? 'bg-green-100 text-green-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {job.endTime?.toLocaleString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    詳細
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && currentMetrics && (
        <div className="space-y-6">
          {/* 現在のパフォーマンスメトリクス */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">現在のパフォーマンス</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(currentMetrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                    {key.includes('Rate') || key.includes('Usage') ? '%' : 
                     key.includes('Time') || key.includes('Latency') ? 'ms' :
                     key === 'cost' ? '$' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ジョブ詳細モーダル */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-semibold">ジョブ詳細: {selectedJob.ruleName}</h2>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* ジョブ情報 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">ジョブID:</span>
                    <p className="font-mono text-sm">{selectedJob.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">ステータス:</span>
                    <p className="font-medium">{selectedJob.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">開始時刻:</span>
                    <p className="font-medium">{selectedJob.startTime.toLocaleString()}</p>
                  </div>
                  {selectedJob.endTime && (
                    <div>
                      <span className="text-sm text-gray-600">終了時刻:</span>
                      <p className="font-medium">{selectedJob.endTime.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* アクション詳細 */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">実行アクション</h3>
                  <div className="space-y-2">
                    {selectedJob.actions.map((action, index) => (
                      <div key={action.actionId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">アクション {index + 1}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          action.status === 'completed' ? 'bg-green-100 text-green-700' :
                          action.status === 'running' ? 'bg-blue-100 text-blue-700' :
                          action.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {action.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ログ */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">実行ログ</h3>
                  <div className="bg-gray-900 text-white p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
                    {selectedJob.logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-400">{log.timestamp.toLocaleTimeString()}</span>
                        <span className={`ml-2 ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warning' ? 'text-yellow-400' :
                          log.level === 'success' ? 'text-green-400' :
                          'text-white'
                        }`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="ml-2">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationEngine;