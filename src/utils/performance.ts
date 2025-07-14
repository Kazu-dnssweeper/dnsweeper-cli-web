/**
 * パフォーマンス測定ユーティリティ
 */

import { cpus, totalmem, freemem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { memoryUsage } from 'node:process';

/**
 * パフォーマンス測定の結果
 */
export interface PerformanceResult {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryUsage?: MemorySnapshot;
  metadata?: Record<string, unknown>;
}

/**
 * メモリ使用状況のスナップショット
 */
export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  systemFree: number;
  systemTotal: number;
}

/**
 * システムメトリクス
 */
export interface SystemMetrics {
  cpu: {
    count: number;
    model: string;
    speed: number;
    usage: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  process: {
    uptime: number;
    pid: number;
    version: string;
    memoryUsage: MemorySnapshot;
  };
}

/**
 * パフォーマンス測定クラス
 */
export class PerformanceTracker {
  private measurements: Map<string, PerformanceResult[]> = new Map();
  private activeTimers: Map<string, number> = new Map();

  /**
   * 測定を開始
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    const startTime = performance.now();
    this.activeTimers.set(name, startTime);

    // 開始時のメモリ使用状況を記録
    const result: PerformanceResult = {
      name,
      startTime,
      endTime: 0,
      duration: 0,
      memoryUsage: this.captureMemorySnapshot(),
      metadata,
    };

    const existing = this.measurements.get(name) || [];
    existing.push(result);
    this.measurements.set(name, existing);
  }

  /**
   * 測定を終了
   */
  end(name: string): PerformanceResult | null {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeTimers.delete(name);

    const measurements = this.measurements.get(name);
    const latest = measurements?.[measurements.length - 1];
    if (latest) {
      latest.endTime = endTime;
      latest.duration = duration;
      return latest;
    }

    return null;
  }

  /**
   * 非同期関数の実行時間を測定
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; performance: PerformanceResult }> {
    this.start(name, metadata);

    try {
      const result = await fn();
      const performance = this.end(name)!;
      return { result, performance };
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * 同期関数の実行時間を測定
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): { result: T; performance: PerformanceResult } {
    this.start(name, metadata);

    try {
      const result = fn();
      const performance = this.end(name)!;
      return { result, performance };
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * 測定結果を取得
   */
  getResults(name?: string): PerformanceResult[] {
    if (name) {
      return this.measurements.get(name) || [];
    }

    const allResults: PerformanceResult[] = [];
    for (const results of this.measurements.values()) {
      allResults.push(...results);
    }
    return allResults;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(name: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const results = this.measurements.get(name);
    if (!results || results.length === 0) {
      return null;
    }

    const durations = results.map(r => r.duration).sort((a, b) => a - b);
    const count = durations.length;
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      count,
      total,
      average: total / count,
      min: durations[0],
      max: durations[count - 1],
      median: durations[Math.floor(count / 2)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * メモリ使用状況のスナップショットを取得
   */
  private captureMemorySnapshot(): MemorySnapshot {
    const mem = memoryUsage();
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
      systemFree: freemem(),
      systemTotal: totalmem(),
    };
  }

  /**
   * 測定結果をクリア
   */
  clear(name?: string): void {
    if (name) {
      this.measurements.delete(name);
      this.activeTimers.delete(name);
    } else {
      this.measurements.clear();
      this.activeTimers.clear();
    }
  }

  /**
   * レポートを生成
   */
  generateReport(): string {
    const report: string[] = ['=== Performance Report ===\n'];

    for (const [name, _results] of this.measurements) {
      const stats = this.getStatistics(name);
      if (!stats) continue;

      report.push(`[${name}]`);
      report.push(`  Count: ${stats.count}`);
      report.push(`  Total: ${stats.total.toFixed(2)}ms`);
      report.push(`  Average: ${stats.average.toFixed(2)}ms`);
      report.push(`  Min: ${stats.min.toFixed(2)}ms`);
      report.push(`  Max: ${stats.max.toFixed(2)}ms`);
      report.push(`  Median: ${stats.median.toFixed(2)}ms`);
      report.push(`  P95: ${stats.p95.toFixed(2)}ms`);
      report.push(`  P99: ${stats.p99.toFixed(2)}ms`);
      report.push('');
    }

    return report.join('\n');
  }
}

/**
 * システムメトリクスを取得
 */
export function getSystemMetrics(): SystemMetrics {
  const cpuInfo = cpus();
  const memTotal = totalmem();
  const memFree = freemem();
  const memUsed = memTotal - memFree;

  // CPU使用率の簡易計算
  let totalIdle = 0;
  let totalTick = 0;

  cpuInfo.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsage = 100 - (100 * totalIdle) / totalTick;

  return {
    cpu: {
      count: cpuInfo.length,
      model: cpuInfo[0].model,
      speed: cpuInfo[0].speed,
      usage: cpuUsage,
    },
    memory: {
      total: memTotal,
      free: memFree,
      used: memUsed,
      usagePercent: (memUsed / memTotal) * 100,
    },
    process: {
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      memoryUsage: {
        ...memoryUsage(),
        systemFree: memFree,
        systemTotal: memTotal,
      },
    },
  };
}

/**
 * メモリ使用量をフォーマット
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * グローバルパフォーマンストラッカーのインスタンス
 */
export const globalTracker = new PerformanceTracker();

/**
 * パフォーマンス測定デコレータ
 */
export function measurePerformance(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]): Promise<unknown> {
    const className = (target as { constructor: { name: string } }).constructor
      .name;
    const measurementName = `${className}.${propertyKey}`;

    return globalTracker.measure(measurementName, async () => {
      return originalMethod.apply(this, args);
    });
  };

  return descriptor;
}
