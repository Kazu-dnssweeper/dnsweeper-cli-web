/**
 * 地域別コンプライアンスデータ管理
 * データ処理記録とインシデントの管理を担当
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type {
  DataProcessingRecord,
  ComplianceIncident,
  ComplianceAuditLog,
} from './regional-compliance-types.js';

export class RegionalComplianceDataManager extends EventEmitter {
  private logger: Logger;
  private dataProcessingRecords: Map<string, DataProcessingRecord>;
  private incidents: Map<string, ComplianceIncident>;
  private auditLogs: ComplianceAuditLog[];

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.dataProcessingRecords = new Map();
    this.incidents = new Map();
    this.auditLogs = [];
  }

  /**
   * データ処理記録の追加
   */
  addDataProcessingRecord(record: DataProcessingRecord): void {
    try {
      this.dataProcessingRecords.set(record.id, record);
      this.emit('data-processing-record-added', record);
      
      this.logAuditEvent({
        action: 'data-processing-record-added',
        entity: 'data-processing-record',
        entityId: record.id,
        userId: 'system',
        details: { purpose: record.processingPurpose, dataTypes: record.dataCategories },
        result: 'success',
      });

      this.logger.info('データ処理記録追加', { recordId: record.id });
    } catch (error) {
      this.logger.error('データ処理記録追加エラー', error as Error);
      throw error;
    }
  }

  /**
   * データ処理記録の取得
   */
  getDataProcessingRecord(recordId: string): DataProcessingRecord | undefined {
    return this.dataProcessingRecords.get(recordId);
  }

  /**
   * すべてのデータ処理記録の取得
   */
  getAllDataProcessingRecords(): DataProcessingRecord[] {
    return Array.from(this.dataProcessingRecords.values());
  }

  /**
   * データ処理記録の削除
   */
  removeDataProcessingRecord(recordId: string): boolean {
    try {
      const deleted = this.dataProcessingRecords.delete(recordId);
      if (deleted) {
        this.emit('data-processing-record-removed', { recordId });
        this.logAuditEvent({
          action: 'data-processing-record-removed',
          entity: 'data-processing-record',
          entityId: recordId,
          userId: 'system',
          details: {},
          result: 'success',
        });
        this.logger.info('データ処理記録削除', { recordId });
      }
      return deleted;
    } catch (error) {
      this.logger.error('データ処理記録削除エラー', error as Error);
      throw error;
    }
  }

  /**
   * インシデントの記録
   */
  recordIncident(incident: ComplianceIncident): void {
    try {
      this.incidents.set(incident.id, incident);
      this.emit('incident-recorded', incident);
      
      this.logAuditEvent({
        action: 'incident-recorded',
        entity: 'incident',
        entityId: incident.id,
        userId: 'system',
        details: { 
          type: incident.type, 
          severity: incident.severity,
          frameworks: incident.affectedSystems 
        },
        result: 'success',
      });

      this.logger.warn('コンプライアンスインシデント記録', {
        incidentId: incident.id,
        type: incident.type,
        severity: incident.severity,
      });
    } catch (error) {
      this.logger.error('インシデント記録エラー', error as Error);
      throw error;
    }
  }

  /**
   * インシデントの取得
   */
  getIncident(incidentId: string): ComplianceIncident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * すべてのインシデントの取得
   */
  getAllIncidents(): ComplianceIncident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * インシデントの更新
   */
  updateIncident(incidentId: string, updates: Partial<ComplianceIncident>): boolean {
    try {
      const incident = this.incidents.get(incidentId);
      if (!incident) {
        return false;
      }

      const updatedIncident = { ...incident, ...updates, updatedAt: new Date() };
      this.incidents.set(incidentId, updatedIncident);
      
      this.emit('incident-updated', { incidentId, updates });
      this.logAuditEvent({
        action: 'incident-updated',
        entity: 'incident',
        entityId: incidentId,
        userId: 'system',
        details: { updates },
        result: 'success',
      });

      this.logger.info('インシデント更新', { incidentId, updates });
      return true;
    } catch (error) {
      this.logger.error('インシデント更新エラー', error as Error);
      throw error;
    }
  }

  /**
   * 監査ログの記録
   */
  logAuditEvent(event: Omit<ComplianceAuditLog, 'id' | 'timestamp'>): void {
    try {
      const auditLog: ComplianceAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...event,
      };

      this.auditLogs.push(auditLog);
      this.emit('audit-logged', auditLog);

      this.logger.debug('監査ログ記録', {
        action: event.action,
        entity: event.entity,
        result: event.result,
      });
    } catch (error) {
      this.logger.error('監査ログ記録エラー', error as Error);
    }
  }

  /**
   * 監査ログの取得
   */
  getAuditLogs(filters?: {
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): ComplianceAuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.entity) {
        logs = logs.filter(log => log.entity === filters.entity);
      }
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    dataProcessingRecords: number;
    incidents: number;
    auditLogs: number;
    incidentsBySeverity: Record<string, number>;
  } {
    const incidentsBySeverity: Record<string, number> = {};
    
    this.getAllIncidents().forEach(incident => {
      incidentsBySeverity[incident.severity] = 
        (incidentsBySeverity[incident.severity] || 0) + 1;
    });

    return {
      dataProcessingRecords: this.dataProcessingRecords.size,
      incidents: this.incidents.size,
      auditLogs: this.auditLogs.length,
      incidentsBySeverity,
    };
  }

  /**
   * データのクリア
   */
  clearData(): void {
    try {
      this.dataProcessingRecords.clear();
      this.incidents.clear();
      this.auditLogs.length = 0;
      
      this.emit('data-cleared');
      this.logger.info('コンプライアンスデータクリア完了');
    } catch (error) {
      this.logger.error('データクリアエラー', error as Error);
      throw error;
    }
  }
}