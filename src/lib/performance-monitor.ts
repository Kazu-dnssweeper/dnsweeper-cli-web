/**
 * DNSweeper パフォーマンス監視システム
 * プロダクション環境での継続的性能測定・分析・アラート
 */

import { EventEmitter } from 'events';
import { cpus, freemem, totalmem, loadavg } from 'os';
import { performance } from 'perf_hooks';

import { Logger } from './logger.js';

export interface PerformanceMetric {
  timestamp: number;
  category: 'dns' | 'file' | 'system' | 'api' | 'database';
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  resourceUsage?: {
    memory: number;
    cpu: number;
  };
}

export interface SystemMetrics {
  timestamp: number;
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  cpu: {
    count: number;
    loadAverage: number[];
    usage: number;
  };
  performance: {
    operationsPerSecond: Record<string, number>;
    averageResponseTime: Record<string, number>;
    errorRate: Record<string, number>;
  };
}

export interface PerformanceThresholds {
  dnsTimeout: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxErrorRate: number;
  minOperationsPerSecond: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private logger: Logger;
  private thresholds: PerformanceThresholds;
  private monitoringInterval?: NodeJS.Timeout;
  private readonly maxMetrics = 10000; // メモリ管理のため制限

  constructor(logger?: Logger, thresholds?: Partial<PerformanceThresholds>) {
    super();
    this.logger = logger || new Logger({ verbose: false });
    this.thresholds = {
      dnsTimeout: 5000,
      maxMemoryUsage: 80, // %
      maxCpuUsage: 80, // %
      maxErrorRate: 5, // %
      minOperationsPerSecond: 10,
      ...thresholds,
    };
  }

  /**
   * パフォーマンス測定開始
   */
  startMeasurement(
    category: PerformanceMetric['category'],
    operation: string
  ): () => void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return (success = true, metadata?: Record<string, unknown>) => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        timestamp: Date.now(),
        category,
        operation,
        duration,
        success,
        metadata,
        resourceUsage: {
          memory: endMemory - startMemory,
          cpu: this.getCpuUsage(),
        },
      };

      this.addMetric(metric);
      this.checkThresholds(metric);
    };
  }

  /**
   * DNS解決パフォーマンス測定
   */
  async measureDnsOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    domain?: string
  ): Promise<T> {
    const measure = this.startMeasurement('dns', operation);

    try {
      const result = await fn();
      measure(true, { domain, resultType: typeof result });
      return result;
    } catch (error) {
      measure(false, {
        domain,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * ファイル処理パフォーマンス測定
   */
  async measureFileOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    filePath?: string,
    fileSize?: number
  ): Promise<T> {
    const measure = this.startMeasurement('file', operation);

    try {
      const result = await fn();
      measure(true, { filePath, fileSize, resultType: typeof result });
      return result;
    } catch (error) {
      measure(false, {
        filePath,
        fileSize,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * API呼び出しパフォーマンス測定
   */
  async measureApiOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    endpoint?: string
  ): Promise<T> {
    const measure = this.startMeasurement('api', operation);

    try {
      const result = await fn();
      measure(true, { endpoint, resultType: typeof result });
      return result;
    } catch (error) {
      measure(false, {
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * メトリクス追加
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // メモリ管理：古いメトリクスを削除
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.emit('metric', metric);
  }

  /**
   * システムメトリクス収集
   */
  private collectSystemMetrics(): SystemMetrics {
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = (usedMem / totalMem) * 100;

    const cpuCount = cpus().length;
    const loadAvg = loadavg();
    const cpuUsage = (loadAvg[0] / cpuCount) * 100;

    // 過去1分間のパフォーマンス統計
    const recentMetrics = this.getRecentMetrics(60000); // 1分
    const performanceStats = this.calculatePerformanceStats(recentMetrics);

    const systemMetrics: SystemMetrics = {
      timestamp: Date.now(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percentage: memoryPercentage,
      },
      cpu: {
        count: cpuCount,
        loadAverage: loadAvg,
        usage: cpuUsage,
      },
      performance: performanceStats,
    };

    this.systemMetrics.push(systemMetrics);

    // システムメトリクスも制限
    if (this.systemMetrics.length > 1440) {
      // 24時間分（分毎）
      this.systemMetrics = this.systemMetrics.slice(-1440);
    }

    return systemMetrics;
  }

  /**
   * 閾値チェック・アラート
   */
  private checkThresholds(metric: PerformanceMetric): void {
    // DNS タイムアウトチェック
    if (
      metric.category === 'dns' &&
      metric.duration > this.thresholds.dnsTimeout
    ) {
      this.emit('alert', {
        type: 'performance_warning',
        message: `DNS operation '${metric.operation}' took ${metric.duration}ms (threshold: ${this.thresholds.dnsTimeout}ms)`,
        metric,
        severity: 'warning',
      });
    }

    // エラー率チェック
    if (!metric.success) {
      const recentMetrics = this.getRecentMetrics(300000); // 5分
      const errorRate = this.calculateErrorRate(recentMetrics, metric.category);

      if (errorRate > this.thresholds.maxErrorRate) {
        this.emit('alert', {
          type: 'error_rate_high',
          message: `Error rate for ${metric.category} operations is ${errorRate.toFixed(1)}% (threshold: ${this.thresholds.maxErrorRate}%)`,
          metric,
          severity: 'error',
        });
      }
    }
  }

  /**
   * 継続的監視開始
   */
  startContinuousMonitoring(intervalMs = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const systemMetrics = this.collectSystemMetrics();

      // システムリソース閾値チェック
      if (systemMetrics.memory.percentage > this.thresholds.maxMemoryUsage) {
        this.emit('alert', {
          type: 'memory_high',
          message: `Memory usage is ${systemMetrics.memory.percentage.toFixed(1)}% (threshold: ${this.thresholds.maxMemoryUsage}%)`,
          systemMetrics,
          severity: 'warning',
        });
      }

      if (systemMetrics.cpu.usage > this.thresholds.maxCpuUsage) {
        this.emit('alert', {
          type: 'cpu_high',
          message: `CPU usage is ${systemMetrics.cpu.usage.toFixed(1)}% (threshold: ${this.thresholds.maxCpuUsage}%)`,
          systemMetrics,
          severity: 'warning',
        });
      }

      this.emit('systemMetrics', systemMetrics);
    }, intervalMs);

    this.logger.info('Continuous performance monitoring started', {
      interval: intervalMs,
      thresholds: this.thresholds,
    });
  }

  /**
   * 監視停止
   */
  stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger.info('Continuous performance monitoring stopped');
    }
  }

  /**
   * パフォーマンスレポート生成
   */
  generateReport(timeRangeMs = 3600000): {
    summary: Record<string, unknown>;
    metrics: PerformanceMetric[];
    systemMetrics: SystemMetrics[];
  } {
    const recentMetrics = this.getRecentMetrics(timeRangeMs);
    const recentSystemMetrics = this.getRecentSystemMetrics(timeRangeMs);

    const summary = {
      timeRange: `${timeRangeMs / 1000}s`,
      totalOperations: recentMetrics.length,
      successRate: this.calculateSuccessRate(recentMetrics),
      averageResponseTime: this.calculateAverageResponseTime(recentMetrics),
      operationsByCategory: this.groupMetricsByCategory(recentMetrics),
      performanceStats: this.calculatePerformanceStats(recentMetrics),
      systemResourceUsage:
        this.calculateSystemResourceUsage(recentSystemMetrics),
    };

    return {
      summary,
      metrics: recentMetrics,
      systemMetrics: recentSystemMetrics,
    };
  }

  /**
   * ヘルプメソッド群
   */
  private getRecentMetrics(timeRangeMs: number): PerformanceMetric[] {
    const now = Date.now();
    return this.metrics.filter(m => now - m.timestamp <= timeRangeMs);
  }

  private getRecentSystemMetrics(timeRangeMs: number): SystemMetrics[] {
    const now = Date.now();
    return this.systemMetrics.filter(m => now - m.timestamp <= timeRangeMs);
  }

  private calculateSuccessRate(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 100;
    const successCount = metrics.filter(m => m.success).length;
    return (successCount / metrics.length) * 100;
  }

  private calculateAverageResponseTime(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / metrics.length;
  }

  private calculateErrorRate(
    metrics: PerformanceMetric[],
    category: string
  ): number {
    const categoryMetrics = metrics.filter(m => m.category === category);
    if (categoryMetrics.length === 0) return 0;
    const errorCount = categoryMetrics.filter(m => !m.success).length;
    return (errorCount / categoryMetrics.length) * 100;
  }

  private groupMetricsByCategory(
    metrics: PerformanceMetric[]
  ): Record<string, number> {
    return metrics.reduce(
      (acc, metric) => {
        acc[metric.category] = (acc[metric.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private calculatePerformanceStats(metrics: PerformanceMetric[]): {
    operationsPerSecond: Record<string, number>;
    averageResponseTime: Record<string, number>;
    errorRate: Record<string, number>;
  } {
    const stats = {
      operationsPerSecond: {} as Record<string, number>,
      averageResponseTime: {} as Record<string, number>,
      errorRate: {} as Record<string, number>,
    };

    const categories = [...new Set(metrics.map(m => m.category))];

    categories.forEach(category => {
      const categoryMetrics = metrics.filter(m => m.category === category);

      if (categoryMetrics.length > 0) {
        // 操作回数/秒
        const timeSpan =
          Math.max(...categoryMetrics.map(m => m.timestamp)) -
          Math.min(...categoryMetrics.map(m => m.timestamp));
        stats.operationsPerSecond[category] =
          timeSpan > 0 ? categoryMetrics.length / (timeSpan / 1000) : 0;

        // 平均応答時間
        stats.averageResponseTime[category] =
          categoryMetrics.reduce((sum, m) => sum + m.duration, 0) /
          categoryMetrics.length;

        // エラー率
        stats.errorRate[category] = this.calculateErrorRate(metrics, category);
      }
    });

    return stats;
  }

  private calculateSystemResourceUsage(systemMetrics: SystemMetrics[]): {
    averageMemoryUsage: number;
    averageCpuUsage: number;
    peakMemoryUsage: number;
    peakCpuUsage: number;
  } {
    if (systemMetrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        peakMemoryUsage: 0,
        peakCpuUsage: 0,
      };
    }

    const memoryUsages = systemMetrics.map(m => m.memory.percentage);
    const cpuUsages = systemMetrics.map(m => m.cpu.usage);

    return {
      averageMemoryUsage:
        memoryUsages.reduce((sum, usage) => sum + usage, 0) /
        memoryUsages.length,
      averageCpuUsage:
        cpuUsages.reduce((sum, usage) => sum + usage, 0) / cpuUsages.length,
      peakMemoryUsage: Math.max(...memoryUsages),
      peakCpuUsage: Math.max(...cpuUsages),
    };
  }

  private getCpuUsage(): number {
    const loadAvg = loadavg();
    const cpuCount = cpus().length;
    return (loadAvg[0] / cpuCount) * 100;
  }

  /**
   * メトリクス取得
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getSystemMetrics(): SystemMetrics[] {
    return [...this.systemMetrics];
  }

  /**
   * メトリクスクリア
   */
  clearMetrics(): void {
    this.metrics = [];
    this.systemMetrics = [];
    this.logger.info('Performance metrics cleared');
  }
}

// グローバルパフォーマンス監視インスタンス
export const globalPerformanceMonitor = new PerformanceMonitor();

// 自動監視開始
if (process.env.NODE_ENV === 'production') {
  globalPerformanceMonitor.startContinuousMonitoring();

  // アラートをログに記録
  globalPerformanceMonitor.on('alert', alert => {
    const logger = new Logger();
    logger.warn('Performance alert', alert);
  });
}
