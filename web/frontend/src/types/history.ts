/**
 * DNS変更履歴関連の型定義（フロントエンド）
 */

export interface DnsChangeRecord {
  id: string;
  recordId: string;
  domain: string;
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'SRV' | 'CAA';
  changeType: 'create' | 'update' | 'delete';
  previousValue?: string;
  newValue?: string;
  previousTtl?: number;
  newTtl?: number;
  timestamp: Date;
  source: 'manual' | 'import' | 'api' | 'monitoring';
  userId?: string;
  userEmail?: string;
  reason?: string;
  metadata?: {
    importFileName?: string;
    apiSource?: string;
    monitoringReason?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface DnsChangeHistory {
  changes: DnsChangeRecord[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageInfo: {
    startCursor?: string;
    endCursor?: string;
  };
}

export interface ChangeHistoryFilter {
  domain?: string;
  recordType?: string;
  changeType?: string;
  source?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  cursor?: string;
  sortBy?: 'timestamp' | 'domain' | 'changeType';
  sortOrder?: 'asc' | 'desc';
}

export interface ChangeStatistics {
  totalChanges: number;
  changesByType: {
    create: number;
    update: number;
    delete: number;
  };
  changesBySource: {
    manual: number;
    import: number;
    api: number;
    monitoring: number;
  };
  changesByRecordType: {
    [key: string]: number;
  };
  topChangedDomains: Array<{
    domain: string;
    changeCount: number;
  }>;
  changesTrend: Array<{
    date: string;
    count: number;
  }>;
}