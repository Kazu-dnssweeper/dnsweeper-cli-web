/**
 * DNSweeper AI駆動予測分析システム
 * 機械学習ベースのDNSパフォーマンス予測・異常検知・最適化提案
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BeakerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CpuChipIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DocumentTextIcon,
  CloudIcon,
  ServerIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { MetricsChart } from '../Charts/MetricsChart';

interface PredictionModel {
  id: string;
  name: string;
  type: 'time_series' | 'anomaly_detection' | 'classification' | 'clustering';
  description: string;
  accuracy: number;
  confidence: number;
  lastTrained: Date;
  status: 'training' | 'ready' | 'predicting' | 'error';
  features: string[];
  predictions: Prediction[];
}

interface Prediction {
  id: string;
  metric: string;
  predictedValue: number;
  actualValue?: number;
  confidence: number;
  timeframe: string;
  timestamp: Date;
  factors: PredictionFactor[];
}

interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1
  confidence: number;
  description: string;
}

interface AnomalyDetection {
  id: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  anomalyScore: number;
  expectedRange: [number, number];
  actualValue: number;
  timestamp: Date;
  rootCauses: string[];
  recommendations: string[];
}

interface OptimizationRecommendation {
  id: string;
  category: 'performance' | 'cost' | 'reliability' | 'security';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedBenefit: string;
  implementation: string[];
  priority: number;
  aiConfidence: number;
}

interface AIModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  maeError: number;
  rmseError: number;
  trainingTime: number;
  predictionLatency: number;
}

interface PredictiveAnalyticsProps {
  historicalData?: any[];
  realtimeData?: any[];
  onStartPrediction?: (modelId: string) => void;
  onStopPrediction?: (modelId: string) => void;
  onRetrainModel?: (modelId: string) => void;
  autoRefresh?: boolean;
}

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  historicalData = [],
  realtimeData = [],
  onStartPrediction,
  onStopPrediction,
  onRetrainModel,
  autoRefresh = false
}) => {
  const [activeTab, setActiveTab] = useState<'predictions' | 'anomalies' | 'recommendations' | 'models'>('predictions');
  const [selectedModel, setSelectedModel] = useState<string>('dns_performance_predictor');
  const [timeHorizon, setTimeHorizon] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isRunning, setIsRunning] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);

  // モックデータ（実際の実装では API から取得）
  const [models] = useState<PredictionModel[]>([
    {
      id: 'dns_performance_predictor',
      name: 'DNS パフォーマンス予測器',
      type: 'time_series',
      description: 'DNS解決時間とスループットを予測します',
      accuracy: 0.92,
      confidence: 0.89,
      lastTrained: new Date(),
      status: 'ready',
      features: ['query_count', 'response_time', 'error_rate', 'cache_hit_rate', 'server_load'],
      predictions: []
    },
    {
      id: 'anomaly_detector',
      name: '異常検知エンジン',
      type: 'anomaly_detection',
      description: 'DNS トラフィックの異常パターンを検出します',
      accuracy: 0.87,
      confidence: 0.85,
      lastTrained: new Date(Date.now() - 86400000),
      status: 'ready',
      features: ['traffic_pattern', 'query_distribution', 'geographic_spread', 'temporal_features'],
      predictions: []
    },
    {
      id: 'capacity_planner',
      name: 'キャパシティプランナー',
      type: 'time_series',
      description: 'インフラ需要とスケーリング要件を予測します',
      accuracy: 0.94,
      confidence: 0.91,
      lastTrained: new Date(Date.now() - 43200000),
      status: 'ready',
      features: ['resource_usage', 'growth_trends', 'seasonal_patterns', 'business_metrics'],
      predictions: []
    }
  ]);

  const [predictions] = useState<Prediction[]>([
    {
      id: 'pred_1',
      metric: 'average_response_time',
      predictedValue: 45.2,
      actualValue: 42.8,
      confidence: 0.91,
      timeframe: '次の1時間',
      timestamp: new Date(),
      factors: [
        { name: 'サーバー負荷', impact: 0.3, confidence: 0.88, description: '現在の負荷トレンドから予測' },
        { name: 'キャッシュ効率', impact: -0.2, confidence: 0.85, description: 'キャッシュヒット率の改善効果' },
        { name: '地理的分散', impact: 0.1, confidence: 0.79, description: 'トラフィック分布の変化' }
      ]
    },
    {
      id: 'pred_2',
      metric: 'query_throughput',
      predictedValue: 1247,
      confidence: 0.87,
      timeframe: '次の6時間',
      timestamp: new Date(),
      factors: [
        { name: '時間帯パターン', impact: 0.5, confidence: 0.92, description: 'ピーク時間帯の影響' },
        { name: '季節変動', impact: 0.2, confidence: 0.76, description: '季節的なトラフィック増加' }
      ]
    }
  ]);

  const [anomalies] = useState<AnomalyDetection[]>([
    {
      id: 'anom_1',
      metric: 'error_rate',
      severity: 'high',
      anomalyScore: 0.85,
      expectedRange: [0.5, 2.0],
      actualValue: 5.2,
      timestamp: new Date(),
      rootCauses: ['DNS サーバー負荷増大', 'ネットワーク遅延異常'],
      recommendations: ['負荷分散設定の見直し', 'DNS サーバーのスケールアウト']
    },
    {
      id: 'anom_2', 
      metric: 'cache_hit_rate',
      severity: 'medium',
      anomalyScore: 0.72,
      expectedRange: [85, 95],
      actualValue: 78,
      timestamp: new Date(Date.now() - 1800000),
      rootCauses: ['キャッシュ設定の問題', 'TTL値の不適切な設定'],
      recommendations: ['キャッシュ戦略の最適化', 'TTL値の調整']
    }
  ]);

  const [recommendations] = useState<OptimizationRecommendation[]>([
    {
      id: 'rec_1',
      category: 'performance',
      title: 'DNS キャッシュ戦略の最適化',
      description: 'AIモデルがキャッシュヒット率を15%改善できると予測しています',
      impact: 'high',
      effort: 'medium',
      estimatedBenefit: '応答時間20%短縮、コスト10%削減',
      implementation: [
        'TTL値を最適化（900秒→1800秒）',
        'プリフェッチ戦略の導入',
        'インテリジェントキャッシュ無効化'
      ],
      priority: 95,
      aiConfidence: 0.91
    },
    {
      id: 'rec_2',
      category: 'cost',
      title: 'リソース配分の最適化',
      description: 'トラフィックパターン分析により、リソース使用量を25%削減可能',
      impact: 'high',
      effort: 'high',
      estimatedBenefit: '月間コスト30%削減',
      implementation: [
        'オートスケーリング閾値の調整',
        '地理的負荷分散の最適化',
        '低トラフィック時間帯のリソース削減'
      ],
      priority: 88,
      aiConfidence: 0.86
    }
  ]);

  const selectedModelData = models.find(m => m.id === selectedModel);

  const getModelStatus = (status: string) => {
    switch (status) {
      case 'training': return 'text-yellow-700 bg-yellow-100';
      case 'ready': return 'text-green-700 bg-green-100';
      case 'predicting': return 'text-blue-700 bg-blue-100';
      case 'error': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0.3) return <ArrowTrendingUpIcon className="w-4 h-4 text-red-500" />;
    if (impact < -0.3) return <ArrowTrendingDownIcon className="w-4 h-4 text-green-500" />;
    return <ArrowPathIcon className="w-4 h-4 text-gray-500" />;
  };

  const handleStartPrediction = () => {
    setIsRunning(true);
    if (onStartPrediction) {
      onStartPrediction(selectedModel);
    }
  };

  const handleStopPrediction = () => {
    setIsRunning(false);
    if (onStopPrediction) {
      onStopPrediction(selectedModel);
    }
  };

  const handleRetrainModel = () => {
    if (onRetrainModel) {
      onRetrainModel(selectedModel);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <BeakerIcon className="w-8 h-8 text-purple-600" />
              AI駆動予測分析システム
            </h2>
            <p className="text-gray-600 mt-1">機械学習による DNS パフォーマンス予測・異常検知・最適化提案</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* モデル選択 */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            
            {/* 時間軸選択 */}
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="1h">1時間先</option>
              <option value="6h">6時間先</option>
              <option value="24h">24時間先</option>
              <option value="7d">7日先</option>
            </select>
            
            {/* 制御ボタン */}
            <div className="flex items-center space-x-2">
              {!isRunning ? (
                <button
                  onClick={handleStartPrediction}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  title="予測開始"
                >
                  <PlayIcon className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleStopPrediction}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  title="予測停止"
                >
                  <StopIcon className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={handleRetrainModel}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="モデル再訓練"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* モデル情報 */}
        {selectedModelData && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">精度</span>
                <span className="font-bold text-lg">{(selectedModelData.accuracy * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">信頼度</span>
                <span className="font-bold text-lg">{(selectedModelData.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ステータス</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getModelStatus(selectedModelData.status)}`}>
                  {selectedModelData.status}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">最終訓練</span>
                <span className="font-medium text-sm">
                  {selectedModelData.lastTrained.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="mt-6">
          <div className="flex space-x-8">
            {[
              { key: 'predictions', label: '予測結果', icon: ChartBarIcon },
              { key: 'anomalies', label: '異常検知', icon: ExclamationTriangleIcon },
              { key: 'recommendations', label: '最適化提案', icon: LightBulbIcon },
              { key: 'models', label: 'モデル管理', icon: CpuChipIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`pb-2 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === key
                    ? 'border-purple-500 text-purple-600'
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

      {/* メインコンテンツ */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* 予測結果一覧 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">予測結果</h3>
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <div key={prediction.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{prediction.metric}</h4>
                        <span className="text-sm text-gray-500">{prediction.timeframe}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          prediction.confidence > 0.8 ? 'bg-green-100 text-green-700' :
                          prediction.confidence > 0.6 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          信頼度 {(prediction.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">予測値:</span>
                          <span className="ml-2 font-medium">{prediction.predictedValue}</span>
                        </div>
                        {prediction.actualValue && (
                          <div>
                            <span className="text-gray-600">実際値:</span>
                            <span className="ml-2 font-medium">{prediction.actualValue}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 影響要因 */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">影響要因:</h5>
                        {prediction.factors.map((factor, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm">
                            {getImpactIcon(factor.impact)}
                            <span className="font-medium">{factor.name}</span>
                            <span className="text-gray-500">
                              影響度: {(Math.abs(factor.impact) * 100).toFixed(0)}%
                            </span>
                            <span className="text-gray-400">({factor.description})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          {/* 異常検知結果 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">異常検知結果</h3>
            <div className="space-y-4">
              {anomalies.map((anomaly) => (
                <div key={anomaly.id} className={`border-l-4 p-4 rounded-lg ${
                  anomaly.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  anomaly.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  anomaly.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{anomaly.metric}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(anomaly.severity)}`}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          異常度: {(anomaly.anomalyScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">期待範囲:</span>
                          <span className="ml-2 font-medium">
                            {anomaly.expectedRange[0]} - {anomaly.expectedRange[1]}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">実際値:</span>
                          <span className="ml-2 font-medium text-red-600">{anomaly.actualValue}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">検出時刻:</span>
                          <span className="ml-2 font-medium">{anomaly.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">原因分析:</h5>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {anomaly.rootCauses.map((cause, index) => (
                              <li key={index}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">推奨対策:</h5>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {anomaly.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* 最適化提案 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI最適化提案</h3>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          rec.category === 'performance' ? 'bg-blue-100 text-blue-700' :
                          rec.category === 'cost' ? 'bg-green-100 text-green-700' :
                          rec.category === 'reliability' ? 'bg-purple-100 text-purple-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {rec.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">{rec.priority}</div>
                      <div className="text-xs text-gray-500">優先度</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">影響度:</span>
                      <span className={`ml-2 font-medium ${
                        rec.impact === 'high' ? 'text-red-600' :
                        rec.impact === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {rec.impact}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">実装難易度:</span>
                      <span className={`ml-2 font-medium ${
                        rec.effort === 'high' ? 'text-red-600' :
                        rec.effort === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {rec.effort}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">AI信頼度:</span>
                      <span className="ml-2 font-medium">{(rec.aiConfidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">期待効果:</h5>
                    <p className="text-sm text-gray-600 mb-2">{rec.estimatedBenefit}</p>
                    
                    <h5 className="text-sm font-medium text-gray-700 mb-2">実装手順:</h5>
                    <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                      {rec.implementation.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* モデル管理 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AIモデル管理</h3>
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{model.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getModelStatus(model.status)}`}>
                          {model.status}
                        </span>
                        <span className="text-sm text-gray-500">{model.type}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">精度:</span>
                          <span className="ml-2 font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">信頼度:</span>
                          <span className="ml-2 font-medium">{(model.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">最終訓練:</span>
                          <span className="ml-2 font-medium">{model.lastTrained.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">特徴量数:</span>
                          <span className="ml-2 font-medium">{model.features.length}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">使用特徴量:</h5>
                        <div className="flex flex-wrap gap-2">
                          {model.features.map((feature) => (
                            <span key={feature} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleRetrainModel()}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        再訓練
                      </button>
                      <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        設定
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;