/**
 * マルチテナント 監査・ログ管理
 * 監査ログ、コンプライアンス、セキュリティイベント管理
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type { MultiTenantCore } from './multi-tenant-core.js';
import type { TenantAuditLog } from './multi-tenant-types.js';

export class MultiTenantAuditManager extends EventEmitter {
  private logger: Logger;
  private tenantCore: MultiTenantCore;
  private auditLogs: Map<string, TenantAuditLog[]> = new Map();
  private retentionDays: number = 90; // デフォルト90日
  private realTimeMonitoring: boolean = true;

  constructor(tenantCore: MultiTenantCore, logger?: Logger) {
    super();
    this.tenantCore = tenantCore;
    this.logger = logger || new Logger({ logLevel: 'info' });

    // 定期的な古いログのクリーンアップ
    this.startCleanupScheduler();
  }

  // ===== 監査ログ管理 =====

  /**
   * 監査ログの記録
   */
  async recordAuditLog(
    logData: Omit<TenantAuditLog, 'id' | 'timestamp'>
  ): Promise<TenantAuditLog> {
    // テナントの存在確認
    if (!this.tenantCore.getTenant(logData.tenantId)) {
      throw new Error(`テナントが存在しません: ${logData.tenantId}`);
    }

    const logId = this.generateLogId();
    const timestamp = new Date();

    const auditLog: TenantAuditLog = {
      id: logId,
      timestamp,
      ...logData,
    };

    // テナント別ログリストに追加
    const tenantLogs = this.auditLogs.get(logData.tenantId) || [];
    tenantLogs.push(auditLog);
    this.auditLogs.set(logData.tenantId, tenantLogs);

    // 重要度に応じたログ出力
    this.logByLevel(auditLog);

    // リアルタイム監視が有効な場合はイベント発火
    if (this.realTimeMonitoring) {
      this.emit('audit-log-recorded', { log: auditLog });

      // セキュリティイベントの場合は特別な通知
      if (
        auditLog.category === 'security' &&
        auditLog.severity === 'critical'
      ) {
        this.emit('security-alert', { log: auditLog });
      }
    }

    return auditLog;
  }

  /**
   * 監査ログの取得
   */
  getAuditLogs(
    tenantId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      action?: string;
      category?: string;
      severity?: string;
      limit?: number;
    }
  ): TenantAuditLog[] {
    let logs = this.auditLogs.get(tenantId) || [];

    // フィルタリング
    if (filters) {
      logs = logs.filter(log => {
        if (filters.startDate && log.timestamp < filters.startDate) {
          return false;
        }
        if (filters.endDate && log.timestamp > filters.endDate) {
          return false;
        }
        if (filters.userId && log.userId !== filters.userId) {
          return false;
        }
        if (filters.action && !log.action.includes(filters.action)) {
          return false;
        }
        if (filters.category && log.category !== filters.category) {
          return false;
        }
        if (filters.severity && log.severity !== filters.severity) {
          return false;
        }
        return true;
      });
    }

    // ソート（新しい順）
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 件数制限
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * 監査ログの検索
   */
  searchAuditLogs(query: {
    tenantIds?: string[];
    searchText?: string;
    startDate?: Date;
    endDate?: Date;
    categories?: string[];
    severities?: string[];
  }): TenantAuditLog[] {
    const results: TenantAuditLog[] = [];
    const tenantsToSearch =
      query.tenantIds || Array.from(this.auditLogs.keys());

    tenantsToSearch.forEach(tenantId => {
      const logs = this.getAuditLogs(tenantId, {
        startDate: query.startDate,
        endDate: query.endDate,
      });

      logs.forEach(log => {
        // カテゴリフィルタ
        if (query.categories && !query.categories.includes(log.category)) {
          return;
        }

        // 重要度フィルタ
        if (query.severities && !query.severities.includes(log.severity)) {
          return;
        }

        // テキスト検索
        if (query.searchText) {
          const searchLower = query.searchText.toLowerCase();
          const matches =
            log.action.toLowerCase().includes(searchLower) ||
            log.resource.name?.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.metadata).toLowerCase().includes(searchLower);

          if (!matches) {
            return;
          }
        }

        results.push(log);
      });
    });

    return results;
  }

  // ===== 監査レポート生成 =====

  /**
   * 監査レポートの生成
   */
  generateAuditReport(
    tenantId: string,
    period: {
      startDate: Date;
      endDate: Date;
    }
  ): {
    tenantId: string;
    period: { startDate: Date; endDate: Date };
    summary: {
      totalLogs: number;
      byCategory: Record<string, number>;
      bySeverity: Record<string, number>;
      byAction: Record<string, number>;
      topUsers: Array<{ userId: string; actionCount: number }>;
    };
    securityEvents: {
      total: number;
      critical: number;
      suspicious: TenantAuditLog[];
    };
    compliance: {
      dataAccess: number;
      configChanges: number;
      userManagement: number;
      apiCalls: number;
    };
    trends: {
      dailyActivity: Array<{ date: string; count: number }>;
      peakHours: Array<{ hour: number; count: number }>;
    };
  } {
    const logs = this.getAuditLogs(tenantId, {
      startDate: period.startDate,
      endDate: period.endDate,
    });

    // カテゴリ別集計
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const userActions: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};
    const hourlyActivity: Record<number, number> = {};

    logs.forEach(log => {
      // カテゴリ
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;

      // 重要度
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;

      // アクション
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // ユーザー
      if (log.userId) {
        userActions[log.userId] = (userActions[log.userId] || 0) + 1;
      }

      // 日別アクティビティ
      const dateKey = log.timestamp.toISOString().split('T')[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;

      // 時間別アクティビティ
      const hour = log.timestamp.getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    // トップユーザー
    const topUsers = Object.entries(userActions)
      .map(([userId, count]) => ({ userId, actionCount: count }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    // セキュリティイベント
    const securityLogs = logs.filter(log => log.category === 'security');
    const criticalLogs = securityLogs.filter(
      log => log.severity === 'critical'
    );
    const suspiciousLogs = this.detectSuspiciousActivity(logs);

    // コンプライアンス関連
    const dataAccessLogs = logs.filter(
      log => log.action.includes('read') || log.action.includes('export')
    );
    const configChangeLogs = logs.filter(
      log => log.action.includes('config') || log.action.includes('setting')
    );
    const userManagementLogs = logs.filter(
      log => log.resource.type === 'user' || log.action.includes('user')
    );
    const apiCallLogs = logs.filter(
      log => log.action.includes('api') || log.category === 'system'
    );

    // 日別トレンド
    const dailyTrend = Object.entries(dailyActivity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ピーク時間
    const peakHours = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);

    return {
      tenantId,
      period,
      summary: {
        totalLogs: logs.length,
        byCategory,
        bySeverity,
        byAction,
        topUsers,
      },
      securityEvents: {
        total: securityLogs.length,
        critical: criticalLogs.length,
        suspicious: suspiciousLogs,
      },
      compliance: {
        dataAccess: dataAccessLogs.length,
        configChanges: configChangeLogs.length,
        userManagement: userManagementLogs.length,
        apiCalls: apiCallLogs.length,
      },
      trends: {
        dailyActivity: dailyTrend,
        peakHours,
      },
    };
  }

  // ===== 異常検知 =====

  /**
   * 疑わしいアクティビティの検出
   */
  private detectSuspiciousActivity(logs: TenantAuditLog[]): TenantAuditLog[] {
    const suspicious: TenantAuditLog[] = [];

    // パターン1: 短時間での大量アクセス
    const accessByUser: Record<string, TenantAuditLog[]> = {};
    logs.forEach(log => {
      if (log.userId) {
        if (!accessByUser[log.userId]) {
          accessByUser[log.userId] = [];
        }
        accessByUser[log.userId].push(log);
      }
    });

    Object.entries(accessByUser).forEach(([userId, userLogs]) => {
      // 5分間に50回以上のアクセス
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentLogs = userLogs.filter(log => log.timestamp > fiveMinutesAgo);
      if (recentLogs.length > 50) {
        suspicious.push(...recentLogs.slice(0, 5)); // 最初の5件を追加
      }
    });

    // パターン2: 権限昇格後の異常なアクセス
    logs.forEach((log, index) => {
      if (log.action.includes('permission') || log.action.includes('role')) {
        // 権限変更後の10件のログをチェック
        const subsequentLogs = logs.slice(index + 1, index + 11);
        const criticalActions = subsequentLogs.filter(
          l =>
            l.severity === 'critical' ||
            l.action.includes('delete') ||
            l.action.includes('export')
        );
        if (criticalActions.length > 3) {
          suspicious.push(log);
        }
      }
    });

    // パターン3: 異常な時間帯のアクセス
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      if (hour >= 2 && hour <= 5) {
        // 深夜2時-5時
        if (log.severity === 'critical' || log.action.includes('export')) {
          suspicious.push(log);
        }
      }
    });

    return suspicious;
  }

  // ===== ログメンテナンス =====

  /**
   * 古いログのクリーンアップ
   */
  private cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    let totalDeleted = 0;

    this.auditLogs.forEach((logs, tenantId) => {
      const before = logs.length;
      const filtered = logs.filter(log => log.timestamp > cutoffDate);

      if (filtered.length < before) {
        this.auditLogs.set(tenantId, filtered);
        const deleted = before - filtered.length;
        totalDeleted += deleted;

        this.logger.info('古い監査ログをクリーンアップしました', {
          tenantId,
          deletedCount: deleted,
          retentionDays: this.retentionDays,
        });
      }
    });

    if (totalDeleted > 0) {
      this.emit('logs-cleaned', { totalDeleted, cutoffDate });
    }
  }

  /**
   * クリーンアップスケジューラーの開始
   */
  private startCleanupScheduler(): void {
    // 毎日午前3時に実行
    const runCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0);

      const msUntilTomorrow = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        this.cleanupOldLogs();
        runCleanup(); // 次回のスケジュール
      }, msUntilTomorrow);
    };

    runCleanup();
  }

  // ===== ヘルパーメソッド =====

  /**
   * ログID生成
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 重要度に応じたログ出力
   */
  private logByLevel(log: TenantAuditLog): void {
    const logData = {
      tenantId: log.tenantId,
      action: log.action,
      resource: log.resource,
      userId: log.userId,
    };

    switch (log.severity) {
      case 'critical':
        this.logger.error(
          `[CRITICAL AUDIT] ${log.action}: ${JSON.stringify(logData)}`
        );
        break;
      case 'error':
        this.logger.error(`[AUDIT] ${log.action}: ${JSON.stringify(logData)}`);
        break;
      case 'warning':
        this.logger.warn(`[AUDIT] ${log.action}`, logData);
        break;
      case 'info':
      default:
        this.logger.info(`[AUDIT] ${log.action}`, logData);
        break;
    }
  }

  /**
   * 設定の更新
   */
  updateSettings(settings: {
    retentionDays?: number;
    realTimeMonitoring?: boolean;
  }): void {
    if (settings.retentionDays !== undefined) {
      this.retentionDays = settings.retentionDays;
    }
    if (settings.realTimeMonitoring !== undefined) {
      this.realTimeMonitoring = settings.realTimeMonitoring;
    }

    this.logger.info('監査設定を更新しました', settings);
    this.emit('settings-updated', settings);
  }

  /**
   * 統計情報の取得
   */
  getStatistics(tenantId?: string): {
    totalLogs: number;
    logsByCategory: Record<string, number>;
    logsBySeverity: Record<string, number>;
    oldestLog?: Date;
    newestLog?: Date;
    averageLogsPerDay: number;
  } {
    let allLogs: TenantAuditLog[] = [];

    if (tenantId) {
      allLogs = this.auditLogs.get(tenantId) || [];
    } else {
      this.auditLogs.forEach(logs => {
        allLogs.push(...logs);
      });
    }

    const logsByCategory: Record<string, number> = {};
    const logsBySeverity: Record<string, number> = {};
    let oldestLog: Date | undefined;
    let newestLog: Date | undefined;

    allLogs.forEach(log => {
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
      logsBySeverity[log.severity] = (logsBySeverity[log.severity] || 0) + 1;

      if (!oldestLog || log.timestamp < oldestLog) {
        oldestLog = log.timestamp;
      }
      if (!newestLog || log.timestamp > newestLog) {
        newestLog = log.timestamp;
      }
    });

    // 平均ログ数/日の計算
    let averageLogsPerDay = 0;
    if (oldestLog && newestLog) {
      const daysDiff = Math.max(
        1,
        (newestLog.getTime() - oldestLog.getTime()) / (1000 * 60 * 60 * 24)
      );
      averageLogsPerDay = Math.round(allLogs.length / daysDiff);
    }

    return {
      totalLogs: allLogs.length,
      logsByCategory,
      logsBySeverity,
      oldestLog,
      newestLog,
      averageLogsPerDay,
    };
  }

  /**
   * システム終了処理
   */
  shutdown(): void {
    this.removeAllListeners();
    this.logger.info('マルチテナント監査管理システムを終了しました');
  }
}
