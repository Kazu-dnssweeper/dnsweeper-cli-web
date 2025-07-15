/**
 * 地域別コンプライアンス管理システム - リファクタリング版
 *
 * 分離された機能モジュールを統合する軽量なマネージャークラス
 */

import { EventEmitter } from 'events';

import { I18nManager } from './i18n-manager.js';
import { Logger } from './logger.js';
import { RegionalComplianceAssessor } from './regional-compliance-assessor.js';
import { RegionalComplianceAutomation } from './regional-compliance-automation.js';
import { RegionalComplianceDataManager } from './regional-compliance-data-manager.js';
import { RegionalComplianceEventManager } from './regional-compliance-event-manager.js';
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

  // コアコンポーネント
  private frameworks: RegionalComplianceFrameworks;
  private assessor: RegionalComplianceAssessor;
  private reporter: RegionalComplianceReporter;
  private dataManager: RegionalComplianceDataManager;
  private eventManager: RegionalComplianceEventManager;
  private automation: RegionalComplianceAutomation;

  constructor(
    logger?: Logger,
    i18nManager?: I18nManager,
    options: RegionalComplianceManagerOptions = {}
  ) {
    super();

    this.logger = logger || new Logger({ logLevel: 'info' });
    this.i18nManager = i18nManager || new I18nManager();

    // デフォルトオプションの設定
    this.options = {
      enableAutomaticAssessment: false,
      assessmentInterval: 86400000, // 24時間
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
    this.dataManager = new RegionalComplianceDataManager(this.logger);
    this.eventManager = new RegionalComplianceEventManager(
      this.logger,
      this.assessor,
      this.reporter,
      this.dataManager
    );
    this.automation = new RegionalComplianceAutomation(
      this.logger,
      this.assessor,
      this.reporter,
      this.dataManager,
      {
        enableAutomaticAssessment: this.options.enableAutomaticAssessment,
        automaticAssessmentInterval: this.options.assessmentInterval,
        enableReporting: this.options.enableReporting,
        automaticReportingInterval: this.options.reportingInterval,
        enableIncidentDetection: this.options.enableIncidentTracking,
      }
    );

    // イベント転送の設定
    this.setupEventForwarding();

    // 自動化システムの開始
    if (
      this.options.enableAutomaticAssessment ||
      this.options.enableReporting
    ) {
      this.automation.start();
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
    // すべてのイベントを親クラスに転送
    this.eventManager.on('assessment-completed', data =>
      this.emit('assessment-completed', data)
    );
    this.eventManager.on('action-updated', data =>
      this.emit('action-updated', data)
    );
    this.eventManager.on('report-generated', data =>
      this.emit('report-generated', data)
    );
    this.eventManager.on('data-processing-record-added', data =>
      this.emit('data-processing-record-added', data)
    );
    this.eventManager.on('incident-recorded', data =>
      this.emit('incident-recorded', data)
    );
    this.eventManager.on('critical-incident', data =>
      this.emit('critical-incident', data)
    );

    this.automation.on('automation-started', () =>
      this.emit('automation-started')
    );
    this.automation.on('automation-stopped', () =>
      this.emit('automation-stopped')
    );
    this.automation.on('scheduled-assessment-completed', data =>
      this.emit('scheduled-assessment-completed', data)
    );
    this.automation.on('scheduled-report-generated', data =>
      this.emit('scheduled-report-generated', data)
    );
  }

  // ===== フレームワーク管理 =====

  getAllFrameworks(): ComplianceFramework[] {
    return this.frameworks.getAllFrameworks();
  }

  getFramework(frameworkId: string): ComplianceFramework | undefined {
    return this.frameworks.getFramework(frameworkId);
  }

  addCustomFramework(framework: ComplianceFramework): void {
    this.frameworks.addFramework(framework);
  }

  // ===== 評価管理 =====

  async assessCompliance(
    frameworkId: string,
    options?: { includeRecommendations?: boolean; generateReport?: boolean }
  ): Promise<ComplianceAssessment> {
    // フレームワーク取得と評価実行
    const framework = this.frameworks.getFramework(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }
    return this.assessor.runComplianceAssessment(framework);
  }

  async updateAction(
    actionId: string,
    updates: Partial<ComplianceAction>
  ): Promise<void> {
    return this.assessor.updateAction(actionId, updates);
  }

  // ===== レポート管理 =====

  async generateReport(
    type: 'daily' | 'weekly' | 'monthly' | 'yearly',
    options?: {
      includeMetrics?: boolean;
      includeRecommendations?: boolean;
      format?: 'summary' | 'detailed';
    }
  ): Promise<ComplianceReport> {
    return this.reporter.generateComplianceReport(type, options);
  }

  async exportReport(
    reportId: string,
    format: 'pdf' | 'xlsx' | 'csv'
  ): Promise<Buffer> {
    return this.reporter.exportReport(reportId, format);
  }

  // ===== データ管理 =====

  addDataProcessingRecord(record: DataProcessingRecord): void {
    this.dataManager.addDataProcessingRecord(record);
  }

  getDataProcessingRecord(recordId: string): DataProcessingRecord | undefined {
    return this.dataManager.getDataProcessingRecord(recordId);
  }

  getAllDataProcessingRecords(): DataProcessingRecord[] {
    return this.dataManager.getAllDataProcessingRecords();
  }

  recordIncident(incident: ComplianceIncident): void {
    this.dataManager.recordIncident(incident);
  }

  getIncident(incidentId: string): ComplianceIncident | undefined {
    return this.dataManager.getIncident(incidentId);
  }

  getAllIncidents(): ComplianceIncident[] {
    return this.dataManager.getAllIncidents();
  }

  updateIncident(
    incidentId: string,
    updates: Partial<ComplianceIncident>
  ): boolean {
    return this.dataManager.updateIncident(incidentId, updates);
  }

  // ===== 監査ログ =====

  getAuditLogs(filters?: {
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): ComplianceAuditLog[] {
    return this.dataManager.getAuditLogs(filters);
  }

  // ===== 自動化管理 =====

  async runManualAssessment(frameworkId: string): Promise<void> {
    return this.automation.runManualAssessment(frameworkId);
  }

  async runManualReporting(
    type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Promise<void> {
    return this.automation.runManualReporting(type);
  }

  startAutomation(): void {
    this.automation.start();
  }

  stopAutomation(): void {
    this.automation.stop();
  }

  updateAutomationOptions(
    options: Parameters<typeof this.automation.updateOptions>[0]
  ): void {
    this.automation.updateOptions(options);
  }

  getAutomationStatus(): ReturnType<typeof this.automation.getStatus> {
    return this.automation.getStatus();
  }

  // ===== 統計とメトリクス =====

  getStatistics(): {
    frameworks: number;
    assessments: number;
    reports: number;
    dataProcessingRecords: number;
    incidents: number;
    auditLogs: number;
  } {
    const dataStats = this.dataManager.getStatistics();
    return {
      frameworks: this.frameworks.getAllFrameworks().length,
      assessments: 0, // 実装が必要
      reports: 0, // 実装が必要
      ...dataStats,
    };
  }

  getComplianceOverview(): {
    overallScore: number;
    frameworkScores: Array<{
      frameworkId: string;
      score: number;
      riskLevel: string;
    }>;
    criticalGaps: number;
    overdueActions: number;
    recentIncidents: number;
  } {
    // 簡易実装 - 実際はより詳細な分析が必要
    return {
      overallScore: 85,
      frameworkScores: [],
      criticalGaps: 0,
      overdueActions: 0,
      recentIncidents: this.dataManager
        .getAllIncidents()
        .filter(
          incident =>
            incident.detectedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
    };
  }

  // ===== システム管理 =====

  async initialize(): Promise<void> {
    try {
      // 追加の初期化処理があればここに実装
      this.logger.info('地域別コンプライアンス管理システム初期化');
    } catch (error) {
      this.logger.error('初期化エラー', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.automation.stop();
      this.eventManager.removeAllEventListeners();
      this.removeAllListeners();

      this.logger.info('地域別コンプライアンス管理システム終了');
    } catch (error) {
      this.logger.error('終了処理エラー', error as Error);
      throw error;
    }
  }

  // ===== ヘルス状態 =====

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, { status: string; lastCheck: Date }>;
    issues: string[];
  } {
    const issues: string[] = [];
    const components = {
      frameworks: { status: 'healthy', lastCheck: new Date() },
      assessor: { status: 'healthy', lastCheck: new Date() },
      reporter: { status: 'healthy', lastCheck: new Date() },
      dataManager: { status: 'healthy', lastCheck: new Date() },
      automation: {
        status: this.automation.getStatus().isRunning ? 'healthy' : 'degraded',
        lastCheck: new Date(),
      },
    };

    const overallStatus = Object.values(components).some(
      c => c.status === 'unhealthy'
    )
      ? 'unhealthy'
      : Object.values(components).some(c => c.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    return {
      status: overallStatus,
      components,
      issues,
    };
  }
}

// 後方互換性のためのエクスポート
export default RegionalComplianceManager;

// 型定義の再エクスポート
export type {
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
