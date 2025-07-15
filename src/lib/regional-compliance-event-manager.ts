/**
 * 地域別コンプライアンスイベント管理
 * コンプライアンスシステム内のイベント転送と管理を担当
 */

import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type { RegionalComplianceAssessor } from './regional-compliance-assessor.js';
import type { RegionalComplianceDataManager } from './regional-compliance-data-manager.js';
import type { RegionalComplianceReporter } from './regional-compliance-reporter.js';

export class RegionalComplianceEventManager extends EventEmitter {
  private logger: Logger;
  private assessor: RegionalComplianceAssessor;
  private reporter: RegionalComplianceReporter;
  private dataManager: RegionalComplianceDataManager;

  constructor(
    logger: Logger,
    assessor: RegionalComplianceAssessor,
    reporter: RegionalComplianceReporter,
    dataManager: RegionalComplianceDataManager
  ) {
    super();
    this.logger = logger;
    this.assessor = assessor;
    this.reporter = reporter;
    this.dataManager = dataManager;

    this.setupEventForwarding();
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // 評価イベントの転送
    this.assessor.on('assessment-completed', data => {
      this.emit('assessment-completed', data);
      this.dataManager.logAuditEvent({
        action: 'assessment-completed',
        entity: 'assessment',
        entityId: data.assessmentId,
        userId: 'system',
        details: { score: data.score, riskLevel: data.riskLevel },
        result: 'success',
      });
    });

    this.assessor.on('action-updated', data => {
      this.emit('action-updated', data);
      this.dataManager.logAuditEvent({
        action: 'action-updated',
        entity: 'action',
        entityId: data.actionId,
        userId: 'system',
        details: { updates: data.updates },
        result: 'success',
      });
    });

    // レポートイベントの転送
    this.reporter.on('report-generated', data => {
      this.emit('report-generated', data);
      this.dataManager.logAuditEvent({
        action: 'report-generated',
        entity: 'report',
        entityId: data.reportId,
        userId: 'system',
        details: {
          frameworkId: data.frameworkId,
          type: data.type,
          score: data.score,
        },
        result: 'success',
      });
    });

    // データ管理イベントの転送
    this.dataManager.on('data-processing-record-added', data => {
      this.emit('data-processing-record-added', data);
    });

    this.dataManager.on('data-processing-record-removed', data => {
      this.emit('data-processing-record-removed', data);
    });

    this.dataManager.on('incident-recorded', data => {
      this.emit('incident-recorded', data);
      // 重要なインシデントの場合は追加の通知を送信
      if (data.severity === 'critical' || data.severity === 'high') {
        this.emit('critical-incident', data);
        this.logger.warn('重要なコンプライアンスインシデント検出', {
          incidentId: data.id,
          type: data.type,
          severity: data.severity,
        });
      }
    });

    this.dataManager.on('incident-updated', data => {
      this.emit('incident-updated', data);
    });

    this.dataManager.on('audit-logged', data => {
      this.emit('audit-logged', data);
    });

    this.dataManager.on('data-cleared', () => {
      this.emit('data-cleared');
    });
  }

  /**
   * カスタムイベントの発火
   */
  emitCustomEvent(eventName: string, data: unknown): void {
    try {
      this.emit(eventName, data);
      this.dataManager.logAuditEvent({
        action: 'custom-event-emitted',
        entity: 'event',
        entityId: eventName,
        userId: 'system',
        details: { eventName, data },
        result: 'success',
      });
      this.logger.debug('カスタムイベント発火', { eventName });
    } catch (error) {
      this.logger.error('カスタムイベント発火エラー', error as Error);
    }
  }

  /**
   * イベントリスナーの統計取得
   */
  getEventStatistics(): {
    totalListeners: number;
    listenersByEvent: Record<string, number>;
  } {
    const eventNames = this.eventNames();
    const listenersByEvent: Record<string, number> = {};

    eventNames.forEach(eventName => {
      listenersByEvent[eventName.toString()] = this.listenerCount(eventName);
    });

    return {
      totalListeners: eventNames.reduce(
        (total, eventName) => total + this.listenerCount(eventName),
        0
      ),
      listenersByEvent,
    };
  }

  /**
   * すべてのイベントリスナーの削除
   */
  removeAllEventListeners(): void {
    try {
      this.removeAllListeners();
      this.logger.info('すべてのイベントリスナーを削除');
    } catch (error) {
      this.logger.error('イベントリスナー削除エラー', error as Error);
    }
  }
}
