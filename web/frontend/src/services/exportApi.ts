import api from './api';
import type { ApiResponse } from '../types';

// エクスポート関連の型定義
export interface ExportRequest {
  type: 'dns_records' | 'change_history' | 'analysis_results' | 'statistics';
  format: 'csv' | 'excel' | 'pdf';
  filter?: {
    domain?: string;
    recordType?: string;
    riskLevel?: 'high' | 'medium' | 'low';
    changeType?: 'create' | 'update' | 'delete';
    source?: 'manual' | 'import' | 'api' | 'monitoring';
    dateFrom?: Date;
    dateTo?: Date;
    analysisId?: string;
    limit?: number;
  };
  options?: {
    includeCharts?: boolean;
    worksheetName?: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'Letter' | 'Legal';
    delimiter?: string;
    encoding?: 'utf8' | 'shift_jis';
    includeBOM?: boolean;
    includeMetadata?: boolean;
    customFileName?: string;
  };
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName: string;
  fileSize: number;
  format: string;
  recordCount: number;
  generatedAt: Date;
  expiresAt: Date;
  error?: string;
}

export interface ExportTemplate {
  name: string;
  description: string;
  type: ExportRequest['type'];
  format: ExportRequest['format'];
  defaultFilter: ExportRequest['filter'];
  defaultOptions: ExportRequest['options'];
}

// エクスポート関連API
export const exportApi = {
  // エクスポートテンプレート一覧の取得
  getTemplates: async (): Promise<ApiResponse<ExportTemplate[]>> => {
    return api.get('/export/templates');
  },

  // エクスポート実行
  createExport: async (request: ExportRequest): Promise<ApiResponse<ExportResult>> => {
    // Date オブジェクトを ISO 文字列に変換
    const requestWithStringDates = {
      ...request,
      filter: request.filter ? {
        ...request.filter,
        dateFrom: request.filter.dateFrom?.toISOString(),
        dateTo: request.filter.dateTo?.toISOString()
      } : undefined
    };

    const response = await api.post('/export', requestWithStringDates);
    
    // レスポンスの日付文字列をDateオブジェクトに変換
    if (response.data) {
      response.data.generatedAt = new Date(response.data.generatedAt);
      response.data.expiresAt = new Date(response.data.expiresAt);
    }
    
    return response.data;
  },

  // DNS レコードのクイックエクスポート
  exportDnsRecords: async (params: {
    format?: string;
    domain?: string;
    recordType?: string;
    limit?: number;
    filename?: string;
  }): Promise<ApiResponse<ExportResult>> => {
    const queryParams = new URLSearchParams();
    
    if (params.format) queryParams.append('format', params.format);
    if (params.domain) queryParams.append('domain', params.domain);
    if (params.recordType) queryParams.append('recordType', params.recordType);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.filename) queryParams.append('filename', params.filename);

    const response = await api.get(`/export/dns-records?${queryParams.toString()}`);
    
    if (response.data) {
      response.data.generatedAt = new Date(response.data.generatedAt);
      response.data.expiresAt = new Date(response.data.expiresAt);
    }
    
    return response.data;
  },

  // 変更履歴のクイックエクスポート
  exportChangeHistory: async (params: {
    format?: string;
    days?: number;
    domain?: string;
    changeType?: string;
    source?: string;
    filename?: string;
  }): Promise<ApiResponse<ExportResult>> => {
    const queryParams = new URLSearchParams();
    
    if (params.format) queryParams.append('format', params.format);
    if (params.days) queryParams.append('days', params.days.toString());
    if (params.domain) queryParams.append('domain', params.domain);
    if (params.changeType) queryParams.append('changeType', params.changeType);
    if (params.source) queryParams.append('source', params.source);
    if (params.filename) queryParams.append('filename', params.filename);

    const response = await api.get(`/export/change-history?${queryParams.toString()}`);
    
    if (response.data) {
      response.data.generatedAt = new Date(response.data.generatedAt);
      response.data.expiresAt = new Date(response.data.expiresAt);
    }
    
    return response.data;
  },

  // ファイルダウンロード（ブラウザでの直接ダウンロード）
  downloadFile: (downloadUrl: string): void => {
    // 新しいタブでダウンロードURLを開く
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ファイルダウンロード（fetch APIを使用）
  downloadFileAsBlob: async (downloadUrl: string): Promise<Blob> => {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`ダウンロードに失敗しました: ${response.statusText}`);
    }
    
    return response.blob();
  }
};