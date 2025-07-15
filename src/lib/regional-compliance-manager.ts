/**
 * 地域別コンプライアンス管理システム - メインクラス
 *
 * 分離された機能モジュールを統合する軽量なマネージャークラス
 */

import { EventEmitter } from 'events';

import { I18nManager } from './i18n-manager.js';
import { Logger } from './logger.js';
import { RegionalComplianceAssessor } from './regional-compliance-assessor.js';
import { RegionalComplianceFrameworks } from './regional-compliance-frameworks.js';
import { RegionalComplianceReporter } from './regional-compliance-reporter.js';

import type {
  RegionalComplianceManagerOptions,
  ComplianceFramework,
  ComplianceAssessment,
  ComplianceReport,
  ComplianceGap,
  ComplianceAction,
  ComplianceCertification,
  DataProcessingRecord,
  ComplianceIncident,
  ComplianceAuditLog,
} from './regional-compliance-types.js';

export class RegionalComplianceManager extends EventEmitter {
  private logger: Logger;
  private i18nManager: I18nManager;
  private options: RegionalComplianceManagerOptions;
  private frameworks: RegionalComplianceFrameworks;
  private assessor: RegionalComplianceAssessor;
  private reporter: RegionalComplianceReporter;

  // 追加データ管理
  private dataProcessingRecords: Map<string, DataProcessingRecord>;
  private incidents: Map<string, ComplianceIncident>;
  private assessmentInterval?: NodeJS.Timeout;
  private reportingInterval?: NodeJS.Timeout;

  constructor(
    logger?: Logger,
    i18nManager?: I18nManager,
    options: RegionalComplianceManagerOptions = {}
  ) {
    super();

    this.logger = logger || new Logger({ logLevel: 'info' });
    this.i18nManager = i18nManager || new I18nManager();
    this.options = {
      enableAutomaticAssessment: true,
      assessmentInterval: 86400000, // 24時間
      enableAlerts: true,
      alertThresholds: {
        complianceScore: 80,
        criticalGaps: 5,
        overdueActions: 10,
      },
      enableReporting: true,
      reportingInterval: 604800000, // 7日
      enableDataProcessingLog: true,
      enableIncidentTracking: true,
      enableCertificationManagement: true,
      auditLogPath: './audit-logs',
      dataPath: './compliance-data',
      ...options,
    };

    // コンポーネントの初期化
    this.frameworks = new RegionalComplianceFrameworks(this.logger);
    this.assessor = new RegionalComplianceAssessor(this.logger);
    this.reporter = new RegionalComplianceReporter(
      this.logger,
      this.options.dataPath
    );

    // 追加データの初期化
    this.dataProcessingRecords = new Map();
    this.incidents = new Map();

    // イベント転送の設定
    this.setupEventForwarding();

    // 自動機能の開始
    if (this.options.enableAutomaticAssessment) {
      this.startAutomaticAssessment();
    }

    if (this.options.enableReporting) {
      this.startAutomaticReporting();
    }

    this.logger.info('地域別コンプライアンス管理システム初期化完了', {
      frameworks: this.frameworks.getAllFrameworks().length,
      options: this.options,
    });
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // 評価イベントの転送
    this.assessor.on('assessment-completed', data => {
      this.emit('assessment-completed', data);
      this.logAuditEvent({
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
      this.logAuditEvent({
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
      this.logAuditEvent({
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
  }

  /**
   * 自動評価の開始
   */
  private startAutomaticAssessment(): void {
    this.assessmentInterval = setInterval(async () => {
      try {
        await this.runAutomaticAssessments();
      } catch (error) {
        this.logger.error('自動評価エラー', error as Error);
      }
    }, this.options.assessmentInterval);

    this.logger.info('自動評価開始', {
      interval: this.options.assessmentInterval,
    });
  }

  /**
   * 自動レポート生成の開始
   */
  private startAutomaticReporting(): void {
    this.reportingInterval = setInterval(async () => {
      try {
        await this.generateAutomaticReports();
      } catch (error) {
        this.logger.error('自動レポート生成エラー', error as Error);
      }
    }, this.options.reportingInterval);

    this.logger.info('自動レポート生成開始', {
      interval: this.options.reportingInterval,
    });
  }

  /**
   * 自動評価の実行
   */
  private async runAutomaticAssessments(): Promise<void> {
    const frameworks = this.frameworks.getAllFrameworks();

    for (const framework of frameworks) {
      if (framework.status === 'active') {
        try {
          const assessment =
            await this.assessor.runComplianceAssessment(framework);

          // アラートチェック
          if (this.options.enableAlerts) {
            await this.checkAlerts(assessment);
          }

          this.logger.info('自動評価完了', {
            framework: framework.id,
            score: assessment.overallScore,
            gaps: assessment.gaps.length,
          });
        } catch (error) {
          this.logger.error(
            `フレームワーク ${framework.id} の自動評価エラー`,
            error as Error
          );
        }
      }
    }
  }

  /**
   * 自動レポート生成
   */
  private async generateAutomaticReports(): Promise<void> {
    const frameworks = this.frameworks.getAllFrameworks();

    for (const framework of frameworks) {
      if (framework.status === 'active') {
        try {
          const assessments = this.assessor.getAssessmentsByFramework(
            framework.id
          );
          const latestAssessment = assessments.sort(
            (a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime()
          )[0];

          if (latestAssessment) {
            await this.reporter.generateComplianceReport(
              framework,
              latestAssessment,
              'assessment',
              {
                includeExecutiveSummary: true,
                includeDetailedFindings: true,
                includeActionPlan: true,
              }
            );
          }
        } catch (error) {
          this.logger.error(
            `フレームワーク ${framework.id} の自動レポート生成エラー`,
            error as Error
          );
        }
      }
    }
  }

  /**
   * アラートチェック
   */
  private async checkAlerts(assessment: ComplianceAssessment): Promise<void> {
    const thresholds = this.options.alertThresholds!;
    const alerts: string[] = [];

    // スコアアラート
    if (assessment.overallScore < thresholds.complianceScore) {
      alerts.push(
        `コンプライアンススコアが閾値を下回りました: ${Math.round(assessment.overallScore)}% < ${thresholds.complianceScore}%`
      );
    }

    // 重要ギャップアラート
    const criticalGaps = assessment.gaps.filter(
      g => g.severity === 'critical'
    ).length;
    if (criticalGaps >= thresholds.criticalGaps) {
      alerts.push(
        `重要ギャップが閾値を超えました: ${criticalGaps}件 >= ${thresholds.criticalGaps}件`
      );
    }

    // 期限切れアクションアラート
    const overdueActions = this.assessor
      .getAllActions()
      .filter(a => a.dueDate < new Date() && a.status !== 'completed').length;
    if (overdueActions >= thresholds.overdueActions) {
      alerts.push(
        `期限切れアクションが閾値を超えました: ${overdueActions}件 >= ${thresholds.overdueActions}件`
      );
    }

    // アラート発出
    if (alerts.length > 0) {
      this.emit('compliance-alert', {
        assessmentId: assessment.id,
        frameworkId: assessment.frameworkId,
        alerts,
        riskLevel: assessment.riskLevel,
        score: assessment.overallScore,
      });

      this.logger.warn('コンプライアンスアラート', {
        assessmentId: assessment.id,
        alerts,
      });
    }
  }

  /**
   * データ処理記録の登録
   */
  registerDataProcessing(
    record: Omit<DataProcessingRecord, 'id' | 'timestamp'>
  ): string {
    const id = `processing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullRecord: DataProcessingRecord = {
      id,
      timestamp: new Date(),
      ...record,
    };

    this.dataProcessingRecords.set(id, fullRecord);

    this.emit('data-processing-registered', { recordId: id });
    this.logAuditEvent({
      action: 'data-processing-registered',
      entity: 'data-processing',
      entityId: id,
      userId: 'system',
      details: {
        purpose: record.processingPurpose,
        categories: record.dataCategories,
      },
      result: 'success',
    });

    return id;
  }

  /**
   * インシデント登録
   */
  registerIncident(
    incident: Omit<ComplianceIncident, 'id' | 'reportedAt' | 'lastUpdated'>
  ): string {
    const id = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullIncident: ComplianceIncident = {
      id,
      reportedAt: new Date(),
      lastUpdated: new Date(),
      ...incident,
    };

    this.incidents.set(id, fullIncident);

    this.emit('incident-registered', {
      incidentId: id,
      severity: incident.severity,
    });
    this.logAuditEvent({
      action: 'incident-registered',
      entity: 'incident',
      entityId: id,
      userId: incident.reportedBy,
      details: { type: incident.type, severity: incident.severity },
      result: 'success',
    });

    return id;
  }

  /**
   * インシデント更新
   */
  updateIncident(id: string, updates: Partial<ComplianceIncident>): boolean {
    const incident = this.incidents.get(id);
    if (!incident) {
      return false;
    }

    const updatedIncident = {
      ...incident,
      ...updates,
      lastUpdated: new Date(),
    };

    this.incidents.set(id, updatedIncident);

    this.emit('incident-updated', {
      incidentId: id,
      updates: Object.keys(updates),
    });
    this.logAuditEvent({
      action: 'incident-updated',
      entity: 'incident',
      entityId: id,
      userId: 'system',
      details: { updates: Object.keys(updates) },
      result: 'success',
    });

    return true;
  }

  /**
   * 監査ログ記録
   */
  private logAuditEvent(
    event: Omit<ComplianceAuditLog, 'id' | 'timestamp'>
  ): void {
    if (this.options.enableDataProcessingLog) {
      this.reporter.logAuditEvent(event);
    }
  }

  /**
   * パブリックAPIメソッド
   */

  // フレームワーク管理
  getFrameworks(): ComplianceFramework[] {
    return this.frameworks.getAllFrameworks();
  }

  getFramework(id: string): ComplianceFramework | undefined {
    return this.frameworks.getFramework(id);
  }

  addFramework(framework: ComplianceFramework): void {
    this.frameworks.addFramework(framework);
  }

  // 評価管理
  async runAssessment(
    frameworkId: string
  ): Promise<ComplianceAssessment | null> {
    const framework = this.frameworks.getFramework(frameworkId);
    if (!framework) {
      this.logger.warn('フレームワークが見つかりません', { frameworkId });
      return null;
    }

    return await this.assessor.runComplianceAssessment(framework);
  }

  getAssessments(): ComplianceAssessment[] {
    return this.assessor.getAllAssessments();
  }

  getAssessment(id: string): ComplianceAssessment | undefined {
    return this.assessor.getAssessment(id);
  }

  // アクション管理
  getActions(): ComplianceAction[] {
    return this.assessor.getAllActions();
  }

  getAction(id: string): ComplianceAction | undefined {
    return this.assessor.getAction(id);
  }

  updateAction(id: string, updates: Partial<ComplianceAction>): boolean {
    return this.assessor.updateAction(id, updates);
  }

  // レポート管理
  async generateReport(
    frameworkId: string,
    type:
      | 'assessment'
      | 'gap-analysis'
      | 'remediation'
      | 'certification' = 'assessment'
  ): Promise<ComplianceReport | null> {
    const framework = this.frameworks.getFramework(frameworkId);
    if (!framework) {
      return null;
    }

    const assessments = this.assessor.getAssessmentsByFramework(frameworkId);
    const latestAssessment = assessments.sort(
      (a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime()
    )[0];

    if (!latestAssessment) {
      this.logger.warn('評価結果が見つかりません', { frameworkId });
      return null;
    }

    return await this.reporter.generateComplianceReport(
      framework,
      latestAssessment,
      type
    );
  }

  getReports(): ComplianceReport[] {
    return this.reporter.getAllReports();
  }

  getReport(id: string): ComplianceReport | undefined {
    return this.reporter.getReport(id);
  }

  // 証明書管理
  getCertifications(): ComplianceCertification[] {
    return this.reporter.getAllCertifications();
  }

  getActiveCertifications(): ComplianceCertification[] {
    return this.reporter.getActiveCertifications();
  }

  // データ処理記録管理
  getDataProcessingRecords(): DataProcessingRecord[] {
    return Array.from(this.dataProcessingRecords.values());
  }

  getDataProcessingRecord(id: string): DataProcessingRecord | undefined {
    return this.dataProcessingRecords.get(id);
  }

  // インシデント管理
  getIncidents(): ComplianceIncident[] {
    return Array.from(this.incidents.values());
  }

  getIncident(id: string): ComplianceIncident | undefined {
    return this.incidents.get(id);
  }

  getOpenIncidents(): ComplianceIncident[] {
    return Array.from(this.incidents.values()).filter(i => i.status === 'open');
  }

  // 監査ログ管理
  getAuditLogs(
    filters?: Parameters<typeof this.reporter.getAuditLogs>[0]
  ): ComplianceAuditLog[] {
    return this.reporter.getAuditLogs(filters);
  }

  // 統計情報
  getStatistics(): {
    frameworks: ReturnType<
      RegionalComplianceFrameworks['getFrameworkStatistics']
    >;
    assessments: ReturnType<
      RegionalComplianceAssessor['getAssessmentStatistics']
    >;
    dataProcessing: {
      total: number;
      active: number;
      byPurpose: Record<string, number>;
    };
    incidents: {
      total: number;
      open: number;
      bySeverity: Record<string, number>;
    };
  } {
    const dataProcessingRecords = Array.from(
      this.dataProcessingRecords.values()
    );
    const incidents = Array.from(this.incidents.values());

    const dataProcessingByPurpose: Record<string, number> = {};
    dataProcessingRecords.forEach(record => {
      dataProcessingByPurpose[record.processingPurpose] =
        (dataProcessingByPurpose[record.processingPurpose] || 0) + 1;
    });

    const incidentsBySeverity: Record<string, number> = {};
    incidents.forEach(incident => {
      incidentsBySeverity[incident.severity] =
        (incidentsBySeverity[incident.severity] || 0) + 1;
    });

    return {
      frameworks: this.frameworks.getFrameworkStatistics(),
      assessments: this.assessor.getAssessmentStatistics(),
      dataProcessing: {
        total: dataProcessingRecords.length,
        active: dataProcessingRecords.filter(r => r.isActive).length,
        byPurpose: dataProcessingByPurpose,
      },
      incidents: {
        total: incidents.length,
        open: incidents.filter(i => i.status === 'open').length,
        bySeverity: incidentsBySeverity,
      },
    };
  }

  /**
   * 正常終了処理
   */
  async shutdown(): Promise<void> {
    try {
      if (this.assessmentInterval) {
        clearInterval(this.assessmentInterval);
      }

      if (this.reportingInterval) {
        clearInterval(this.reportingInterval);
      }

      this.logger.info('地域別コンプライアンス管理システム終了');
    } catch (error) {
      this.logger.error('終了処理エラー', error as Error);
    }
  }
}

// 後方互換性のためのエクスポート
export default RegionalComplianceManager;

// 型定義の再エクスポート
export type * from './regional-compliance-types.js';
