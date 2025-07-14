/**
 * DNSweeper AI予測分析ページ
 * 機械学習ベースの予測・異常検知・最適化提案の統合インターフェース
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PredictiveAnalytics } from '../components/AI/PredictiveAnalytics';
import { AlertSystem } from '../components/Alerts/AlertSystem';
import { useNotifications } from '../components/UI/Notification';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import {
  BeakerIcon,
  CpuChipIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface AIAnalyticsAPI {
  predict: (data: any) => Promise<any>;
  detectAnomalies: (data: any) => Promise<any>;
  getOptimizations: (data: any) => Promise<any>;
  getModels: () => Promise<any>;
  retrainModel: (modelId: string) => Promise<any>;
}

// API関数
const aiAnalyticsAPI: AIAnalyticsAPI = {
  predict: async (data) => {
    const response = await fetch('/api/ai-analytics/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('予測分析に失敗しました');
    return response.json();
  },

  detectAnomalies: async (data) => {
    const response = await fetch('/api/ai-analytics/anomaly-detection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('異常検知に失敗しました');
    return response.json();
  },

  getOptimizations: async (data) => {
    const response = await fetch('/api/ai-analytics/optimization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('最適化提案の取得に失敗しました');
    return response.json();
  },

  getModels: async () => {
    const response = await fetch('/api/ai-analytics/models');
    if (!response.ok) throw new Error('モデル情報の取得に失敗しました');
    return response.json();
  },

  retrainModel: async (modelId: string) => {
    const response = await fetch(`/api/ai-analytics/models/${modelId}/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('モデル再訓練に失敗しました');
    return response.json();
  }
};

export const AIPredictiveAnalyticsPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'analytics' | 'alerts' | 'settings'>('analytics');
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const { addNotification } = useNotifications();

  // AIモデル情報の取得
  const { data: modelsData, isLoading: modelsLoading, refetch: refetchModels } = useQuery({
    queryKey: ['ai-models'],
    queryFn: aiAnalyticsAPI.getModels,
    refetchInterval: 30000 // 30秒ごとに更新
  });

  // 予測分析の実行
  const predictMutation = useMutation({
    mutationFn: aiAnalyticsAPI.predict,
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: '予測分析完了',
        message: `${data.predictions?.length || 0}件の予測結果を生成しました`,
        autoClose: true
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: '予測分析エラー',
        message: (error as Error).message,
        autoClose: false
      });
    }
  });

  // 異常検知の実行
  const anomalyMutation = useMutation({
    mutationFn: aiAnalyticsAPI.detectAnomalies,
    onSuccess: (data) => {
      const anomaliesCount = data.anomalies?.length || 0;
      addNotification({
        type: anomaliesCount > 0 ? 'warning' : 'success',
        title: '異常検知完了',
        message: `${anomaliesCount}件の異常を検出しました`,
        autoClose: true
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: '異常検知エラー',
        message: (error as Error).message,
        autoClose: false
      });
    }
  });

  // モデル再訓練
  const retrainMutation = useMutation({
    mutationFn: aiAnalyticsAPI.retrainModel,
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'モデル再訓練開始',
        message: data.message,
        autoClose: true
      });
      refetchModels();
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'モデル再訓練エラー',
        message: (error as Error).message,
        autoClose: false
      });
    }
  });

  // 予測分析の開始
  const handleStartPrediction = (modelId: string) => {
    setIsAnalysisRunning(true);
    
    // サンプルデータで予測実行
    predictMutation.mutate({
      modelId,
      timeHorizon: '24h',
      features: {
        current_response_time: 45,
        current_throughput: 1200,
        current_error_rate: 2.1,
        current_capacity: 75,
        current_cost: 1000
      },
      confidenceThreshold: 0.8
    });
  };

  // 予測分析の停止
  const handleStopPrediction = (modelId: string) => {
    setIsAnalysisRunning(false);
    addNotification({
      type: 'info',
      title: '予測分析停止',
      message: `モデル ${modelId} の予測分析を停止しました`,
      autoClose: true
    });
  };

  // モデル再訓練の実行
  const handleRetrainModel = (modelId: string) => {
    retrainMutation.mutate(modelId);
  };

  // ダミーデータの生成（実際の実装ではAPIから取得）
  const generateMockData = () => {
    const now = new Date();
    return Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(now.getTime() - i * 60000),
      response_time: 40 + Math.random() * 20,
      throughput: 1000 + Math.random() * 400,
      error_rate: Math.random() * 5,
      cpu_usage: 50 + Math.random() * 30,
      memory_usage: 60 + Math.random() * 25
    }));
  };

  const historicalData = generateMockData();
  const realtimeData = historicalData.slice(0, 10);

  if (modelsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="AIモデルを読み込み中..." />
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
              <BeakerIcon className="w-8 h-8 text-purple-600" />
              AI駆動予測分析システム
            </h1>
            <p className="text-gray-600 mt-2">機械学習による高度なDNSパフォーマンス予測・異常検知・最適化提案</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* ステータス表示 */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isAnalysisRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isAnalysisRunning ? 'AI分析実行中' : 'AI分析待機中'}
              </span>
            </div>
            
            {/* モード切替 */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { key: 'analytics', label: 'AI分析', icon: BeakerIcon },
                { key: 'alerts', label: 'アラート', icon: ExclamationTriangleIcon },
                { key: 'settings', label: '設定', icon: Cog6ToothIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveMode(key as any)}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                    activeMode === key
                      ? 'bg-purple-600 text-white'
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
              <p className="text-sm font-medium text-gray-600">利用可能モデル</p>
              <p className="text-2xl font-bold text-purple-600">
                {modelsData?.models?.length || 0}
              </p>
            </div>
            <CpuChipIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均精度</p>
              <p className="text-2xl font-bold text-green-600">
                {modelsData?.metadata?.avgAccuracy 
                  ? `${(modelsData.metadata.avgAccuracy * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">実行中予測</p>
              <p className="text-2xl font-bold text-blue-600">
                {isAnalysisRunning ? '1' : '0'}
              </p>
            </div>
            <BeakerIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">処理ステータス</p>
              <p className={`text-2xl font-bold ${isAnalysisRunning ? 'text-green-600' : 'text-gray-600'}`}>
                {isAnalysisRunning ? 'ACTIVE' : 'IDLE'}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAnalysisRunning ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <div className={`w-4 h-4 rounded-full ${
                isAnalysisRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      {activeMode === 'analytics' && (
        <PredictiveAnalytics
          historicalData={historicalData}
          realtimeData={realtimeData}
          onStartPrediction={handleStartPrediction}
          onStopPrediction={handleStopPrediction}
          onRetrainModel={handleRetrainModel}
          autoRefresh={true}
        />
      )}

      {activeMode === 'alerts' && (
        <AlertSystem
          alerts={[]} // 実際の実装ではAPIから取得
          alertRules={[]} // 実際の実装ではAPIから取得
          realtime={true}
        />
      )}

      {activeMode === 'settings' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">AI分析設定</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自動分析間隔
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="5m">5分</option>
                <option value="15m">15分</option>
                <option value="30m">30分</option>
                <option value="1h">1時間</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                信頼度閾値
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                defaultValue="0.8"
                className="w-full"
              />
              <div className="text-sm text-gray-500 mt-1">80%</div>
            </div>
            
            <div>
              <label className="flex items-center space-x-3">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">自動最適化提案を有効にする</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center space-x-3">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">異常検知アラートを有効にする</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPredictiveAnalyticsPage;