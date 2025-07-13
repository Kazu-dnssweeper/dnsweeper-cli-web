// DNS解析結果の型定義
export interface DnsRecord {
  id: string;
  domain: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  value: string;
  ttl: number;
  lastUpdated: Date;
  riskScore?: number;
}

// CSVファイルアップロードの状態
export interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  recordCount?: number;
}

// 分析結果の型
export interface AnalysisResult {
  id: string;
  fileName: string;
  totalRecords: number;
  highRiskRecords: number;
  mediumRiskRecords: number;
  lowRiskRecords: number;
  createdAt: Date;
  summary: {
    averageRiskScore: number;
    topRisks: string[];
    recommendations: string[];
  };
}

// アプリケーション設定
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  notifications: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // 分単位
}

// API レスポンスの基本型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocketメッセージの型
export interface WebSocketMessage {
  type: 'upload_progress' | 'analysis_complete' | 'error' | 'dns_update' | 'dns_change_recorded' | 'dns_query_completed';
  payload: any;
}