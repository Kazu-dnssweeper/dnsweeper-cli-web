import api from './api';
import type { ApiResponse } from '../types';
import type { DnsChangeHistory, ChangeHistoryFilter, ChangeStatistics, DnsChangeRecord } from '../types/history';

// 変更履歴関連API
export const historyApi = {
  // 変更履歴一覧の取得
  getChangeHistory: async (filter?: ChangeHistoryFilter): Promise<ApiResponse<DnsChangeHistory>> => {
    const params = new URLSearchParams();
    
    if (filter?.domain) params.append('domain', filter.domain);
    if (filter?.recordType) params.append('recordType', filter.recordType);
    if (filter?.changeType) params.append('changeType', filter.changeType);
    if (filter?.source) params.append('source', filter.source);
    if (filter?.userId) params.append('userId', filter.userId);
    if (filter?.dateFrom) params.append('dateFrom', filter.dateFrom.toISOString());
    if (filter?.dateTo) params.append('dateTo', filter.dateTo.toISOString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.cursor) params.append('cursor', filter.cursor);
    if (filter?.sortBy) params.append('sortBy', filter.sortBy);
    if (filter?.sortOrder) params.append('sortOrder', filter.sortOrder);

    const response = await api.get(`/history?${params.toString()}`);
    
    // Date文字列をDateオブジェクトに変換
    if (response.data?.changes) {
      response.data.changes = response.data.changes.map((change: any) => ({
        ...change,
        timestamp: new Date(change.timestamp)
      }));
    }
    
    return response.data;
  },

  // 変更履歴統計の取得
  getChangeStatistics: async (dateFrom?: Date, dateTo?: Date): Promise<ApiResponse<ChangeStatistics>> => {
    const params = new URLSearchParams();
    
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
    if (dateTo) params.append('dateTo', dateTo.toISOString());

    return api.get(`/history/stats?${params.toString()}`);
  },

  // 特定レコードの変更履歴取得
  getRecordHistory: async (recordId: string): Promise<ApiResponse<{
    recordId: string;
    changes: DnsChangeRecord[];
    totalCount: number;
  }>> => {
    const response = await api.get(`/history/record/${recordId}`);
    
    // Date文字列をDateオブジェクトに変換
    if (response.data?.changes) {
      response.data.changes = response.data.changes.map((change: any) => ({
        ...change,
        timestamp: new Date(change.timestamp)
      }));
    }
    
    return response.data;
  },

  // 特定ドメインの変更履歴取得
  getDomainHistory: async (domain: string): Promise<ApiResponse<{
    domain: string;
    changes: DnsChangeRecord[];
    totalCount: number;
  }>> => {
    const response = await api.get(`/history/domain/${encodeURIComponent(domain)}`);
    
    // Date文字列をDateオブジェクトに変換
    if (response.data?.changes) {
      response.data.changes = response.data.changes.map((change: any) => ({
        ...change,
        timestamp: new Date(change.timestamp)
      }));
    }
    
    return response.data;
  },

  // 変更履歴の記録（内部API）
  recordChange: async (changeData: Omit<DnsChangeRecord, 'id' | 'timestamp'>): Promise<ApiResponse<DnsChangeRecord>> => {
    const response = await api.post('/history/record', changeData);
    
    // Date文字列をDateオブジェクトに変換
    if (response.data?.timestamp) {
      response.data.timestamp = new Date(response.data.timestamp);
    }
    
    return response.data;
  },

  // 一括変更履歴の記録（内部API）
  bulkRecordChanges: async (changes: Array<Omit<DnsChangeRecord, 'id' | 'timestamp'>>): Promise<ApiResponse<{
    recordedCount: number;
    changes: DnsChangeRecord[];
  }>> => {
    const response = await api.post('/history/bulk-record', { changes });
    
    // Date文字列をDateオブジェクトに変換
    if (response.data?.changes) {
      response.data.changes = response.data.changes.map((change: any) => ({
        ...change,
        timestamp: new Date(change.timestamp)
      }));
    }
    
    return response.data;
  }
};