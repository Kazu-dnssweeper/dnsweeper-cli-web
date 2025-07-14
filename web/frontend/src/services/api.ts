import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiResponse, DnsRecord, AnalysisResult, UploadStatus, AppSettings } from '../types';

// API クライアントの設定
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター
  client.interceptors.request.use(
    (config) => {
      // 認証トークンがあれば追加
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // レスポンスインターセプター
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (error.response?.status === 401) {
        // 認証エラーの場合はトークンを削除
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const api = createApiClient();

// ファイルアップロード関連API
export const uploadApi = {
  // CSVファイルのアップロード
  uploadFile: async (file: File): Promise<ApiResponse<{ 
    id: string; 
    originalName: string; 
    filename: string; 
    size: number; 
    uploadedAt: string; 
  }>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // アップロード状態の取得
  getUploadStatus: async (fileId: string): Promise<ApiResponse<UploadStatus>> => {
    return api.get(`/upload/${fileId}/status`);
  },

  // アップロード履歴の取得
  getUploadHistory: async (): Promise<ApiResponse<Array<{ id: string; fileName: string; uploadedAt: string; status: string }>>> => {
    return api.get('/upload/history');
  },
};

// DNS レコード関連API
export const dnsApi = {
  // レコード一覧の取得
  getRecords: async (params?: {
    search?: string;
    type?: string;
    riskLevel?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ records: DnsRecord[]; total: number; page: number; limit: number }>> => {
    return api.get('/dns/records', { params });
  },

  // 特定レコードの取得
  getRecord: async (id: string): Promise<ApiResponse<DnsRecord>> => {
    return api.get(`/dns/records/${id}`);
  },

  // レコードの更新
  updateRecord: async (id: string, data: Partial<DnsRecord>): Promise<ApiResponse<DnsRecord>> => {
    return api.put(`/dns/records/${id}`, data);
  },

  // レコードの削除
  deleteRecord: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/dns/records/${id}`);
  },

  // レコードのリスクスコア再計算
  recalculateRisk: async (recordIds: string[]): Promise<ApiResponse<{ updated: number }>> => {
    return api.post('/dns/records/recalculate-risk', { recordIds });
  },

  // DNS解決の実行
  resolveRecord: async (domain: string, type: string): Promise<ApiResponse<{ value: string; ttl: number }>> => {
    return api.post('/dns/resolve', { domain, type });
  },
};

// 分析関連API
export const analysisApi = {
  // 分析結果一覧の取得
  getAnalyses: async (): Promise<ApiResponse<AnalysisResult[]>> => {
    return api.get('/analyze');
  },

  // 特定分析結果の取得
  getAnalysis: async (id: string): Promise<ApiResponse<AnalysisResult>> => {
    return api.get(`/analyze/${id}`);
  },

  // 新規分析の開始
  startAnalysis: async (fileId: string, options?: {
    includeRiskCalculation?: boolean;
    includeDnsResolution?: boolean;
  }): Promise<ApiResponse<{ analysisId: string; status: string }>> => {
    return api.post('/analyze', { fileId, options });
  },

  // 分析結果のエクスポート
  exportAnalysis: async (id: string, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> => {
    const response = await api.get(`/analyze/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

// 設定関連API
export const settingsApi = {
  // 設定の取得
  getSettings: async (): Promise<ApiResponse<AppSettings>> => {
    return api.get('/settings');
  },

  // 設定の更新
  updateSettings: async (settings: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> => {
    return api.put('/settings', settings);
  },

  // API接続テスト
  testConnection: async (): Promise<ApiResponse<{ status: 'ok'; version: string; timestamp: string }>> => {
    return api.get('/health');
  },
};

// 統計情報API
export const statsApi = {
  // ダッシュボード統計の取得
  getDashboardStats: async (): Promise<ApiResponse<{
    totalRecords: number;
    highRiskRecords: number;
    mediumRiskRecords: number;
    lowRiskRecords: number;
    lastScanTime: string;
    recentAnalyses: Array<{
      id: string;
      fileName: string;
      recordCount: number;
      riskScore: number;
      createdAt: string;
      status: string;
    }>;
  }>> => {
    return api.get('/stats/dashboard');
  },

  // リスク分布の取得
  getRiskDistribution: async (): Promise<ApiResponse<{
    high: number;
    medium: number;
    low: number;
    distribution: Array<{ score: number; count: number }>;
  }>> => {
    return api.get('/stats/risk-distribution');
  },

  // 時系列統計の取得
  getTimeSeriesStats: async (period: '1h' | '24h' | '7d' | '30d'): Promise<ApiResponse<Array<{
    timestamp: string;
    recordCount: number;
    avgRiskScore: number;
  }>>> => {
    return api.get('/stats/timeseries', { params: { period } });
  },
};

// エラーハンドリングヘルパー
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return '不明なエラーが発生しました';
};

export const apiClient = api;
export default api;