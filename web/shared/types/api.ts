/**
 * 共通API型定義
 */

// 基本的なAPIレスポンス型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
  };
  timestamp: string;
}

// ファイルアップロード関連
export interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

export interface UploadResponse extends ApiResponse<FileInfo> {}

// 分析関連
export interface AnalysisRequest {
  fileId: string;
  format: 'cloudflare' | 'route53' | 'generic';
  options?: {
    enableDnsValidation?: boolean;
    riskThresholds?: {
      ttl?: { low: number; high: number };
      naming?: { riskPatterns: string[] };
    };
    timeout?: number;
    retries?: number;
  };
}

export interface AnalysisProgress {
  stage: 'parsing' | 'validating' | 'analyzing' | 'complete' | 'error';
  percentage: number;
  message: string;
  details?: {
    totalRecords?: number;
    processedRecords?: number;
    errors?: number;
    warnings?: number;
  };
}

export interface DNSRecord {
  domain: string;
  type: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  issues: string[];
  dnsResolution?: {
    resolved: boolean;
    actualValue?: string;
    responseTime?: number;
    error?: string;
  };
}

export interface AnalysisResult {
  id: string;
  fileId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  results?: {
    totalRecords: number;
    validRecords: number;
    riskySummary: {
      high: number;
      medium: number;
      low: number;
    };
    records: DNSRecord[];
    statistics: {
      recordTypes: Record<string, number>;
      ttlDistribution: Record<string, number>;
      topDomains: Array<{ domain: string; count: number }>;
      riskFactors: Record<string, number>;
    };
  };
  error?: string;
}

export interface AnalysisResponse extends ApiResponse<{ analysisId: string }> {}
export interface AnalysisResultResponse extends ApiResponse<{ analysis: AnalysisResult }> {}

// 設定関連
export interface AppSettings {
  analysis: {
    riskThresholds: {
      ttl: {
        low: number;
        high: number;
      };
      naming: {
        riskPatterns: string[];
        safePatterns: string[];
      };
    };
    dns: {
      timeout: number;
      retries: number;
      servers: string[];
      enableCache: boolean;
    };
    performance: {
      maxConcurrency: number;
      batchSize: number;
      memoryWarningThreshold: number;
    };
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'en' | 'ja';
    dateFormat: string;
    timezone: string;
  };
  api: {
    maxFileSize: number;
    allowedFormats: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
}

export interface SettingsResponse extends ApiResponse<{ settings: AppSettings }> {}

// WebSocket イベント型
export interface WebSocketEvents {
  'analysis:progress': (data: AnalysisProgress & { analysisId: string; timestamp: string }) => void;
  'analysis:complete': (data: { analysisId: string; result: AnalysisResult }) => void;
  'analysis:error': (data: { analysisId: string; error: string }) => void;
  'subscribe:analysis': (analysisId: string) => void;
  'unsubscribe:analysis': (analysisId: string) => void;
}

// フィルタリング・ソート関連
export interface RecordFilter {
  riskLevel?: ('high' | 'medium' | 'low')[];
  recordType?: string[];
  domainPattern?: string;
  ttlRange?: { min?: number; max?: number };
  hasIssues?: boolean;
  resolved?: boolean;
}

export interface SortOption {
  field: keyof DNSRecord | 'domain' | 'riskScore' | 'ttl';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: SortOption;
  filter?: RecordFilter;
}

// エクスポート関連
export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  includeFields?: (keyof DNSRecord)[];
  filter?: RecordFilter;
  sortBy?: SortOption;
}

export interface ExportResponse extends ApiResponse<{ downloadUrl: string; filename: string }> {}

// 履歴関連
export interface AnalysisHistoryItem {
  id: string;
  fileId: string;
  originalFilename: string;
  status: AnalysisResult['status'];
  startedAt: string;
  completedAt?: string;
  duration?: number;
  recordCount?: number;
  riskySummary?: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface AnalysisHistory {
  items: AnalysisHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HistoryResponse extends ApiResponse<{ history: AnalysisHistory }> {}