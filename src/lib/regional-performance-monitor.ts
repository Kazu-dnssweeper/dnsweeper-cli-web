/**
 * 地域パフォーマンス監視システム
 *
 * 地域別DNSパフォーマンスの監視、メトリクス収集、分析機能
 */

import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type {
  RegionalPerformanceMetrics,
  RegionalDNSManagerOptions,
  DNSPerformanceReport,
  RegionalAlert,
} from './regional-dns-types.js';

export class RegionalPerformanceMonitor extends EventEmitter {
  private logger: Logger;
  private options: RegionalDNSManagerOptions;
  private performanceMetrics: Map<string, RegionalPerformanceMetrics>;
  private monitoringIntervals: Map<string, NodeJS.Timeout>;
  private alertHistory: Map<string, RegionalAlert[]>;

  constructor(logger: Logger, options: RegionalDNSManagerOptions) {
    super();
    this.logger = logger;
    this.options = options;
    this.performanceMetrics = new Map();
    this.monitoringIntervals = new Map();
    this.alertHistory = new Map();
  }

  /**
   * 監視の開始
   */
  startMonitoring(regions: string[]): void {
    if (!this.options.enablePerformanceMonitoring) {
      this.logger.info('パフォーマンス監視は無効になっています');
      return;
    }

    regions.forEach(region => {
      this.initializeMetrics(region);
      this.startRegionMonitoring(region);
    });

    this.logger.info('地域パフォーマンス監視を開始しました', {
      regions,
      interval: this.options.optimizationInterval,
    });
  }

  /**
   * 監視の停止
   */
  stopMonitoring(): void {
    this.monitoringIntervals.forEach((interval, region) => {
      clearInterval(interval);
      this.logger.debug('地域監視を停止しました', { region });
    });

    this.monitoringIntervals.clear();
    this.logger.info('すべての地域パフォーマンス監視を停止しました');
  }

  /**
   * 地域のパフォーマンスメトリクス取得
   */
  getPerformanceMetrics(
    region: string
  ): RegionalPerformanceMetrics | undefined {
    return this.performanceMetrics.get(region);
  }

  /**
   * すべての地域のパフォーマンスメトリクス取得
   */
  getAllPerformanceMetrics(): Map<string, RegionalPerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  /**
   * パフォーマンスレポート生成
   */
  generatePerformanceReport(region: string): DNSPerformanceReport | null {
    const metrics = this.performanceMetrics.get(region);
    if (!metrics) {
      this.logger.warn('指定された地域のメトリクスが見つかりません', {
        region,
      });
      return null;
    }

    const report: DNSPerformanceReport = {
      region,
      metrics,
      benchmarkComparison: {
        industry: 50, // 業界平均（ms）
        competitors: [45, 55, 60, 40], // 競合他社
        bestPractice: 20, // ベストプラクティス
      },
      trends: {
        period: '30日間',
        improvement: this.calculateTrendImprovement(metrics),
        degradation: this.calculateTrendDegradation(metrics),
      },
      recommendations: this.generateRecommendations(metrics),
      actionPlan: this.generateActionPlan(metrics),
    };

    this.logger.info('パフォーマンスレポートを生成しました', { region });
    return report;
  }

  /**
   * アラート履歴の取得
   */
  getAlertHistory(region?: string): RegionalAlert[] {
    if (region) {
      return this.alertHistory.get(region) || [];
    }

    // すべての地域のアラートを統合
    const allAlerts: RegionalAlert[] = [];
    this.alertHistory.forEach(alerts => {
      allAlerts.push(...alerts);
    });

    return allAlerts.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * アクティブなアラートの取得
   */
  getActiveAlerts(): RegionalAlert[] {
    return this.getAlertHistory().filter(alert => alert.status === 'active');
  }

  /**
   * メトリクスの手動更新
   */
  async updatePerformanceMetrics(region: string): Promise<void> {
    try {
      const metrics = await this.collectPerformanceData(region);

      if (metrics) {
        this.performanceMetrics.set(region, metrics);
        this.emit('metrics-updated', { region, metrics });

        // 閾値チェックとアラート生成
        this.checkPerformanceThresholds(region, metrics);

        this.logger.debug('パフォーマンスメトリクスを更新しました', {
          region,
          responseTime: metrics.averageResponseTime,
          uptime: metrics.uptime,
        });
      }
    } catch (error) {
      this.logger.error('パフォーマンスメトリクス更新エラー', error as Error);
    }
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStatistics(): {
    totalRegions: number;
    averageMetrics: {
      responseTime: number;
      uptime: number;
      throughput: number;
      errorRate: number;
    };
    alertCounts: {
      active: number;
      critical: number;
      total: number;
    };
    trendsOverview: {
      improving: number;
      stable: number;
      degrading: number;
    };
  } {
    const allMetrics = Array.from(this.performanceMetrics.values());
    const allAlerts = this.getAlertHistory();

    const avgMetrics = {
      responseTime: 0,
      uptime: 0,
      throughput: 0,
      errorRate: 0,
    };

    if (allMetrics.length > 0) {
      avgMetrics.responseTime =
        allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) /
        allMetrics.length;
      avgMetrics.uptime =
        allMetrics.reduce((sum, m) => sum + m.uptime, 0) / allMetrics.length;
      avgMetrics.throughput =
        allMetrics.reduce((sum, m) => sum + m.throughput, 0) /
        allMetrics.length;
      avgMetrics.errorRate =
        allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length;
    }

    const activeAlerts = allAlerts.filter(a => a.status === 'active');
    const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');

    return {
      totalRegions: allMetrics.length,
      averageMetrics: avgMetrics,
      alertCounts: {
        active: activeAlerts.length,
        critical: criticalAlerts.length,
        total: allAlerts.length,
      },
      trendsOverview: {
        improving: allMetrics.filter(m => this.calculateTrendImprovement(m) > 5)
          .length,
        stable: allMetrics.filter(
          m => Math.abs(this.calculateTrendImprovement(m)) <= 5
        ).length,
        degrading: allMetrics.filter(
          m => this.calculateTrendImprovement(m) < -5
        ).length,
      },
    };
  }

  // プライベートメソッド

  /**
   * メトリクスの初期化
   */
  private initializeMetrics(region: string): void {
    const initialMetrics: RegionalPerformanceMetrics = {
      region,
      averageResponseTime: 0,
      uptime: 100,
      throughput: 0,
      errorRate: 0,
      complianceScore: 100,
      lastUpdated: new Date(),
      trends: {
        responseTime: [],
        uptime: [],
        throughput: [],
      },
    };

    this.performanceMetrics.set(region, initialMetrics);
    this.alertHistory.set(region, []);
  }

  /**
   * 地域監視の開始
   */
  private startRegionMonitoring(region: string): void {
    const interval = setInterval(() => {
      this.updatePerformanceMetrics(region);
    }, this.options.optimizationInterval || 300000); // 5分間隔

    this.monitoringIntervals.set(region, interval);
  }

  /**
   * パフォーマンスデータの収集
   */
  private async collectPerformanceData(
    region: string
  ): Promise<RegionalPerformanceMetrics> {
    // 実際の実装では、DNS解決テスト、ネットワーク測定等を実行
    // ここではサンプルデータを生成

    const baseResponseTime = 50;
    const randomVariation = (Math.random() - 0.5) * 20;
    const responseTime = Math.max(1, baseResponseTime + randomVariation);

    const uptime = 99.5 + Math.random() * 0.5;
    const throughput = 5000 + Math.random() * 3000;
    const errorRate = Math.random() * 2; // 0-2%

    const existingMetrics = this.performanceMetrics.get(region);
    const trends = existingMetrics?.trends || {
      responseTime: [],
      uptime: [],
      throughput: [],
    };

    // トレンドデータの更新
    trends.responseTime.push(responseTime);
    trends.uptime.push(uptime);
    trends.throughput.push(throughput);

    // 最新30件のデータのみ保持
    if (trends.responseTime.length > 30) {
      trends.responseTime = trends.responseTime.slice(-30);
      trends.uptime = trends.uptime.slice(-30);
      trends.throughput = trends.throughput.slice(-30);
    }

    return {
      region,
      averageResponseTime: Math.round(responseTime * 10) / 10,
      uptime: Math.round(uptime * 100) / 100,
      throughput: Math.round(throughput),
      errorRate: Math.round(errorRate * 100) / 100,
      complianceScore: 95 + Math.random() * 5,
      lastUpdated: new Date(),
      trends,
    };
  }

  /**
   * パフォーマンス閾値チェック
   */
  private checkPerformanceThresholds(
    region: string,
    metrics: RegionalPerformanceMetrics
  ): void {
    const thresholds = this.options.performanceThresholds;
    if (!thresholds || !this.options.enableAlerts) return;

    const alerts: RegionalAlert[] = [];

    // 応答時間チェック
    if (metrics.averageResponseTime > thresholds.responseTime) {
      alerts.push(
        this.createAlert(
          region,
          'performance',
          'high',
          '応答時間しきい値超過',
          `応答時間が ${metrics.averageResponseTime}ms でしきい値 ${thresholds.responseTime}ms を超過しています`,
          ['DNS設定の最適化', 'CDN設定の見直し']
        )
      );
    }

    // 稼働率チェック
    if (metrics.uptime < thresholds.uptime) {
      alerts.push(
        this.createAlert(
          region,
          'performance',
          'critical',
          '稼働率低下',
          `稼働率が ${metrics.uptime}% でしきい値 ${thresholds.uptime}% を下回っています`,
          ['冗長化設定の確認', 'インフラ状況の調査']
        )
      );
    }

    // スループットチェック
    if (metrics.throughput < thresholds.throughput) {
      alerts.push(
        this.createAlert(
          region,
          'performance',
          'medium',
          'スループット低下',
          `スループットが ${metrics.throughput} rps でしきい値 ${thresholds.throughput} rps を下回っています`,
          ['負荷分散設定の確認', 'サーバー負荷の調査']
        )
      );
    }

    // アラートの保存と通知
    alerts.forEach(alert => {
      this.addAlert(region, alert);
      this.emit('alert', alert);
    });
  }

  /**
   * アラートの作成
   */
  private createAlert(
    region: string,
    type: RegionalAlert['type'],
    severity: RegionalAlert['severity'],
    title: string,
    description: string,
    actionRequired: string[]
  ): RegionalAlert {
    return {
      id: `${region}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      region,
      type,
      severity,
      title,
      description,
      timestamp: new Date(),
      status: 'active',
      affectedServices: ['DNS'],
      actionRequired,
    };
  }

  /**
   * アラートの追加
   */
  private addAlert(region: string, alert: RegionalAlert): void {
    const alerts = this.alertHistory.get(region) || [];
    alerts.push(alert);

    // 最新100件のアラートのみ保持
    if (alerts.length > 100) {
      alerts.splice(0, alerts.length - 100);
    }

    this.alertHistory.set(region, alerts);
  }

  /**
   * トレンド改善率の計算
   */
  private calculateTrendImprovement(
    metrics: RegionalPerformanceMetrics
  ): number {
    const { responseTime } = metrics.trends;
    if (responseTime.length < 10) return 0;

    const recent = responseTime.slice(-5);
    const older = responseTime.slice(-15, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    // 応答時間が短くなっているほど改善率が高い
    return ((olderAvg - recentAvg) / olderAvg) * 100;
  }

  /**
   * トレンド悪化率の計算
   */
  private calculateTrendDegradation(
    metrics: RegionalPerformanceMetrics
  ): number {
    const improvement = this.calculateTrendImprovement(metrics);
    return improvement < 0 ? Math.abs(improvement) : 0;
  }

  /**
   * 推奨事項の生成
   */
  private generateRecommendations(
    metrics: RegionalPerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.averageResponseTime > 100) {
      recommendations.push(
        'DNS サーバーを地理的により近い場所に配置してください'
      );
      recommendations.push('CDN の活用を検討してください');
    }

    if (metrics.uptime < 99.9) {
      recommendations.push('冗長化設定を見直してください');
      recommendations.push('フェイルオーバー機能を強化してください');
    }

    if (metrics.errorRate > 1) {
      recommendations.push('DNS 設定の妥当性を確認してください');
      recommendations.push('ネットワーク接続性を調査してください');
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'パフォーマンスは良好です。現在の設定を維持してください'
      );
    }

    return recommendations;
  }

  /**
   * アクション計画の生成
   */
  private generateActionPlan(
    metrics: RegionalPerformanceMetrics
  ): DNSPerformanceReport['actionPlan'] {
    const plan = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[],
    };

    if (metrics.averageResponseTime > 200) {
      plan.immediate.push('DNS キャッシュ設定の最適化');
      plan.shortTerm.push('地域DNS サーバーの追加検討');
    }

    if (metrics.uptime < 99.5) {
      plan.immediate.push('システム障害の緊急調査');
      plan.shortTerm.push('冗長化システムの導入');
    }

    plan.longTerm.push('継続的な監視とチューニング');
    plan.longTerm.push('新技術（DNS over HTTPS等）の導入検討');

    return plan;
  }
}
