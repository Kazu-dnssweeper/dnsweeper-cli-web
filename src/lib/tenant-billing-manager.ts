/**
 * テナント課金・監査管理モジュール
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type {
  Tenant,
  TenantQuota,
  TenantBilling,
  TenantAuditLog,
} from './multi-tenant-types.js';

export class TenantBillingManager extends EventEmitter {
  private logger: Logger;
  private auditLogs: Map<string, TenantAuditLog[]> = new Map();
  private quotaMonitoringInterval?: NodeJS.Timeout;
  private billingUpdateInterval?: NodeJS.Timeout;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.startQuotaMonitoring();
    this.startBillingUpdates();
  }

  /**
   * クォータ監視の開始
   */
  private startQuotaMonitoring(): void {
    this.quotaMonitoringInterval = setInterval(() => {
      this.emit('quota:check-required');
    }, 300000); // 5分毎
  }

  /**
   * 課金データ更新の開始
   */
  private startBillingUpdates(): void {
    this.billingUpdateInterval = setInterval(() => {
      this.emit('billing:update-required');
    }, 3600000); // 1時間毎
  }

  /**
   * 監視の停止
   */
  stopMonitoring(): void {
    if (this.quotaMonitoringInterval) {
      clearInterval(this.quotaMonitoringInterval);
    }
    if (this.billingUpdateInterval) {
      clearInterval(this.billingUpdateInterval);
    }
  }

  /**
   * クォータ使用量の更新
   */
  async updateUsage(
    tenantId: string,
    quota: TenantQuota,
    usageUpdates: Partial<TenantQuota['current']>
  ): Promise<TenantQuota> {
    const previousUsage = { ...quota.current };

    // 使用量を更新
    Object.assign(quota.current, usageUpdates);

    // クォータ制限のチェック
    this.checkQuotaLimits(tenantId, quota);

    // 使用量変更の記録
    await this.logAction(
      tenantId,
      'system',
      'quota:usage-updated',
      {
        type: 'quota',
        id: tenantId,
        name: 'usage-update',
      },
      {
        previousUsage,
        newUsage: quota.current,
        changes: usageUpdates,
      }
    );

    this.emit('usage:updated', { tenantId, quota, changes: usageUpdates });
    return quota;
  }

  /**
   * クォータ制限のチェック
   */
  private checkQuotaLimits(tenantId: string, quota: TenantQuota): void {
    const { limits, current, alerts } = quota;

    if (!alerts.enabled) {
      return;
    }

    // 各リソースの使用率をチェック
    const checks = [
      {
        name: 'dnsRecords',
        current: current.dnsRecords,
        limit: limits.dnsRecords,
      },
      {
        name: 'queries',
        current: current.queriesThisMonth,
        limit: limits.queriesPerMonth,
      },
      { name: 'users', current: current.users, limit: limits.users },
      { name: 'storage', current: current.storage, limit: limits.storage },
    ];

    for (const check of checks) {
      if (check.limit > 0) {
        const usage = (check.current / check.limit) * 100;

        if (usage >= alerts.thresholds.critical) {
          this.emit('quota:critical', {
            tenantId,
            resource: check.name,
            usage,
            current: check.current,
            limit: check.limit,
          });
        } else if (usage >= alerts.thresholds.warning) {
          this.emit('quota:warning', {
            tenantId,
            resource: check.name,
            usage,
            current: check.current,
            limit: check.limit,
          });
        }
      }
    }
  }

  /**
   * 課金レポートの生成
   */
  generateBillingReport(
    tenantId: string,
    billing: TenantBilling,
    period: { start: Date; end: Date }
  ): {
    tenantId: string;
    period: { start: Date; end: Date };
    subscription: TenantBilling['subscription'];
    usage: TenantBilling['usage'];
    charges: {
      base: number;
      usage: number;
      overages: number;
      total: number;
    };
    invoice?: {
      id: string;
      amount: number;
      dueDate: Date;
      items: Array<{
        description: string;
        amount: number;
        quantity: number;
        unitPrice: number;
      }>;
    };
  } {
    const baseCharge = billing.subscription.plan.price;

    // 使用量課金の計算（簡略化）
    const usageCharge = this.calculateUsageCharges(billing.usage);

    // 超過料金の計算
    const overageCharge = this.calculateOverageCharges(
      billing.usage.overages || {}
    );

    const totalCharge = baseCharge + usageCharge + overageCharge;

    const report = {
      tenantId,
      period,
      subscription: billing.subscription,
      usage: billing.usage,
      charges: {
        base: baseCharge,
        usage: usageCharge,
        overages: overageCharge,
        total: totalCharge,
      },
    };

    // 請求書の生成（必要に応じて）
    if (totalCharge > 0) {
      const invoice = {
        id: `inv_${randomUUID()}`,
        amount: totalCharge,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
        items: [
          {
            description: `${billing.subscription.plan.name} - Base Plan`,
            amount: baseCharge,
            quantity: 1,
            unitPrice: baseCharge,
          },
          ...(usageCharge > 0
            ? [
                {
                  description: 'Usage-based charges',
                  amount: usageCharge,
                  quantity: 1,
                  unitPrice: usageCharge,
                },
              ]
            : []),
          ...(overageCharge > 0
            ? [
                {
                  description: 'Overage charges',
                  amount: overageCharge,
                  quantity: 1,
                  unitPrice: overageCharge,
                },
              ]
            : []),
        ],
      };

      return { ...report, invoice };
    }

    return report;
  }

  private calculateUsageCharges(usage: TenantBilling['usage']): number {
    // 簡略化された使用量課金計算
    let total = 0;

    // ストレージ使用量（1GB超過分について$0.10/GB）
    const storageOverage = Math.max(
      0,
      usage.metrics.storage - 1024 * 1024 * 1024
    );
    total += (storageOverage / (1024 * 1024 * 1024)) * 0.1;

    // API呼び出し（10,000回超過分について$0.01/1000回）
    const apiOverage = Math.max(0, usage.metrics.apiCalls - 10000);
    total += (apiOverage / 1000) * 0.01;

    return Math.round(total * 100) / 100; // 小数点以下2桁に丸める
  }

  private calculateOverageCharges(
    overages: TenantBilling['usage']['overages']
  ): number {
    let total = 0;

    if (overages.queries) {
      total += overages.queries * 0.001; // $0.001 per query
    }

    if (overages.apiCalls) {
      total += (overages.apiCalls / 1000) * 0.05; // $0.05 per 1000 calls
    }

    if (overages.storage) {
      total += (overages.storage / (1024 * 1024 * 1024)) * 0.15; // $0.15 per GB
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * 監査ログの記録
   */
  async logAction(
    tenantId: string,
    userId: string,
    action: string,
    resource: {
      type: string;
      id: string;
      name: string;
    },
    details: Record<string, unknown> = {},
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'DNSweeper/1.0'
  ): Promise<TenantAuditLog> {
    const auditLog: TenantAuditLog = {
      id: randomUUID(),
      tenantId,
      userId,
      action,
      resource,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      details,
      success: true,
    };

    const tenantLogs = this.auditLogs.get(tenantId) || [];
    tenantLogs.push(auditLog);
    this.auditLogs.set(tenantId, tenantLogs);

    this.logger.info('監査ログを記録しました', {
      tenantId,
      userId,
      action,
      resourceType: resource.type,
      resourceId: resource.id,
    });

    this.emit('audit:logged', auditLog);
    return auditLog;
  }

  /**
   * 失敗した操作の監査ログ記録
   */
  async logFailedAction(
    tenantId: string,
    userId: string,
    action: string,
    resource: {
      type: string;
      id: string;
      name: string;
    },
    errorMessage: string,
    details: Record<string, unknown> = {},
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'DNSweeper/1.0'
  ): Promise<TenantAuditLog> {
    const auditLog: TenantAuditLog = {
      id: randomUUID(),
      tenantId,
      userId,
      action,
      resource,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      details,
      success: false,
      errorMessage,
    };

    const tenantLogs = this.auditLogs.get(tenantId) || [];
    tenantLogs.push(auditLog);
    this.auditLogs.set(tenantId, tenantLogs);

    this.logger.warn('失敗した操作の監査ログを記録しました', {
      tenantId,
      userId,
      action,
      errorMessage,
      resourceType: resource.type,
      resourceId: resource.id,
    });

    this.emit('audit:failed-action', auditLog);
    return auditLog;
  }

  /**
   * 監査ログの取得
   */
  getAuditLogs(
    tenantId: string,
    options: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): TenantAuditLog[] {
    let logs = this.auditLogs.get(tenantId) || [];

    // フィルタリング
    if (options.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }

    if (options.action) {
      logs = logs.filter(log => log.action === options.action);
    }

    if (options.resourceType) {
      logs = logs.filter(log => log.resource.type === options.resourceType);
    }

    if (options.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }

    if (options.success !== undefined) {
      logs = logs.filter(log => log.success === options.success);
    }

    // ソート（新しい順）
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // ページネーション
    if (options.offset) {
      logs = logs.slice(options.offset);
    }

    if (options.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * 監査ログ統計の取得
   */
  getAuditStatistics(
    tenantId: string,
    period: { start: Date; end: Date }
  ): {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    userActivity: Record<string, number>;
    resourceActivity: Record<string, number>;
  } {
    const logs = this.getAuditLogs(tenantId, {
      startDate: period.start,
      endDate: period.end,
    });

    const actionsByType: Record<string, number> = {};
    const userActivity: Record<string, number> = {};
    const resourceActivity: Record<string, number> = {};

    let successfulActions = 0;
    let failedActions = 0;

    for (const log of logs) {
      // アクション種別カウント
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

      // ユーザー活動カウント
      userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;

      // リソース活動カウント
      resourceActivity[log.resource.type] =
        (resourceActivity[log.resource.type] || 0) + 1;

      // 成功/失敗カウント
      if (log.success) {
        successfulActions++;
      } else {
        failedActions++;
      }
    }

    return {
      totalActions: logs.length,
      successfulActions,
      failedActions,
      actionsByType,
      userActivity,
      resourceActivity,
    };
  }

  /**
   * 監査ログのエクスポート
   */
  exportAuditLogs(
    tenantId: string,
    format: 'json' | 'csv',
    options: {
      startDate?: Date;
      endDate?: Date;
      includeDetails?: boolean;
    } = {}
  ): string {
    const logs = this.getAuditLogs(tenantId, {
      startDate: options.startDate,
      endDate: options.endDate,
    });

    if (format === 'json') {
      return JSON.stringify(
        options.includeDetails
          ? logs
          : logs.map(log => ({
              id: log.id,
              timestamp: log.timestamp,
              userId: log.userId,
              action: log.action,
              resourceType: log.resource.type,
              resourceId: log.resource.id,
              success: log.success,
              errorMessage: log.errorMessage,
            })),
        null,
        2
      );
    }

    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Action',
      'Resource Type',
      'Resource ID',
      'Success',
      'Error Message',
      'IP Address',
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.userId,
      log.action,
      log.resource.type,
      log.resource.id,
      log.success.toString(),
      log.errorMessage || '',
      log.ipAddress,
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * 課金データのクリーンアップ（古いデータの削除）
   */
  async cleanupOldData(retentionDays: number = 365): Promise<void> {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    for (const [tenantId, logs] of this.auditLogs.entries()) {
      const filteredLogs = logs.filter(log => log.timestamp >= cutoffDate);
      const removedCount = logs.length - filteredLogs.length;

      if (removedCount > 0) {
        this.auditLogs.set(tenantId, filteredLogs);
        this.logger.info('古い監査ログを削除しました', {
          tenantId,
          removedCount,
          retentionDays,
        });
      }
    }

    this.emit('data:cleanup-completed', { retentionDays });
  }
}
