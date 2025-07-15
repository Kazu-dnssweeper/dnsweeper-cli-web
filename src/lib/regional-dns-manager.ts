/**
 * 地域別DNS設定管理システム - メインクラス
 *
 * 分離された機能モジュールを統合する軽量なマネージャークラス
 */

import { EventEmitter } from 'events';

import { IDNSRecord as DNSRecord } from './dns-resolver.js';
import { I18nManager, RegionalSettings } from './i18n-manager.js';
import { Logger } from './logger.js';

// 機能モジュール
import { RegionalComplianceChecker } from './regional-compliance-checker.js';
import { RegionalConfigManager } from './regional-config-manager.js';
import { RegionalDNSOptimizer } from './regional-dns-optimizer.js';
import { RegionalPerformanceMonitor } from './regional-performance-monitor.js';

// 型定義
import type {
  RegionalDNSConfig,
  RegionalDNSManagerOptions,
  RegionalPerformanceMetrics,
  ComplianceCheck,
  DNSOptimizationResult,
  RegionalStatistics,
  RegionalAlert,
  RegionalComplianceReport,
  DNSPerformanceReport,
} from './regional-dns-types.js';

/**
 * 地域別DNS管理システム
 */
export class RegionalDNSManager extends EventEmitter {
  private logger: Logger;
  private options: RegionalDNSManagerOptions;
  private i18nManager: I18nManager;
  private currentRegion: string;

  // 機能モジュール
  private configManager: RegionalConfigManager;
  private performanceMonitor: RegionalPerformanceMonitor;
  private complianceChecker: RegionalComplianceChecker;
  private dnsOptimizer: RegionalDNSOptimizer;

  constructor(options: RegionalDNSManagerOptions = {}, logger?: Logger) {
    super();

    this.logger = logger || new Logger({ verbose: false });
    this.options = {
      defaultRegion: 'north-america',
      autoDetectRegion: true,
      enablePerformanceMonitoring: true,
      enableComplianceChecking: true,
      enableAutomaticOptimization: false,
      optimizationInterval: 300000, // 5分
      performanceThresholds: {
        responseTime: 100,
        uptime: 99.0,
        throughput: 5000,
      },
      complianceCheckInterval: 86400000, // 24時間
      enableAlerts: true,
      alertThresholds: {
        responseTime: 200,
        uptime: 98.0,
        errorRate: 5.0,
      },
      ...options,
    };

    this.currentRegion = this.options.defaultRegion!;
    this.i18nManager = new I18nManager();

    // 機能モジュールの初期化
    this.configManager = new RegionalConfigManager(this.logger);
    this.performanceMonitor = new RegionalPerformanceMonitor(
      this.logger,
      this.options
    );
    this.complianceChecker = new RegionalComplianceChecker(
      this.logger,
      this.options
    );
    this.dnsOptimizer = new RegionalDNSOptimizer(this.logger, this.options);

    // イベント転送の設定
    this.setupEventForwarding();

    // 自動検出の実行
    if (this.options.autoDetectRegion) {
      this.detectRegion();
    }

    // 監視とチェックの開始
    this.startServices();

    this.logger.info('地域別DNS管理システムが初期化されました', {
      currentRegion: this.currentRegion,
      availableRegions: this.configManager.getAvailableRegions(),
      options: this.options,
    });
  }

  // 公開API - 設定管理

  /**
   * 現在の地域設定取得
   */
  getCurrentRegion(): string {
    return this.currentRegion;
  }

  /**
   * 地域の切り替え
   */
  setCurrentRegion(region: string): void {
    const config = this.configManager.getRegionalConfig(region);
    if (config) {
      const previousRegion = this.currentRegion;
      this.currentRegion = region;

      this.emit('region-changed', { previousRegion, newRegion: region });

      this.logger.info('地域を切り替えました', {
        previousRegion,
        newRegion: region,
      });
    } else {
      this.logger.warn('存在しない地域への切り替えを試行しました', { region });
      throw new Error(`地域 '${region}' は存在しません`);
    }
  }

  /**
   * 地域設定の取得
   */
  getRegionalConfig(region?: string): RegionalDNSConfig | undefined {
    const targetRegion = region || this.currentRegion;
    return this.configManager.getRegionalConfig(targetRegion);
  }

  /**
   * すべての地域設定の取得
   */
  getAllRegionalConfigs(): Map<string, RegionalDNSConfig> {
    return this.configManager.getAllRegionalConfigs();
  }

  /**
   * 利用可能な地域リスト取得
   */
  getAvailableRegions(): string[] {
    return this.configManager.getAvailableRegions();
  }

  /**
   * 地域設定の更新
   */
  updateRegionalConfig(
    region: string,
    config: Partial<RegionalDNSConfig>
  ): void {
    this.configManager.updateRegionalConfig(region, config);
    this.emit('config-updated', { region, config });
  }

  // 公開API - パフォーマンス監視

  /**
   * パフォーマンスメトリクス取得
   */
  getPerformanceMetrics(
    region?: string
  ): RegionalPerformanceMetrics | undefined {
    const targetRegion = region || this.currentRegion;
    return this.performanceMonitor.getPerformanceMetrics(targetRegion);
  }

  /**
   * すべての地域のパフォーマンスメトリクス取得
   */
  getAllPerformanceMetrics(): Map<string, RegionalPerformanceMetrics> {
    return this.performanceMonitor.getAllPerformanceMetrics();
  }

  /**
   * パフォーマンスレポート生成
   */
  generatePerformanceReport(region?: string): DNSPerformanceReport | null {
    const targetRegion = region || this.currentRegion;
    return this.performanceMonitor.generatePerformanceReport(targetRegion);
  }

  /**
   * パフォーマンス統計取得
   */
  getPerformanceStatistics(): ReturnType<
    RegionalPerformanceMonitor['getPerformanceStatistics']
  > {
    return this.performanceMonitor.getPerformanceStatistics();
  }

  // 公開API - コンプライアンス

  /**
   * コンプライアンスチェック結果取得
   */
  getComplianceChecks(region?: string): ComplianceCheck[] {
    const targetRegion = region || this.currentRegion;
    return this.complianceChecker.getComplianceChecks(targetRegion);
  }

  /**
   * コンプライアンスレポート生成
   */
  generateComplianceReport(region?: string): RegionalComplianceReport | null {
    const targetRegion = region || this.currentRegion;
    return this.complianceChecker.generateComplianceReport(targetRegion);
  }

  /**
   * コンプライアンス統計取得
   */
  getComplianceStatistics(): ReturnType<
    RegionalComplianceChecker['getComplianceStatistics']
  > {
    return this.complianceChecker.getComplianceStatistics();
  }

  /**
   * 手動コンプライアンスチェック実行
   */
  async runComplianceCheck(region?: string): Promise<ComplianceCheck[]> {
    const targetRegion = region || this.currentRegion;
    const config = this.configManager.getRegionalConfig(targetRegion);

    if (!config) {
      throw new Error(`地域 '${targetRegion}' の設定が見つかりません`);
    }

    return await this.complianceChecker.runComplianceCheck(
      targetRegion,
      config
    );
  }

  // 公開API - 最適化

  /**
   * 地域DNS最適化実行
   */
  async optimizeRegion(region?: string): Promise<DNSOptimizationResult[]> {
    const targetRegion = region || this.currentRegion;
    const config = this.configManager.getRegionalConfig(targetRegion);
    const metrics = this.performanceMonitor.getPerformanceMetrics(targetRegion);

    if (!config) {
      throw new Error(`地域 '${targetRegion}' の設定が見つかりません`);
    }

    if (!metrics) {
      throw new Error(
        `地域 '${targetRegion}' のパフォーマンスメトリクスが見つかりません`
      );
    }

    return await this.dnsOptimizer.optimizeRegion(
      targetRegion,
      config,
      metrics
    );
  }

  /**
   * 最適化推奨事項取得
   */
  getOptimizationRecommendations(
    region?: string
  ): ReturnType<RegionalDNSOptimizer['generateOptimizationRecommendations']> {
    const targetRegion = region || this.currentRegion;
    const metrics = this.performanceMonitor.getPerformanceMetrics(targetRegion);

    if (!metrics) {
      throw new Error(
        `地域 '${targetRegion}' のパフォーマンスメトリクスが見つかりません`
      );
    }

    return this.dnsOptimizer.generateOptimizationRecommendations(
      targetRegion,
      metrics
    );
  }

  /**
   * 最適化統計取得
   */
  getOptimizationStatistics(): ReturnType<
    RegionalDNSOptimizer['getOptimizationStatistics']
  > {
    return this.dnsOptimizer.getOptimizationStatistics();
  }

  // 公開API - アラート

  /**
   * アクティブアラート取得
   */
  getActiveAlerts(): RegionalAlert[] {
    return this.performanceMonitor.getActiveAlerts();
  }

  /**
   * アラート履歴取得
   */
  getAlertHistory(region?: string): RegionalAlert[] {
    return this.performanceMonitor.getAlertHistory(region);
  }

  // 公開API - 統計とレポート

  /**
   * 地域統計の取得
   */
  getRegionalStatistics(): RegionalStatistics {
    const performanceStats = this.performanceMonitor.getPerformanceStatistics();
    const complianceStats = this.complianceChecker.getComplianceStatistics();
    const optimizationStats = this.dnsOptimizer.getOptimizationStatistics();
    const configStats = this.configManager.getConfigStatistics();
    const activeAlerts = this.performanceMonitor.getActiveAlerts();

    return {
      totalRegions: configStats.totalRegions,
      activeRegions: performanceStats.totalRegions,
      averagePerformance: performanceStats.averageMetrics,
      complianceOverview: complianceStats.complianceDistribution,
      alertSummary: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        acknowledged: activeAlerts.filter(a => a.status === 'acknowledged')
          .length,
      },
      optimizationOpportunities: optimizationStats.totalOptimizations,
    };
  }

  /**
   * 包括的システムレポート生成
   */
  generateSystemReport(): {
    overview: RegionalStatistics;
    performanceReports: Map<string, DNSPerformanceReport>;
    complianceReports: Map<string, RegionalComplianceReport>;
    activeAlerts: RegionalAlert[];
    recommendations: Array<{
      region: string;
      type: 'performance' | 'compliance' | 'optimization';
      priority: 'high' | 'medium' | 'low';
      description: string;
    }>;
  } {
    const overview = this.getRegionalStatistics();
    const performanceReports = new Map<string, DNSPerformanceReport>();
    const complianceReports = new Map<string, RegionalComplianceReport>();
    const recommendations: Array<{
      region: string;
      type: 'performance' | 'compliance' | 'optimization';
      priority: 'high' | 'medium' | 'low';
      description: string;
    }> = [];

    // 各地域のレポート生成
    this.configManager.getAvailableRegions().forEach(region => {
      const perfReport =
        this.performanceMonitor.generatePerformanceReport(region);
      if (perfReport) {
        performanceReports.set(region, perfReport);

        // パフォーマンス推奨事項
        perfReport.recommendations.forEach(rec => {
          recommendations.push({
            region,
            type: 'performance',
            priority: 'medium',
            description: rec,
          });
        });
      }

      const compReport =
        this.complianceChecker.generateComplianceReport(region);
      if (compReport) {
        complianceReports.set(region, compReport);

        // コンプライアンス推奨事項
        compReport.recommendations.forEach(rec => {
          recommendations.push({
            region,
            type: 'compliance',
            priority: compReport.overallScore < 80 ? 'high' : 'medium',
            description: rec,
          });
        });
      }

      // 最適化推奨事項
      const metrics = this.performanceMonitor.getPerformanceMetrics(region);
      if (metrics) {
        const optRecommendations =
          this.dnsOptimizer.generateOptimizationRecommendations(
            region,
            metrics
          );
        optRecommendations.forEach(rec => {
          recommendations.push({
            region,
            type: 'optimization',
            priority: rec.priority,
            description: `${rec.strategy}: ${rec.expectedImprovement}`,
          });
        });
      }
    });

    return {
      overview,
      performanceReports,
      complianceReports,
      activeAlerts: this.getActiveAlerts(),
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
    };
  }

  // システム管理

  /**
   * システムの停止
   */
  shutdown(): void {
    this.performanceMonitor.stopMonitoring();
    this.complianceChecker.stopComplianceChecking();
    this.dnsOptimizer.stopAutomaticOptimization();

    this.logger.info('地域別DNS管理システムを停止しました');
  }

  /**
   * システムの再起動
   */
  restart(): void {
    this.shutdown();
    this.startServices();

    this.logger.info('地域別DNS管理システムを再起動しました');
  }

  // プライベートメソッド

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // パフォーマンス監視のイベント転送
    this.performanceMonitor.on('metrics-updated', data => {
      this.emit('metrics-updated', data);
    });

    this.performanceMonitor.on('alert', alert => {
      this.emit('alert', alert);
    });

    // コンプライアンスチェックのイベント転送
    this.complianceChecker.on('compliance-check-completed', data => {
      this.emit('compliance-check-completed', data);
    });

    // 最適化のイベント転送
    this.dnsOptimizer.on('optimization-completed', data => {
      this.emit('optimization-completed', data);
    });
  }

  /**
   * 地域の自動検出
   */
  private detectRegion(): void {
    try {
      const detectedRegion = this.i18nManager.getCurrentRegion();
      if (this.configManager.getAvailableRegions().includes(detectedRegion)) {
        this.currentRegion = detectedRegion;
        this.logger.info(`地域を自動検出しました: ${detectedRegion}`);
      } else {
        this.logger.warn(
          `検出された地域 '${detectedRegion}' は設定されていません。デフォルト地域を使用します: ${this.currentRegion}`
        );
      }
    } catch (error) {
      this.logger.warn(
        '地域の自動検出に失敗しました。デフォルト地域を使用します',
        {
          defaultRegion: this.currentRegion,
          error: (error as Error).message,
        }
      );
    }
  }

  /**
   * サービスの開始
   */
  private startServices(): void {
    const regions = this.configManager.getAvailableRegions();
    const configs = this.configManager.getAllRegionalConfigs();

    // パフォーマンス監視の開始
    this.performanceMonitor.startMonitoring(regions);

    // コンプライアンスチェックの開始
    this.complianceChecker.startComplianceChecking(configs);

    // 自動最適化の開始（有効な場合）
    if (this.options.enableAutomaticOptimization) {
      this.dnsOptimizer.startAutomaticOptimization(regions);
    }

    this.logger.info('すべてのサービスを開始しました', {
      regions,
      services: {
        performanceMonitoring: this.options.enablePerformanceMonitoring,
        complianceChecking: this.options.enableComplianceChecking,
        automaticOptimization: this.options.enableAutomaticOptimization,
      },
    });
  }
}

// 後方互換性のためのエクスポート
export default RegionalDNSManager;

// 型定義の再エクスポート
export type * from './regional-dns-types.js';
