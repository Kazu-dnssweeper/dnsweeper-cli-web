import { 
  DnsChangeRecord, 
  DnsChangeHistory, 
  ChangeHistoryFilter, 
  ChangeStatistics,
  ChangeHistoryService 
} from '../types/history';

/**
 * DNS変更履歴管理サービス
 * 実際のプロダクションではデータベース（PostgreSQL/MongoDB）を使用
 * 現在はメモリ内ストレージで実装
 */
class InMemoryChangeHistoryService implements ChangeHistoryService {
  private changes: DnsChangeRecord[] = [];

  constructor() {
    // サンプルデータの初期化
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const sampleChanges: Array<Omit<DnsChangeRecord, 'id' | 'timestamp'>> = [
      {
        recordId: 'rec_001',
        domain: 'app.example.com',
        recordType: 'A',
        changeType: 'update',
        previousValue: '192.168.1.100',
        newValue: '192.168.1.101',
        previousTtl: 3600,
        newTtl: 3600,
        source: 'manual',
        userId: 'user_001',
        userEmail: 'admin@example.com',
        reason: 'サーバーIPアドレス変更',
        metadata: {
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      },
      {
        recordId: 'rec_002',
        domain: 'api.example.com',
        recordType: 'CNAME',
        changeType: 'create',
        newValue: 'api-lb.example.com',
        newTtl: 300,
        source: 'import',
        metadata: {
          importFileName: 'cloudflare_export.csv'
        }
      },
      {
        recordId: 'rec_003',
        domain: 'old-service.example.com',
        recordType: 'A',
        changeType: 'delete',
        previousValue: '10.0.0.1',
        previousTtl: 86400,
        source: 'monitoring',
        metadata: {
          monitoringReason: 'DNS解決エラーが継続的に発生'
        }
      },
      {
        recordId: 'rec_004',
        domain: 'mail.example.com',
        recordType: 'MX',
        changeType: 'update',
        previousValue: '10 mail1.example.com',
        newValue: '5 mail2.example.com',
        previousTtl: 7200,
        newTtl: 3600,
        source: 'api',
        metadata: {
          apiSource: 'Route53 Sync'
        }
      }
    ];

    // 過去1週間のタイムスタンプで分散してサンプルデータを作成
    sampleChanges.forEach((change, index) => {
      const daysAgo = Math.floor(index / 2) + 1;
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(9 + (index % 12), index * 5, 0, 0);

      this.changes.push({
        ...change,
        id: `change_${String(index + 1).padStart(3, '0')}`,
        timestamp
      });
    });

    // 時系列順にソート（新しい順）
    this.changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async recordChange(change: Omit<DnsChangeRecord, 'id' | 'timestamp'>): Promise<DnsChangeRecord> {
    const newChange: DnsChangeRecord = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.changes.unshift(newChange); // 先頭に追加（最新が先頭）
    
    // WebSocketで変更をブロードキャスト（実際の実装ではWebSocketサーバーインスタンスを注入）
    this.broadcastChange(newChange);
    
    return newChange;
  }

  private broadcastChange(change: DnsChangeRecord): void {
    // WebSocketブロードキャスト（仮実装）
    // 実際の実装では、WebSocketサーバーインスタンスを受け取って使用
    if (global.socketIO) {
      global.socketIO.emit('dns_change_recorded', {
        type: 'change_recorded',
        payload: change
      });
    }
  }

  async getChangeHistory(filter: ChangeHistoryFilter): Promise<DnsChangeHistory> {
    let filteredChanges = [...this.changes];

    // フィルタリング
    if (filter.domain) {
      const domainPattern = new RegExp(filter.domain.replace(/\*/g, '.*'), 'i');
      filteredChanges = filteredChanges.filter(change => 
        domainPattern.test(change.domain)
      );
    }

    if (filter.recordType) {
      filteredChanges = filteredChanges.filter(change => 
        change.recordType === filter.recordType
      );
    }

    if (filter.changeType) {
      filteredChanges = filteredChanges.filter(change => 
        change.changeType === filter.changeType
      );
    }

    if (filter.source) {
      filteredChanges = filteredChanges.filter(change => 
        change.source === filter.source
      );
    }

    if (filter.userId) {
      filteredChanges = filteredChanges.filter(change => 
        change.userId === filter.userId
      );
    }

    if (filter.dateFrom) {
      filteredChanges = filteredChanges.filter(change => 
        change.timestamp >= filter.dateFrom!
      );
    }

    if (filter.dateTo) {
      filteredChanges = filteredChanges.filter(change => 
        change.timestamp <= filter.dateTo!
      );
    }

    // ソート
    const sortBy = filter.sortBy || 'timestamp';
    const sortOrder = filter.sortOrder || 'desc';
    
    filteredChanges.sort((a, b) => {
      let aValue: any = a[sortBy as keyof DnsChangeRecord];
      let bValue: any = b[sortBy as keyof DnsChangeRecord];

      if (sortBy === 'timestamp') {
        aValue = a.timestamp.getTime();
        bValue = b.timestamp.getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // ページネーション
    const limit = filter.limit || 20;
    let startIndex = 0;

    if (filter.cursor) {
      const cursorIndex = filteredChanges.findIndex(change => change.id === filter.cursor);
      startIndex = cursorIndex > -1 ? cursorIndex + 1 : 0;
    }

    const endIndex = startIndex + limit;
    const pageChanges = filteredChanges.slice(startIndex, endIndex);

    return {
      changes: pageChanges,
      totalCount: filteredChanges.length,
      hasNextPage: endIndex < filteredChanges.length,
      hasPreviousPage: startIndex > 0,
      pageInfo: {
        startCursor: pageChanges.length > 0 ? pageChanges[0].id : undefined,
        endCursor: pageChanges.length > 0 ? pageChanges[pageChanges.length - 1].id : undefined
      }
    };
  }

  async getChangeStatistics(dateFrom: Date, dateTo: Date): Promise<ChangeStatistics> {
    const filteredChanges = this.changes.filter(change => 
      change.timestamp >= dateFrom && change.timestamp <= dateTo
    );

    const changesByType = {
      create: filteredChanges.filter(c => c.changeType === 'create').length,
      update: filteredChanges.filter(c => c.changeType === 'update').length,
      delete: filteredChanges.filter(c => c.changeType === 'delete').length
    };

    const changesBySource = {
      manual: filteredChanges.filter(c => c.source === 'manual').length,
      import: filteredChanges.filter(c => c.source === 'import').length,
      api: filteredChanges.filter(c => c.source === 'api').length,
      monitoring: filteredChanges.filter(c => c.source === 'monitoring').length
    };

    const recordTypeGroups = filteredChanges.reduce((acc, change) => {
      acc[change.recordType] = (acc[change.recordType] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const domainGroups = filteredChanges.reduce((acc, change) => {
      acc[change.domain] = (acc[change.domain] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const topChangedDomains = Object.entries(domainGroups)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, changeCount]) => ({ domain, changeCount }));

    // 日別のトレンド計算
    const changesTrend: { [key: string]: number } = {};
    filteredChanges.forEach(change => {
      const dateKey = change.timestamp.toISOString().split('T')[0];
      changesTrend[dateKey] = (changesTrend[dateKey] || 0) + 1;
    });

    const changesTrendArray = Object.entries(changesTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totalChanges: filteredChanges.length,
      changesByType,
      changesBySource,
      changesByRecordType: recordTypeGroups,
      topChangedDomains,
      changesTrend: changesTrendArray
    };
  }

  async getRecordHistory(recordId: string): Promise<DnsChangeRecord[]> {
    return this.changes
      .filter(change => change.recordId === recordId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getDomainHistory(domain: string): Promise<DnsChangeRecord[]> {
    return this.changes
      .filter(change => change.domain === domain)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async bulkRecordChanges(changes: Array<Omit<DnsChangeRecord, 'id' | 'timestamp'>>): Promise<DnsChangeRecord[]> {
    const timestamp = new Date();
    const newChanges: DnsChangeRecord[] = changes.map((change, index) => ({
      ...change,
      id: `bulk_${timestamp.getTime()}_${index}`,
      timestamp: new Date(timestamp.getTime() + index) // 1ms間隔で微調整
    }));

    this.changes.unshift(...newChanges);
    this.changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return newChanges;
  }
}

// シングルトンインスタンス
export const changeHistoryService = new InMemoryChangeHistoryService();