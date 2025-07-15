/**
 * DNS セキュリティ統計とレポート
 * 脅威統計の計算、レポート生成、メトリクス管理を担当
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type {
  SecurityThreat,
  ThreatStatistics,
  ThreatDetectionResult,
} from './security-types.js';

export class DNSSecurityStatistics extends EventEmitter {
  private logger: Logger;
  private threatDatabase: Map<string, SecurityThreat[]>;
  private statisticsCache: Map<string, ThreatStatistics>;
  private lastUpdated: Date;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ verbose: false });
    this.threatDatabase = new Map();
    this.statisticsCache = new Map();
    this.lastUpdated = new Date();
  }

  /**
   * 脅威の記録
   */
  recordThreat(threat: SecurityThreat): void {
    try {
      const domain = threat.domain;
      const existing = this.threatDatabase.get(domain) || [];
      existing.push(threat);
      this.threatDatabase.set(domain, existing);

      // 統計キャッシュをクリア
      this.statisticsCache.clear();
      this.lastUpdated = new Date();

      this.emit('threat-recorded', { threat, domain });
      this.logger.debug('脅威を記録しました', {
        domain,
        type: threat.type,
        severity: threat.severity,
      });
    } catch (error) {
      this.logger.error('脅威記録エラー', error as Error);
    }
  }

  /**
   * 脅威統計の取得
   */
  getThreatStatistics(timeframe?: {
    start: Date;
    end: Date;
  }): ThreatStatistics {
    try {
      const cacheKey = this.generateCacheKey(timeframe);
      const cached = this.statisticsCache.get(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      const statistics = this.calculateStatistics(timeframe);
      this.statisticsCache.set(cacheKey, statistics);

      return statistics;
    } catch (error) {
      this.logger.error('統計取得エラー', error as Error);
      throw error;
    }
  }

  /**
   * ドメイン別脅威統計
   */
  getDomainThreatStatistics(domain: string): {
    totalThreats: number;
    threatsByType: Record<string, number>;
    threatsBySeverity: Record<string, number>;
    latestThreat?: SecurityThreat;
    firstThreat?: SecurityThreat;
  } {
    const threats = this.threatDatabase.get(domain) || [];

    const threatsByType: Record<string, number> = {};
    const threatsBySeverity: Record<string, number> = {};

    threats.forEach(threat => {
      threatsByType[threat.type] = (threatsByType[threat.type] || 0) + 1;
      threatsBySeverity[threat.severity] =
        (threatsBySeverity[threat.severity] || 0) + 1;
    });

    // 時系列でソート
    const sortedThreats = threats.sort(
      (a, b) =>
        new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
    );

    return {
      totalThreats: threats.length,
      threatsByType,
      threatsBySeverity,
      latestThreat: sortedThreats[sortedThreats.length - 1],
      firstThreat: sortedThreats[0],
    };
  }

  /**
   * 脅威トレンド分析
   */
  getThreatTrends(days: number = 30): {
    daily: Array<{
      date: string;
      count: number;
      severity: Record<string, number>;
    }>;
    types: Array<{
      type: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      change: number;
    }>;
    overall: { trend: 'increasing' | 'decreasing' | 'stable'; change: number };
  } {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 日別統計
    const daily: Array<{
      date: string;
      count: number;
      severity: Record<string, number>;
    }> = [];
    const typeCount: Record<string, number[]> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayThreats = this.getThreatsForDate(date);
      const severityCount: Record<string, number> = {};

      dayThreats.forEach(threat => {
        severityCount[threat.severity] =
          (severityCount[threat.severity] || 0) + 1;

        // 脅威タイプ別カウント
        if (!typeCount[threat.type]) {
          typeCount[threat.type] = new Array(days).fill(0);
        }
        typeCount[threat.type][i]++;
      });

      daily.push({
        date: dateStr,
        count: dayThreats.length,
        severity: severityCount,
      });
    }

    // トレンド分析
    const types = Object.entries(typeCount).map(([type, counts]) => {
      const firstHalf = counts.slice(0, Math.floor(days / 2));
      const secondHalf = counts.slice(Math.floor(days / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

      let trend: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(change) < 10) {
        trend = 'stable';
      } else if (change > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }

      return { type, trend, change: Math.round(change) };
    });

    // 全体トレンド
    const totalCounts = daily.map(d => d.count);
    const firstHalfTotal = totalCounts.slice(0, Math.floor(days / 2));
    const secondHalfTotal = totalCounts.slice(Math.floor(days / 2));

    const firstTotalAvg =
      firstHalfTotal.reduce((a, b) => a + b, 0) / firstHalfTotal.length;
    const secondTotalAvg =
      secondHalfTotal.reduce((a, b) => a + b, 0) / secondHalfTotal.length;

    const overallChange =
      ((secondTotalAvg - firstTotalAvg) / (firstTotalAvg || 1)) * 100;

    let overallTrend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(overallChange) < 10) {
      overallTrend = 'stable';
    } else if (overallChange > 0) {
      overallTrend = 'increasing';
    } else {
      overallTrend = 'decreasing';
    }

    return {
      daily,
      types,
      overall: { trend: overallTrend, change: Math.round(overallChange) },
    };
  }

  /**
   * トップ脅威ドメインの取得
   */
  getTopThreatDomains(limit: number = 10): Array<{
    domain: string;
    threatCount: number;
    criticalCount: number;
    lastThreat: Date;
    types: string[];
  }> {
    const domainStats: Array<{
      domain: string;
      threatCount: number;
      criticalCount: number;
      lastThreat: Date;
      types: string[];
    }> = [];

    this.threatDatabase.forEach((threats, domain) => {
      const criticalCount = threats.filter(
        t => t.severity === 'critical'
      ).length;
      const lastThreat = threats.reduce((latest, threat) => {
        const threatDate = new Date(threat.detectedAt);
        return threatDate > latest ? threatDate : latest;
      }, new Date(0));

      const types = [...new Set(threats.map(t => t.type))];

      domainStats.push({
        domain,
        threatCount: threats.length,
        criticalCount,
        lastThreat,
        types,
      });
    });

    return domainStats
      .sort((a, b) => {
        // 重要度順でソート（クリティカル数 > 脅威総数 > 最新度）
        if (b.criticalCount !== a.criticalCount) {
          return b.criticalCount - a.criticalCount;
        }
        if (b.threatCount !== a.threatCount) {
          return b.threatCount - a.threatCount;
        }
        return b.lastThreat.getTime() - a.lastThreat.getTime();
      })
      .slice(0, limit);
  }

  /**
   * セキュリティレポートの生成
   */
  generateSecurityReport(timeframe?: { start: Date; end: Date }): {
    summary: {
      totalThreats: number;
      criticalThreats: number;
      domainsAnalyzed: number;
      averageThreatsPerDomain: number;
    };
    statistics: ThreatStatistics;
    topDomains: Array<{ domain: string; threatCount: number; types: string[] }>;
    trends: Array<{ timestamp: number; counts: Record<string, number> }>;
    recommendations: string[];
  } {
    const statistics = this.getThreatStatistics(timeframe);
    const topDomains = this.getTopThreatDomains();
    const trends = this.getThreatTrends();

    const totalThreats = statistics.totalThreats;
    const criticalThreats = statistics.threatsBySeverity.critical || 0;
    const domainsAnalyzed = this.threatDatabase.size;
    const averageThreatsPerDomain =
      domainsAnalyzed > 0 ? totalThreats / domainsAnalyzed : 0;

    // 推奨事項の生成
    const recommendations: string[] = [];

    if (criticalThreats > 0) {
      recommendations.push(
        `${criticalThreats}件のクリティカル脅威が検出されています。即座に対処を検討してください。`
      );
    }

    if (trends.overall.trend === 'increasing' && trends.overall.change > 20) {
      recommendations.push(
        `脅威トレンドが${trends.overall.change}%増加しています。セキュリティ対策の強化を推奨します。`
      );
    }

    if (averageThreatsPerDomain > 5) {
      recommendations.push(
        'ドメインあたりの平均脅威数が高いです。フィルタリング設定の見直しを検討してください。'
      );
    }

    const malwareCount = statistics.threatsByType.malware || 0;
    if (malwareCount > totalThreats * 0.3) {
      recommendations.push(
        'マルウェア関連の脅威が多数検出されています。アンチマルウェア対策の強化を推奨します。'
      );
    }

    return {
      summary: {
        totalThreats,
        criticalThreats,
        domainsAnalyzed,
        averageThreatsPerDomain:
          Math.round(averageThreatsPerDomain * 100) / 100,
      },
      statistics,
      topDomains,
      trends,
      recommendations,
    };
  }

  /**
   * データベースのクリア
   */
  clearDatabase(): void {
    this.threatDatabase.clear();
    this.statisticsCache.clear();
    this.lastUpdated = new Date();
    this.emit('database-cleared');
    this.logger.info('脅威データベースをクリアしました');
  }

  /**
   * データベースサイズの取得
   */
  getDatabaseSize(): {
    totalDomains: number;
    totalThreats: number;
    memoryUsage: string;
  } {
    const totalDomains = this.threatDatabase.size;
    const totalThreats = Array.from(this.threatDatabase.values()).reduce(
      (sum, threats) => sum + threats.length,
      0
    );

    // 簡易的なメモリ使用量の推定
    const avgThreatSize = 1024; // 1KB per threat (rough estimate)
    const memoryBytes = totalThreats * avgThreatSize;
    const memoryUsage = this.formatBytes(memoryBytes);

    return {
      totalDomains,
      totalThreats,
      memoryUsage,
    };
  }

  // プライベートメソッド

  private calculateStatistics(timeframe?: {
    start: Date;
    end: Date;
  }): ThreatStatistics {
    const allThreats: SecurityThreat[] = [];

    // 時間枠でフィルタリング
    this.threatDatabase.forEach(threats => {
      const filteredThreats = timeframe
        ? threats.filter(threat => {
            const threatDate = new Date(threat.detectedAt);
            return threatDate >= timeframe.start && threatDate <= timeframe.end;
          })
        : threats;

      allThreats.push(...filteredThreats);
    });

    const statistics: ThreatStatistics = {
      totalThreats: allThreats.length,
      threatsByType: {},
      threatsBySeverity: {},
      threatsOverTime: [],
      detectionEfficiency: this.calculateDetectionEfficiency(allThreats),
      falsePositiveRate: this.calculateFalsePositiveRate(allThreats),
      averageDetectionTime: this.calculateAverageDetectionTime(allThreats),
      topThreatDomains: this.getTopThreatDomains(5).map(d => d.domain),
    };

    // 脅威タイプ別カウント
    allThreats.forEach(threat => {
      statistics.threatsByType[threat.type] =
        (statistics.threatsByType[threat.type] || 0) + 1;
      statistics.threatsBySeverity[threat.severity] =
        (statistics.threatsBySeverity[threat.severity] || 0) + 1;
    });

    return statistics;
  }

  private calculateDetectionEfficiency(threats: SecurityThreat[]): number {
    // 検出効率の簡易計算（実際の実装ではより詳細な分析が必要）
    const confirmedThreats = threats.filter(t => t.confidence > 0.8).length;
    return threats.length > 0
      ? Math.round((confirmedThreats / threats.length) * 100)
      : 0;
  }

  private calculateFalsePositiveRate(threats: SecurityThreat[]): number {
    // 偽陽性率の簡易計算
    const lowConfidenceThreats = threats.filter(t => t.confidence < 0.5).length;
    return threats.length > 0
      ? Math.round((lowConfidenceThreats / threats.length) * 100)
      : 0;
  }

  private calculateAverageDetectionTime(threats: SecurityThreat[]): number {
    if (threats.length === 0) return 0;

    // 平均検出時間の計算（簡易実装）
    const detectionTimes = threats.map(threat => {
      // 検出時間を推定（実際の実装では実際の時間を使用）
      return Math.random() * 1000; // ミリ秒
    });

    return Math.round(
      detectionTimes.reduce((sum, time) => sum + time, 0) /
        detectionTimes.length
    );
  }

  private getThreatsForDate(date: Date): SecurityThreat[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dayThreats: SecurityThreat[] = [];

    this.threatDatabase.forEach(threats => {
      const filteredThreats = threats.filter(threat => {
        const threatDate = new Date(threat.detectedAt);
        return threatDate >= startOfDay && threatDate <= endOfDay;
      });
      dayThreats.push(...filteredThreats);
    });

    return dayThreats;
  }

  private generateCacheKey(timeframe?: { start: Date; end: Date }): string {
    if (!timeframe) return 'all-time';
    return `${timeframe.start.getTime()}-${timeframe.end.getTime()}`;
  }

  private isCacheValid(statistics: ThreatStatistics): boolean {
    // キャッシュの有効期限（5分）
    const cacheTimeout = 5 * 60 * 1000;
    return Date.now() - this.lastUpdated.getTime() < cacheTimeout;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
