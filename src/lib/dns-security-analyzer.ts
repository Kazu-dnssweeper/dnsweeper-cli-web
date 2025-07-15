/**
 * DNS脅威検出・防御システム - リファクタリング版
 *
 * 分離された機能モジュールを統合する軽量なコーディネータークラス
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';
import { NetworkAnalyzer } from './network-analysis.js';
import { ReputationService } from './reputation-service.js';
import { ThreatDetectors } from './threat-detectors.js';
import { DNSAlgorithmicAnalyzer } from './dns-algorithmic-analyzer.js';
import { DNSSecurityStatistics } from './dns-security-statistics.js';
import { DNSThreatRules } from './dns-threat-rules.js';

import type {
  SecurityThreat,
  SecurityConfig,
  ThreatDetectionResult,
  ThreatStatistics,
  NetworkAnalysis,
  ReputationData,
  AlgorithmicAnalysis,
} from './security-types.js';
import type { IDNSRecord as DNSRecord } from '../types/index.js';

/**
 * DNS脅威検出・防御システム - メインコーディネーター
 */
export class DNSSecurityAnalyzer extends EventEmitter {
  private logger: Logger;
  private config: SecurityConfig;
  private monitoringInterval?: NodeJS.Timeout;

  // 機能モジュール
  private threatDetectors: ThreatDetectors;
  private networkAnalyzer: NetworkAnalyzer;
  private reputationService: ReputationService;
  private algorithmicAnalyzer: DNSAlgorithmicAnalyzer;
  private statistics: DNSSecurityStatistics;
  private ruleEngine: DNSThreatRules;

  constructor(logger?: Logger, config?: Partial<SecurityConfig>) {
    super();

    this.logger = logger || new Logger({ verbose: false });
    this.config = {
      threatDetection: {
        enabledAnalyzers: [
          'malware',
          'phishing',
          'typosquatting',
          'dga',
          'fastflux',
          'dns_hijacking',
          'cache_poisoning',
        ],
        confidenceThreshold: 0.7,
        realTimeMonitoring: false,
      },
      monitoring: {
        enabled: true,
        interval: 300000, // 5分
        alertThresholds: {
          critical: 1,
          high: 5,
          medium: 10,
          low: 20,
        },
      },
      response: {
        autoBlock: false,
        autoQuarantine: true,
        notificationEnabled: true,
        logLevel: 'info',
      },
      reputationChecking: {
        enabledSources: ['virustotal', 'urlvoid'],
        cacheTimeout: 3600,
        parallelChecks: 5,
      },
      alerting: {
        enabledChannels: ['console', 'log'],
        severityThreshold: 'medium',
        rateLimiting: true,
        cooldownPeriod: 300,
      },
      responseActions: {
        autoQuarantine: true,
        autoBlock: false,
        notifications: true,
        logActions: true,
      },
      ...config,
    };

    // 機能モジュールの初期化
    this.threatDetectors = new ThreatDetectors(this.logger, this.config);
    this.networkAnalyzer = new NetworkAnalyzer(this.logger, this.config);
    this.reputationService = new ReputationService(this.logger, this.config);
    this.algorithmicAnalyzer = new DNSAlgorithmicAnalyzer(this.logger);
    this.statistics = new DNSSecurityStatistics(this.logger);
    this.ruleEngine = new DNSThreatRules(this.logger, this.config);

    // 設定の検証
    if (this.config.monitoring?.enabled) {
      this.logger.info('リアルタイム監視が有効です', {
        interval: this.config.monitoring.interval,
      });
    }

    // イベント転送の設定
    this.setupEventForwarding();

    this.logger.info('DNSセキュリティアナライザー初期化完了', {
      enabledAnalyzers: this.config.threatDetection.enabledAnalyzers,
      monitoringEnabled: this.config.monitoring.enabled,
    });
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // 統計モジュールのイベント転送
    this.statistics.on('threat-recorded', data => {
      this.emit('threat-recorded', data);
    });

    // ルールエンジンのイベント転送
    this.ruleEngine.on('threat-alert', data => {
      this.emit('threat-alert', data);
    });

    this.ruleEngine.on('threat-block', data => {
      this.emit('threat-block', data);
    });

    this.ruleEngine.on('threat-quarantine', data => {
      this.emit('threat-quarantine', data);
    });

    // レピュテーションサービスのイベント転送
    this.reputationService.on('reputation-updated', data => {
      this.emit('reputation-updated', data);
    });
  }

  /**
   * 包括的セキュリティ分析
   */
  async analyzeSecurityThreats(
    domains: string[],
    records: DNSRecord[]
  ): Promise<SecurityThreat[]> {
    this.logger.info('DNS脅威検出分析を開始します', {
      domainCount: domains.length,
      recordCount: records.length,
    });

    const threats: SecurityThreat[] = [];
    const startTime = Date.now();

    try {
      // 並列分析の実行
      const analysisPromises = domains.map(domain =>
        this.analyzeDomainThreats(domain, records)
      );
      const domainThreats = await Promise.all(analysisPromises);

      // 結果のマージ
      domainThreats.forEach(threats_array => {
        threats.push(...threats_array);
      });

      // 重複排除と優先度ソート
      const uniqueThreats = this.deduplicateAndSortThreats(threats);

      const analysisTime = Date.now() - startTime;

      this.logger.info('DNS脅威検出分析が完了しました', {
        threatsFound: uniqueThreats.length,
        analysisTime,
        criticalThreats: uniqueThreats.filter(t => t.severity === 'critical').length,
      });

      // 脅威の記録と通知
      uniqueThreats.forEach(threat => {
        this.statistics.recordThreat(threat);
        this.emitThreatAlert(threat);
      });

      return uniqueThreats;
    } catch (error) {
      this.logger.error('DNS脅威検出分析エラー', error as Error);
      throw error;
    }
  }

  /**
   * 単一ドメインの脅威分析
   */
  private async analyzeDomainThreats(
    domain: string,
    records: DNSRecord[]
  ): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    const domainRecords = records.filter(
      r => r.name === domain || r.name.endsWith(`.${domain}`)
    );

    // 1. 脅威検出エンジンによる分析
    const detectorThreats = await this.runThreatDetectors(domain, domainRecords);
    threats.push(...detectorThreats);

    // 2. ルールエンジンによる分析
    const ruleResults = await this.ruleEngine.evaluateRules(domain, domainRecords);
    const ruleThreats = this.convertRuleResultsToThreats(ruleResults, domain);
    threats.push(...ruleThreats);

    // 3. アルゴリズム分析の統合
    try {
      const algorithmicAnalysis = await this.algorithmicAnalyzer.performAlgorithmicAnalysis(domain);
      const algorithmicThreats = this.convertAlgorithmicAnalysisToThreats(algorithmicAnalysis);
      threats.push(...algorithmicThreats);
    } catch (error) {
      this.logger.warn('アルゴリズム分析でエラーが発生しました', { error: error as Error });
    }

    return threats;
  }

  /**
   * 脅威検出エンジンの実行
   */
  private async runThreatDetectors(domain: string, records: DNSRecord[]): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    const enabledAnalyzers = this.config.threatDetection.enabledAnalyzers;
    const analyzers: Promise<SecurityThreat[]>[] = [];

    if (enabledAnalyzers.includes('malware')) {
      analyzers.push(this.threatDetectors.detectMalware(domain, records));
    }
    if (enabledAnalyzers.includes('phishing')) {
      analyzers.push(this.threatDetectors.detectPhishing(domain, records));
    }
    if (enabledAnalyzers.includes('typosquatting')) {
      analyzers.push(this.threatDetectors.detectTyposquatting(domain, records));
    }
    if (enabledAnalyzers.includes('dga')) {
      analyzers.push(this.threatDetectors.detectDGA(domain, records));
    }
    if (enabledAnalyzers.includes('fastflux')) {
      analyzers.push(this.threatDetectors.detectFastFlux(domain, records));
    }
    if (enabledAnalyzers.includes('dns_hijacking')) {
      analyzers.push(this.threatDetectors.detectDNSHijacking(domain, records));
    }
    if (enabledAnalyzers.includes('cache_poisoning')) {
      analyzers.push(this.threatDetectors.detectCachePoisoning(domain, records));
    }

    try {
      const results = await Promise.all(analyzers);
      results.forEach(result => threats.push(...result));
    } catch (error) {
      this.logger.error('脅威検出エンジン実行エラー', error as any);
    }

    return threats;
  }

  /**
   * 脅威の重複排除とソート
   */
  private deduplicateAndSortThreats(threats: SecurityThreat[]): SecurityThreat[] {
    // IDによる重複排除
    const uniqueThreats = threats.filter(
      (threat, index, self) => index === self.findIndex(t => t.id === threat.id)
    );

    // 優先度順でソート
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return uniqueThreats.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // 信頼度順
      return b.confidence - a.confidence;
    });
  }

  /**
   * ルール結果から脅威への変換
   */
  private convertRuleResultsToThreats(
    ruleResults: any[],
    domain: string
  ): SecurityThreat[] {
    return ruleResults
      .filter(result => result.matched)
      .map(result => {
        const rule = this.ruleEngine.getRule(result.ruleId);
        if (!rule) return null;

        return {
          id: `rule-${result.ruleId}-${domain}-${Date.now()}`,
          type: rule.type,
          severity: rule.severity,
          domain,
          title: rule.name,
          description: rule.description,
          confidence: result.confidence,
          timestamp: Date.now(),
          evidence: {
            dnsRecords: [],
            networkAnalysis: {} as NetworkAnalysis,
            reputationData: {} as ReputationData,
            algorithmicAnalysis: {} as AlgorithmicAnalysis,
          },
          indicators: {
            technicalIndicators: [`Rule: ${rule.name}`],
            behavioralIndicators: [],
            reputationIndicators: [],
          },
          mitigation: {
            immediateActions: ['Apply rule-based mitigation'],
            longTermActions: [],
            preventionMeasures: [],
          },
          references: [],
          metadata: {
            ruleId: result.ruleId,
            matchedConditions: result.matchedConditions,
            totalConditions: result.totalConditions,
          },
        } as SecurityThreat;
      })
      .filter(threat => threat !== null) as SecurityThreat[];
  }

  /**
   * アルゴリズム分析から脅威への変換
   */
  private convertAlgorithmicAnalysisToThreats(analysis: AlgorithmicAnalysis): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // 高エントロピースコアによるDGA検出
    if (analysis.entropyScore > 80) {
      threats.push({
        id: `algo-entropy-${analysis.domain}-${Date.now()}`,
        type: 'dga',
        severity: 'medium',
        domain: analysis.domain || 'unknown',
        title: 'High Entropy Domain Detected',
        description: `Domain shows high entropy score (${analysis.entropyScore}%) indicating possible DGA`,
        confidence: analysis.entropyScore / 100,
        timestamp: Date.now(),
        evidence: {
          dnsRecords: [],
          networkAnalysis: {} as NetworkAnalysis,
          reputationData: {} as ReputationData,
          algorithmicAnalysis: analysis,
        },
        indicators: {
          technicalIndicators: [`Entropy Score: ${analysis.entropyScore}%`],
          behavioralIndicators: [],
          reputationIndicators: [],
        },
        mitigation: {
          immediateActions: ['Verify domain legitimacy'],
          longTermActions: [],
          preventionMeasures: [],
        },
        references: [],
        metadata: { entropyScore: analysis.entropyScore },
      });
    }

    // 高ランダム性スコア
    if ((analysis.randomnessScore || 0) > 70) {
      threats.push({
        id: `algo-random-${analysis.domain}-${Date.now()}`,
        type: 'dga',
        severity: 'low',
        domain: analysis.domain || 'unknown',
        title: 'High Randomness Domain',
        description: `Domain shows high randomness score (${analysis.randomnessScore || 0}%)`,
        confidence: (analysis.randomnessScore || 0) / 100,
        timestamp: Date.now(),
        evidence: {
          dnsRecords: [],
          networkAnalysis: {} as NetworkAnalysis,
          reputationData: {} as ReputationData,
          algorithmicAnalysis: analysis,
        },
        indicators: {
          technicalIndicators: [`Randomness Score: ${analysis.randomnessScore || 0}%`],
          behavioralIndicators: [],
          reputationIndicators: [],
        },
        mitigation: {
          immediateActions: ['Investigate domain origin'],
          longTermActions: [],
          preventionMeasures: [],
        },
        references: [],
        metadata: { randomnessScore: analysis.randomnessScore || 0 },
      });
    }

    // ホモグラフ攻撃検出
    if (analysis.homographScore > 50) {
      threats.push({
        id: `algo-homograph-${analysis.domain}-${Date.now()}`,
        type: 'phishing',
        severity: 'high',
        domain: analysis.domain || 'unknown',
        title: 'Homograph Attack Detected',
        description: `Domain contains homograph characters (${analysis.homographScore}% score)`,
        confidence: analysis.homographScore / 100,
        timestamp: Date.now(),
        evidence: {
          dnsRecords: [],
          networkAnalysis: {} as NetworkAnalysis,
          reputationData: {} as ReputationData,
          algorithmicAnalysis: analysis,
        },
        indicators: {
          technicalIndicators: [`Homograph Score: ${analysis.homographScore}%`],
          behavioralIndicators: [],
          reputationIndicators: [],
        },
        mitigation: {
          immediateActions: ['Block homograph domain'],
          longTermActions: [],
          preventionMeasures: [],
        },
        references: [],
        metadata: { homographScore: analysis.homographScore },
      });
    }

    return threats;
  }

  /**
   * 脅威アラートの発火
   */
  private emitThreatAlert(threat: SecurityThreat): void {
    this.emit('threat-detected', threat);
    
    if (threat.severity === 'critical' || threat.severity === 'high') {
      this.emit('high-priority-threat', threat);
    }
  }

  // ===== 統計とレポート =====

  getThreatStatistics(timeframe?: { start: Date; end: Date }): ThreatStatistics {
    return this.statistics.getThreatStatistics(timeframe);
  }

  getDomainThreatStatistics(domain: string): ReturnType<typeof this.statistics.getDomainThreatStatistics> {
    return this.statistics.getDomainThreatStatistics(domain);
  }

  getThreatTrends(days?: number): ReturnType<typeof this.statistics.getThreatTrends> {
    return this.statistics.getThreatTrends(days);
  }

  generateSecurityReport(timeframe?: { start: Date; end: Date }): ReturnType<typeof this.statistics.generateSecurityReport> {
    return this.statistics.generateSecurityReport(timeframe);
  }

  // ===== ルール管理 =====

  addThreatRule(rule: Parameters<typeof this.ruleEngine.addRule>[0]): void {
    this.ruleEngine.addRule(rule);
  }

  removeThreatRule(ruleId: string): boolean {
    return this.ruleEngine.removeRule(ruleId);
  }

  getThreatRules(): ReturnType<typeof this.ruleEngine.getAllRules> {
    return this.ruleEngine.getAllRules();
  }

  toggleThreatRule(ruleId: string, enabled: boolean): boolean {
    return this.ruleEngine.toggleRule(ruleId, enabled);
  }

  // ===== 分析機能 =====

  async performAlgorithmicAnalysis(domain: string): Promise<AlgorithmicAnalysis> {
    return this.algorithmicAnalyzer.performAlgorithmicAnalysis(domain);
  }

  async performNetworkAnalysis(domain: string, records: DNSRecord[]): Promise<NetworkAnalysis> {
    return this.networkAnalyzer.performNetworkAnalysis(domain);
  }

  async getReputationData(domain: string): Promise<ReputationData> {
    return this.reputationService.checkReputation(domain);
  }

  // ===== 設定管理 =====

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('設定を更新しました', newConfig);
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // ===== 監視機能 =====

  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.logger.warn('監視は既に開始されています');
      return;
    }

    if (!this.config.monitoring.enabled) {
      this.logger.warn('監視が無効になっています');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck();
    }, this.config.monitoring.interval);

    this.logger.info('脅威監視を開始しました', {
      interval: this.config.monitoring.interval,
    });
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger.info('脅威監視を停止しました');
    }
  }

  // ===== コマンド互換性メソッド =====
  
  startRealTimeMonitoring(intervalMs: number = 60000): void {
    this.startMonitoring();
  }

  stopRealTimeMonitoring(): void {
    this.stopMonitoring();
  }

  getThreatDatabase(): any[] {
    // 脅威データベースの取得
    return [];
  }

  private async performMonitoringCheck(): Promise<void> {
    try {
      const stats = this.getThreatStatistics();
      const thresholds = this.config.monitoring.alertThresholds;

      if (stats.threatsBySeverity.critical >= thresholds.critical) {
        this.emit('monitoring-alert', {
          type: 'critical-threshold-exceeded',
          count: stats.threatsBySeverity.critical,
          threshold: thresholds.critical,
        });
      }

      if (stats.threatsBySeverity.high >= thresholds.high) {
        this.emit('monitoring-alert', {
          type: 'high-threshold-exceeded',
          count: stats.threatsBySeverity.high,
          threshold: thresholds.high,
        });
      }
    } catch (error) {
      this.logger.error('監視チェックエラー', error as Error);
    }
  }

  // ===== システム管理 =====

  async shutdown(): Promise<void> {
    try {
      this.stopMonitoring();
      this.removeAllListeners();
      this.logger.info('DNSセキュリティアナライザーを終了しました');
    } catch (error) {
      this.logger.error('終了処理エラー', error as Error);
    }
  }

  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'error';
    components: Record<string, { status: string; lastCheck: Date }>;
    statistics: {
      totalThreats: number;
      databaseSize: ReturnType<typeof this.statistics.getDatabaseSize>;
      ruleStatistics: ReturnType<typeof this.ruleEngine.getRuleStatistics>;
    };
  } {
    const dbSize = this.statistics.getDatabaseSize();
    const ruleStats = this.ruleEngine.getRuleStatistics();
    const threatStats = this.getThreatStatistics();

    return {
      status: 'healthy',
      components: {
        threatDetectors: { status: 'healthy', lastCheck: new Date() },
        networkAnalyzer: { status: 'healthy', lastCheck: new Date() },
        reputationService: { status: 'healthy', lastCheck: new Date() },
        algorithmicAnalyzer: { status: 'healthy', lastCheck: new Date() },
        statistics: { status: 'healthy', lastCheck: new Date() },
        ruleEngine: { status: 'healthy', lastCheck: new Date() },
      },
      statistics: {
        totalThreats: threatStats.totalThreats,
        databaseSize: dbSize,
        ruleStatistics: ruleStats,
      },
    };
  }
}

// 後方互換性のためのエクスポート
export default DNSSecurityAnalyzer;

// 型定義の再エクスポート
export type {
  SecurityThreat,
  SecurityConfig,
  ThreatDetectionResult,
  ThreatStatistics,
  NetworkAnalysis,
  ReputationData,
  AlgorithmicAnalysis,
} from './security-types.js';