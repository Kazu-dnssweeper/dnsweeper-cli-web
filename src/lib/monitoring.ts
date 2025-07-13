/**
 * DNSweeper 監視・メトリクス収集システム
 * 
 * アプリケーションのパフォーマンス監視とメトリクス収集機能
 */

import { EventEmitter } from 'events';
import os from 'os';
import { performance } from 'perf_hooks';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export interface Counter {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export interface Timer {
  name: string;
  startTime: number;
  tags?: Record<string, string>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration?: number;
  }[];
  timestamp: Date;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  timestamp: Date;
}

export interface MetricsOptions {
  flushInterval?: number; // ミリ秒
  maxMetrics?: number;
  enableSystemMetrics?: boolean;
  systemMetricsInterval?: number; // ミリ秒
}

export class MetricsCollector extends EventEmitter {
  private metrics: Metric[] = [];
  private counters: Map<string, Counter> = new Map();
  private timers: Map<string, Timer> = new Map();
  private gauges: Map<string, Metric> = new Map();
  private options: Required<MetricsOptions>;
  private flushTimer?: NodeJS.Timeout;
  private systemMetricsTimer?: NodeJS.Timeout;
  private startTime: number = Date.now();

  constructor(options: MetricsOptions = {}) {
    super();
    this.options = {
      flushInterval: options.flushInterval || 60000, // 1分
      maxMetrics: options.maxMetrics || 10000,
      enableSystemMetrics: options.enableSystemMetrics ?? true,
      systemMetricsInterval: options.systemMetricsInterval || 30000, // 30秒
    };

    this.startFlushTimer();
    if (this.options.enableSystemMetrics) {
      this.startSystemMetricsCollection();
    }
  }

  /**
   * カウンターを増加
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getCounterKey(name, tags);
    const counter = this.counters.get(key);
    
    if (counter) {
      counter.value += value;
    } else {
      this.counters.set(key, { name, value, tags });
    }

    // メトリクスイベントを発行
    this.emit('metric', {
      type: 'counter',
      name,
      value,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * カウンターを減少
   */
  decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }

  /**
   * ゲージ値を設定
   */
  gauge(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    const key = this.getGaugeKey(name, tags);
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
      unit
    };

    this.gauges.set(key, metric);
    this.addMetric(metric);

    // メトリクスイベントを発行
    this.emit('metric', {
      type: 'gauge',
      ...metric
    });
  }

  /**
   * タイマーを開始
   */
  startTimer(name: string, tags?: Record<string, string>): string {
    const key = this.getTimerKey(name, tags);
    const timer: Timer = {
      name,
      startTime: performance.now(),
      tags
    };

    this.timers.set(key, timer);
    return key;
  }

  /**
   * タイマーを停止して計測時間を記録
   */
  stopTimer(key: string): number | null {
    const timer = this.timers.get(key);
    if (!timer) {
      return null;
    }

    const duration = performance.now() - timer.startTime;
    this.timers.delete(key);

    // ヒストグラムメトリクスとして記録
    const metric: Metric = {
      name: `${timer.name}.duration`,
      value: duration,
      timestamp: new Date(),
      tags: timer.tags,
      unit: 'ms'
    };

    this.addMetric(metric);

    // メトリクスイベントを発行
    this.emit('metric', {
      type: 'histogram',
      ...metric
    });

    return duration;
  }

  /**
   * 時間計測デコレーター用のユーティリティ
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const timerKey = this.startTimer(name, tags);
    try {
      const result = await fn();
      this.stopTimer(timerKey);
      this.increment(`${name}.success`, 1, tags);
      return result;
    } catch (error) {
      this.stopTimer(timerKey);
      this.increment(`${name}.error`, 1, tags);
      throw error;
    }
  }

  /**
   * 同期関数の時間計測
   */
  measure<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const timerKey = this.startTimer(name, tags);
    try {
      const result = fn();
      this.stopTimer(timerKey);
      this.increment(`${name}.success`, 1, tags);
      return result;
    } catch (error) {
      this.stopTimer(timerKey);
      this.increment(`${name}.error`, 1, tags);
      throw error;
    }
  }

  /**
   * ヘルスチェック実行
   */
  async healthCheck(
    checks: Array<{
      name: string;
      check: () => Promise<boolean | { pass: boolean; message?: string }>;
    }>
  ): Promise<HealthCheckResult> {
    const results = await Promise.all(
      checks.map(async ({ name, check }) => {
        const startTime = performance.now();
        try {
          const result = await check();
          const duration = performance.now() - startTime;

          if (typeof result === 'boolean') {
            return {
              name,
              status: result ? 'pass' as const : 'fail' as const,
              duration
            };
          } else {
            return {
              name,
              status: result.pass ? 'pass' as const : 'fail' as const,
              message: result.message,
              duration
            };
          }
        } catch (error) {
          const duration = performance.now() - startTime;
          return {
            name,
            status: 'fail' as const,
            message: error instanceof Error ? error.message : 'Unknown error',
            duration
          };
        }
      })
    );

    const failedChecks = results.filter(r => r.status === 'fail').length;
    const warnChecks = results.filter(r => r.status === 'warn').length;

    let status: HealthCheckResult['status'];
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warnChecks > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const result: HealthCheckResult = {
      status,
      checks: results,
      timestamp: new Date()
    };

    this.emit('healthcheck', result);
    return result;
  }

  /**
   * システムメトリクスを収集
   */
  private collectSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // CPU使用率計算
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = 100 - (100 * totalIdle / totalTick);

    const metrics: SystemMetrics = {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      process: {
        pid: process.pid,
        uptime: (Date.now() - this.startTime) / 1000, // 秒
        memoryUsage: process.memoryUsage()
      },
      timestamp: new Date()
    };

    // ゲージとして記録
    this.gauge('system.cpu.usage', metrics.cpu.usage, { type: 'percentage' }, '%');
    this.gauge('system.memory.used', metrics.memory.used, { type: 'bytes' }, 'bytes');
    this.gauge('system.memory.percentage', metrics.memory.percentage, { type: 'percentage' }, '%');
    this.gauge('process.memory.heapUsed', metrics.process.memoryUsage.heapUsed, { type: 'bytes' }, 'bytes');
    this.gauge('process.uptime', metrics.process.uptime, { type: 'seconds' }, 's');

    return metrics;
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * カウンターを取得
   */
  getCounters(): Counter[] {
    return Array.from(this.counters.values());
  }

  /**
   * ゲージを取得
   */
  getGauges(): Metric[] {
    return Array.from(this.gauges.values());
  }

  /**
   * 統計サマリーを取得
   */
  getSummary(): {
    metrics: number;
    counters: number;
    gauges: number;
    activeTimers: number;
    uptime: number;
  } {
    return {
      metrics: this.metrics.length,
      counters: this.counters.size,
      gauges: this.gauges.size,
      activeTimers: this.timers.size,
      uptime: (Date.now() - this.startTime) / 1000
    };
  }

  /**
   * メトリクスをリセット
   */
  reset(): void {
    this.metrics = [];
    this.counters.clear();
    this.gauges.clear();
    // タイマーは保持（実行中の可能性があるため）
  }

  /**
   * すべてをクリア
   */
  clear(): void {
    this.reset();
    this.timers.clear();
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
    }
    this.clear();
    this.removeAllListeners();
  }

  private addMetric(metric: Metric): void {
    this.metrics.push(metric);

    // 最大数を超えたら古いメトリクスを削除
    if (this.metrics.length > this.options.maxMetrics) {
      this.metrics = this.metrics.slice(-this.options.maxMetrics);
    }
  }

  private getCounterKey(name: string, tags?: Record<string, string>): string {
    return tags ? `${name}:${JSON.stringify(tags)}` : name;
  }

  private getGaugeKey(name: string, tags?: Record<string, string>): string {
    return this.getCounterKey(name, tags);
  }

  private getTimerKey(name: string, tags?: Record<string, string>): string {
    return `${this.getCounterKey(name, tags)}:${Date.now()}:${Math.random()}`;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  private startSystemMetricsCollection(): void {
    // 初回収集
    this.collectSystemMetrics();

    this.systemMetricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.options.systemMetricsInterval);
  }

  private flush(): void {
    const metrics = this.getMetrics();
    const counters = this.getCounters();
    const gauges = this.getGauges();

    if (metrics.length > 0 || counters.length > 0 || gauges.length > 0) {
      this.emit('flush', {
        metrics,
        counters,
        gauges,
        timestamp: new Date()
      });
    }

    // メトリクスをクリア（カウンターとゲージは保持）
    this.metrics = [];
  }
}

// シングルトンインスタンス
let defaultCollector: MetricsCollector | null = null;

/**
 * デフォルトのメトリクスコレクターを取得
 */
export function getMetricsCollector(options?: MetricsOptions): MetricsCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricsCollector(options);
  }
  return defaultCollector;
}

/**
 * メトリクスデコレーター
 */
export function metric(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const metricName = name || `${target.constructor.name}.${propertyName}`;
    const originalMethod = descriptor.value;
    const collector = getMetricsCollector();

    if (originalMethod.constructor.name === 'AsyncFunction') {
      descriptor.value = async function (...args: any[]) {
        return collector.measureAsync(metricName, () => originalMethod.apply(this, args));
      };
    } else {
      descriptor.value = function (...args: any[]) {
        return collector.measure(metricName, () => originalMethod.apply(this, args));
      };
    }

    return descriptor;
  };
}