/**
 * DNSweeper リアルタイムアラートシステム
 * 高度なアラート管理・通知・エスカレーション機能
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  UserGroupIcon,
  CogIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ChatBubbleLeftEllipsisIcon,
  EyeIcon,
  EyeSlashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains';
  threshold: number | string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  enabled: boolean;
  cooldownPeriod: number; // minutes
  recipients: string[];
  escalationRules: EscalationRule[];
  tags: string[];
  createdAt: Date;
  lastTriggered?: Date;
}

export interface EscalationRule {
  id: string;
  delayMinutes: number;
  recipients: string[];
  actions: ('email' | 'sms' | 'slack' | 'webhook')[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  metric: string;
  actualValue: number | string;
  threshold: number | string;
  timestamp: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalatedAt?: Date;
  escalationLevel: number;
  affectedSystems: string[];
  tags: string[];
  notes: AlertNote[];
}

export interface AlertNote {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  type: 'note' | 'action' | 'escalation' | 'resolution';
}

interface AlertSystemProps {
  alerts?: Alert[];
  alertRules?: AlertRule[];
  onCreateRule?: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  onUpdateRule?: (ruleId: string, updates: Partial<AlertRule>) => void;
  onDeleteRule?: (ruleId: string) => void;
  onAcknowledgeAlert?: (alertId: string, note?: string) => void;
  onResolveAlert?: (alertId: string, note?: string) => void;
  onAddNote?: (alertId: string, note: Omit<AlertNote, 'id' | 'timestamp'>) => void;
  realtime?: boolean;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts = [],
  alertRules = [],
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onAcknowledgeAlert,
  onResolveAlert,
  onAddNote,
  realtime = false
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'settings'>('alerts');
  const [filterSeverity, setFilterSeverity] = useState<string[]>(['critical', 'high', 'medium']);
  const [filterStatus, setFilterStatus] = useState<string[]>(['active', 'escalated']);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'status'>('timestamp');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [newNote, setNewNote] = useState('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevAlertsRef = useRef<Alert[]>([]);

  // アラートフィルタリング
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSeverity = filterSeverity.includes(alert.severity);
      const matchesStatus = filterStatus.includes(alert.status);
      const matchesSearch = searchQuery === '' || 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSeverity && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'status':
          const statusOrder = { active: 3, escalated: 2, acknowledged: 1, resolved: 0 };
          return statusOrder[b.status] - statusOrder[a.status];
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
  }, [alerts, filterSeverity, filterStatus, searchQuery, sortBy]);

  // 新しいアラートの検出と通知
  useEffect(() => {
    if (realtime && alerts.length > prevAlertsRef.current.length) {
      const newAlerts = alerts.filter(alert => 
        !prevAlertsRef.current.some(prev => prev.id === alert.id)
      );
      
      newAlerts.forEach(alert => {
        // 音声通知
        if (soundEnabled && (alert.severity === 'critical' || alert.severity === 'high')) {
          audioRef.current?.play().catch(() => {
            // 音声再生失敗は無視
          });
        }
        
        // デスクトップ通知
        if (desktopNotifications && Notification.permission === 'granted') {
          new Notification(`DNSweeper Alert: ${alert.severity.toUpperCase()}`, {
            body: alert.description,
            icon: '/logo192.png',
            tag: alert.id,
            requireInteraction: alert.severity === 'critical'
          });
        }
      });
    }
    
    prevAlertsRef.current = alerts;
  }, [alerts, soundEnabled, desktopNotifications, realtime]);

  // 通知権限要求
  useEffect(() => {
    if (desktopNotifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [desktopNotifications]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-700 bg-red-100 border-red-200';
      case 'escalated': return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'acknowledged': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'resolved': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    if (onAcknowledgeAlert) {
      onAcknowledgeAlert(alertId, newNote || undefined);
      setNewNote('');
    }
  };

  const handleResolveAlert = (alertId: string) => {
    if (onResolveAlert) {
      onResolveAlert(alertId, newNote || undefined);
      setNewNote('');
    }
  };

  const addNoteToAlert = (alertId: string) => {
    if (onAddNote && newNote.trim()) {
      onAddNote(alertId, {
        author: 'Current User', // TODO: Get from auth context
        content: newNote.trim(),
        type: 'note'
      });
      setNewNote('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 音声ファイル */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/alert.mp3" type="audio/mpeg" />
        <source src="/sounds/alert.ogg" type="audio/ogg" />
      </audio>

      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BellIcon className="w-6 h-6" />
              リアルタイムアラートシステム
            </h2>
            {realtime && (
              <div className="flex items-center space-x-2 text-green-600">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">リアルタイム</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 通知設定 */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${
                soundEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
              title={soundEnabled ? '音声通知ON' : '音声通知OFF'}
            >
              {soundEnabled ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setDesktopNotifications(!desktopNotifications)}
              className={`p-2 rounded-lg ${
                desktopNotifications ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
              title={desktopNotifications ? 'デスクトップ通知ON' : 'デスクトップ通知OFF'}
            >
              {desktopNotifications ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="mt-4">
          <div className="flex space-x-8">
            {[
              { key: 'alerts', label: 'アラート', count: filteredAlerts.length },
              { key: 'rules', label: 'ルール', count: alertRules.length },
              { key: 'settings', label: '設定', count: 0 }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`pb-2 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-6">
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* フィルター・検索 */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="アラートを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  multiple
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(Array.from(e.target.selectedOptions, option => option.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="timestamp">時間順</option>
                <option value="severity">重要度順</option>
                <option value="status">ステータス順</option>
              </select>
            </div>

            {/* アラート一覧 */}
            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">アラートはありません</h3>
                  <p className="mt-1 text-gray-500">現在、条件に一致するアラートはありません。</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(alert.status)}`}>
                            {alert.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatTimeAgo(alert.timestamp)}</span>
                          <span>メトリクス: {alert.metric}</span>
                          <span>実際値: {alert.actualValue}</span>
                          <span>閾値: {alert.threshold}</span>
                          {alert.affectedSystems.length > 0 && (
                            <span>影響システム: {alert.affectedSystems.join(', ')}</span>
                          )}
                        </div>
                        
                        {alert.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {alert.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {alert.status === 'active' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledgeAlert(alert.id);
                              }}
                              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                            >
                              確認
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveAlert(alert.id);
                              }}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              解決
                            </button>
                          </>
                        )}
                        
                        {alert.status === 'acknowledged' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveAlert(alert.id);
                            }}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            解決
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">アラートルール</h3>
              <button
                onClick={() => setShowRuleForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ルール追加
              </button>
            </div>
            
            {/* ルール一覧の実装は省略（類似の構造） */}
            <div className="text-center py-8 text-gray-500">
              アラートルール管理機能は開発中です
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">アラート設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">通知設定</h4>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span>音声通知を有効にする</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={desktopNotifications}
                    onChange={(e) => setDesktopNotifications(e.target.checked)}
                    className="rounded"
                  />
                  <span>デスクトップ通知を有効にする</span>
                </label>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">フィルター設定</h4>
                <p className="text-sm text-gray-500">フィルター設定は開発中です</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* アラート詳細モーダル（簡略化） */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{selectedAlert.title}</h2>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700">{selectedAlert.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">重要度:</span> {selectedAlert.severity}
                  </div>
                  <div>
                    <span className="font-medium">ステータス:</span> {selectedAlert.status}
                  </div>
                  <div>
                    <span className="font-medium">発生時刻:</span> {selectedAlert.timestamp.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">メトリクス:</span> {selectedAlert.metric}
                  </div>
                </div>
                
                {/* ノート追加 */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">ノート追加</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="ノートを入力..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      onClick={() => addNoteToAlert(selectedAlert.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      追加
                    </button>
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

export default AlertSystem;